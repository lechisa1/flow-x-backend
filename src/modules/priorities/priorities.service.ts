import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePriorityDto, UpdatePriorityDto } from './dto';
import {
  PriorityWithStats,
  PriorityAnalytics,
  BulkPriorityUpdateDto,
} from './interfaces/priority.interface';
import { PriorityResponseDto } from './dto';

@Injectable()
export class PrioritiesService {
  private readonly logger = new Logger(PrioritiesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createPriorityDto: CreatePriorityDto,
    createdBy: number,
  ): Promise<PriorityResponseDto> {
    // Check if priority level already exists
    const existingPriority = await this.prisma.priority.findUnique({
      where: { priority_level: createPriorityDto.priority_level },
    });

    if (existingPriority) {
      throw new ConflictException(
        `Priority "${createPriorityDto.priority_level}" already exists`,
      );
    }

    // Auto-assign sort_order if not provided
    if (!createPriorityDto.sort_order) {
      const maxSortOrder = await this.prisma.priority.aggregate({
        _max: { sort_order: true },
      });
      createPriorityDto.sort_order = (maxSortOrder._max.sort_order || 0) + 1;
    }

    const priority = await this.prisma.priority.create({
      data: {
        priority_level: createPriorityDto.priority_level,
        color_code: createPriorityDto.color_code,
        response_time_hrs: createPriorityDto.response_time_hrs,
        sort_order: createPriorityDto.sort_order,
      },
    });

    // Log audit trail
    await this.logAuditTrail(
      createdBy,
      'CREATE_PRIORITY',
      'priorities',
      priority.priority_id,
      null,
      createPriorityDto,
    );

    this.logger.log(`Priority created: ${priority.priority_level}`);

    return new PriorityResponseDto(priority);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          priority_level: { contains: search, mode: 'insensitive' as const },
        }
      : {};

    const [priorities, total] = await Promise.all([
      this.prisma.priority.findMany({
        where,
        skip,
        take: limit,
        include: {
          tasks: {
            where: { deleted_at: null },
            select: {
              task_id: true,
              status_id: true,
              completed_at: true,
              due_date: true,
            },
          },
        },
        orderBy: { sort_order: 'asc' },
      }),
      this.prisma.priority.count({ where }),
    ]);

    const prioritiesWithStats = priorities.map((priority) => ({
      ...priority,
      task_count: priority.tasks.length,
      active_tasks_count: priority.tasks.filter((t) => {
        const status = t.status_id;
        return status !== 3; // Assuming 3 is completed
      }).length,
      overdue_tasks_count: priority.tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          t.completed_at === null,
      ).length,
      avg_completion_time: this.calculateAvgCompletionTime(priority.tasks),
    }));

    return {
      data: prioritiesWithStats.map((p) => new PriorityResponseDto(p)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(priorityId: number): Promise<PriorityResponseDto> {
    const priority = await this.prisma.priority.findUnique({
      where: { priority_id: priorityId },
      include: {
        tasks: {
          where: { deleted_at: null },
          select: {
            task_id: true,
            status_id: true,
            completed_at: true,
            due_date: true,
            created_at: true,
          },
        },
      },
    });

    if (!priority) {
      throw new NotFoundException(`Priority with ID ${priorityId} not found`);
    }

    const priorityWithStats = {
      ...priority,
      task_count: priority.tasks.length,
      active_tasks_count: priority.tasks.filter((t) => t.status_id !== 3)
        .length,
      overdue_tasks_count: priority.tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          t.completed_at === null,
      ).length,
      avg_completion_time: this.calculateAvgCompletionTime(priority.tasks),
    };

    return new PriorityResponseDto(priorityWithStats);
  }

  async findByLevel(priorityLevel: string): Promise<PriorityResponseDto> {
    const priority = await this.prisma.priority.findUnique({
      where: { priority_level: priorityLevel },
      include: {
        tasks: {
          where: { deleted_at: null },
          select: {
            task_id: true,
            status_id: true,
            completed_at: true,
            due_date: true,
          },
        },
      },
    });

    if (!priority) {
      throw new NotFoundException(`Priority "${priorityLevel}" not found`);
    }

    return new PriorityResponseDto(priority);
  }

  async update(
    priorityId: number,
    updatePriorityDto: UpdatePriorityDto,
    updatedBy: number,
  ): Promise<PriorityResponseDto> {
    const priority = await this.findOne(priorityId);

    // Check for duplicate priority level if being updated
    if (
      updatePriorityDto.priority_level &&
      updatePriorityDto.priority_level !== priority.priority_level
    ) {
      const existingPriority = await this.prisma.priority.findUnique({
        where: { priority_level: updatePriorityDto.priority_level },
      });

      if (existingPriority) {
        throw new ConflictException(
          `Priority "${updatePriorityDto.priority_level}" already exists`,
        );
      }
    }

    // Get old values for audit
    const oldPriority = await this.prisma.priority.findUnique({
      where: { priority_id: priorityId },
    });

    const updatedPriority = await this.prisma.priority.update({
      where: { priority_id: priorityId },
      data: {
        priority_level: updatePriorityDto.priority_level,
        color_code: updatePriorityDto.color_code,
        response_time_hrs: updatePriorityDto.response_time_hrs,
        sort_order: updatePriorityDto.sort_order,
      },
      include: {
        tasks: {
          where: { deleted_at: null },
          select: {
            task_id: true,
            status_id: true,
            completed_at: true,
            due_date: true,
          },
        },
      },
    });

    // Log audit trail
    await this.logAuditTrail(
      updatedBy,
      'UPDATE_PRIORITY',
      'priorities',
      priorityId,
      oldPriority,
      updatedPriority,
    );

    this.logger.log(`Priority updated: ${updatedPriority.priority_level}`);

    const priorityWithStats = {
      ...updatedPriority,
      task_count: updatedPriority.tasks.length,
      active_tasks_count: updatedPriority.tasks.filter((t) => t.status_id !== 3)
        .length,
      overdue_tasks_count: updatedPriority.tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          t.completed_at === null,
      ).length,
      avg_completion_time: this.calculateAvgCompletionTime(
        updatedPriority.tasks,
      ),
    };

    return new PriorityResponseDto(priorityWithStats);
  }

  async delete(
    priorityId: number,
    deletedBy: number,
  ): Promise<{ message: string }> {
    const priority = await this.findOne(priorityId);

    // Check if priority is being used by any tasks
    const taskCount = await this.prisma.task.count({
      where: {
        priority_id: priorityId,
        deleted_at: null,
      },
    });

    if (taskCount > 0) {
      throw new BadRequestException(
        `Cannot delete priority "${priority.priority_level}" because it is assigned to ${taskCount} task(s). Reassign tasks first.`,
      );
    }

    await this.prisma.priority.delete({
      where: { priority_id: priorityId },
    });

    // Log audit trail
    await this.logAuditTrail(
      deletedBy,
      'DELETE_PRIORITY',
      'priorities',
      priorityId,
      priority,
      null,
    );

    this.logger.log(`Priority deleted: ${priority.priority_level}`);

    return {
      message: `Priority "${priority.priority_level}" deleted successfully`,
    };
  }

  async reorderPriorities(
    priorityIds: number[],
  ): Promise<PriorityResponseDto[]> {
    const updates = priorityIds.map(async (priorityId, index) => {
      const priority = await this.prisma.priority.update({
        where: { priority_id: priorityId },
        data: { sort_order: index + 1 },
      });
      return priority;
    });

    const updatedPriorities = await Promise.all(updates);

    this.logger.log(`Priorities reordered: ${priorityIds.join(', ')}`);

    return updatedPriorities.map((p) => new PriorityResponseDto(p));
  }

  async bulkUpdate(
    bulkUpdateDto: BulkPriorityUpdateDto,
    updatedBy: number,
  ): Promise<PriorityResponseDto[]> {
    const updates = bulkUpdateDto.updates.map(async (update) => {
      const priority = await this.prisma.priority.update({
        where: { priority_id: update.priority_id },
        data: {
          sort_order: update.sort_order,
          response_time_hrs: update.response_time_hrs,
        },
      });

      await this.logAuditTrail(
        updatedBy,
        'BULK_UPDATE_PRIORITY',
        'priorities',
        update.priority_id,
        null,
        update,
      );

      return priority;
    });

    const updatedPriorities = await Promise.all(updates);

    this.logger.log(`Bulk updated ${updatedPriorities.length} priorities`);

    return updatedPriorities.map((p) => new PriorityResponseDto(p));
  }

  async getAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<PriorityAnalytics> {
    const whereCondition: any = {};

    if (startDate && endDate) {
      whereCondition.created_at = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get all priorities with their tasks
    const priorities = await this.prisma.priority.findMany({
      include: {
        tasks: {
          where: {
            deleted_at: null,
            ...whereCondition,
          },
          select: {
            task_id: true,
            status_id: true,
            completed_at: true,
            created_at: true,
            due_date: true,
          },
        },
      },
    });

    const totalTasks = priorities.reduce((sum, p) => sum + p.tasks.length, 0);

    // Calculate metrics
    const totalTasksByPriority = priorities.map((priority) => ({
      priority_level: priority.priority_level,
      count: priority.tasks.length,
      percentage:
        totalTasks > 0 ? (priority.tasks.length / totalTasks) * 100 : 0,
    }));

    const averageCompletionTimeByPriority = priorities.map((priority) => ({
      priority_level: priority.priority_level,
      avg_hours: this.calculateAvgCompletionTime(priority.tasks),
    }));

    const overdueTasksByPriority = priorities.map((priority) => ({
      priority_level: priority.priority_level,
      count: priority.tasks.filter(
        (t) =>
          t.due_date &&
          new Date(t.due_date) < new Date() &&
          t.completed_at === null,
      ).length,
    }));

    const slaComplianceByPriority = priorities.map((priority) => {
      const tasksWithResponseTime = priority.tasks.filter((t) => {
        const responseTime = priority.response_time_hrs;
        return responseTime && t.completed_at;
      });

      const compliantTasks = tasksWithResponseTime.filter((t) => {
        const completionHours =
          (new Date(t.completed_at!).getTime() -
            new Date(t.created_at).getTime()) /
          (1000 * 60 * 60);
        return completionHours <= (priority.response_time_hrs || 0);
      });

      const complianceRate =
        tasksWithResponseTime.length > 0
          ? (compliantTasks.length / tasksWithResponseTime.length) * 100
          : 100;

      return {
        priority_level: priority.priority_level,
        compliance_rate: complianceRate,
      };
    });

    return {
      total_tasks_by_priority: totalTasksByPriority,
      average_completion_time_by_priority: averageCompletionTimeByPriority,
      overdue_tasks_by_priority: overdueTasksByPriority,
      sla_compliance_by_priority: slaComplianceByPriority,
    };
  }

  async getDefaultPriorities(): Promise<PriorityResponseDto[]> {
    const priorities = await this.prisma.priority.findMany({
      orderBy: { sort_order: 'asc' },
    });

    return priorities.map((p) => new PriorityResponseDto(p));
  }

  async getPriorityUsage(): Promise<any> {
    const usage = await this.prisma.task.groupBy({
      by: ['priority_id'],
      _count: {
        task_id: true,
      },
      where: {
        deleted_at: null,
      },
    });

    const priorities = await this.prisma.priority.findMany();

    return priorities.map((priority) => ({
      priority_id: priority.priority_id,
      priority_level: priority.priority_level,
      task_count:
        usage.find((u) => u.priority_id === priority.priority_id)?._count
          .task_id || 0,
    }));
  }

  private calculateAvgCompletionTime(tasks: any[]): number {
    const completedTasks = tasks.filter((t) => t.completed_at && t.created_at);
    if (completedTasks.length === 0) return 0;

    const totalHours = completedTasks.reduce((sum, task) => {
      const completionTime =
        new Date(task.completed_at).getTime() -
        new Date(task.created_at).getTime();
      return sum + completionTime / (1000 * 60 * 60);
    }, 0);

    return totalHours / completedTasks.length;
  }

  private async logAuditTrail(
    userId: number,
    action: string,
    tableAffected: string,
    recordId: number,
    oldValues: any,
    newValues: any,
  ) {
    await this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        table_affected: tableAffected,
        record_id: recordId,
        old_values: oldValues,
        new_values: newValues,
      },
    });
  }

  async seedDefaultPriorities() {
    const defaultPriorities = [
      {
        priority_level: 'critical',
        color_code: '#E53E3E',
        response_time_hrs: 1,
        sort_order: 1,
      },
      {
        priority_level: 'high',
        color_code: '#ED8936',
        response_time_hrs: 4,
        sort_order: 2,
      },
      {
        priority_level: 'medium',
        color_code: '#ECC94B',
        response_time_hrs: 24,
        sort_order: 3,
      },
      {
        priority_level: 'low',
        color_code: '#48BB78',
        response_time_hrs: 48,
        sort_order: 4,
      },
    ];

    for (const priority of defaultPriorities) {
      await this.prisma.priority.upsert({
        where: { priority_level: priority.priority_level },
        update: priority,
        create: priority,
      });
    }

    this.logger.log('Default priorities seeded');
  }
}
