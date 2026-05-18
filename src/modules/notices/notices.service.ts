import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeFilterDto,
  NoticeResponseDto,
} from './dto';
import {
  NoticeWithDetails,
  NoticeAnalytics,
  NoticeBulkActionDto,
} from './interfaces/notice.interface';

@Injectable()
export class NoticesService {
  private readonly logger = new Logger(NoticesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createNoticeDto: CreateNoticeDto,
    userId: string,
  ): Promise<NoticeResponseDto> {
    // Get status for 'draft'
    const draftStatus = await this.prisma.status.findFirst({
      where: { status_name: 'draft', category: 'notice' },
    });

    if (!draftStatus) {
      throw new BadRequestException('Default status not found');
    }

    // Create notice
    const notice = await this.prisma.notice.create({
      data: {
        title: createNoticeDto.title,
        content: createNoticeDto.content,
        published_by_user_id: userId,
        category_id: createNoticeDto.category_id,
        notice_type: createNoticeDto.notice_type,
        scheduled_publish_at: createNoticeDto.scheduled_publish_at
          ? new Date(createNoticeDto.scheduled_publish_at)
          : null,
        expires_at: createNoticeDto.expires_at
          ? new Date(createNoticeDto.expires_at)
          : null,
        status_id: draftStatus.status_id,
      },
      include: {
        published_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        category: true,
        status: true,
      },
    });

    // Add targets if provided
    if (createNoticeDto.targets && createNoticeDto.targets.length > 0) {
      await this.addTargets(notice.notice_id, createNoticeDto.targets);
    }

    // Add attachments if provided
    if (
      createNoticeDto.attachment_ids &&
      createNoticeDto.attachment_ids.length > 0
    ) {
      await this.addAttachments(
        notice.notice_id,
        createNoticeDto.attachment_ids,
      );
    }

    // If scheduled publish date is in the past, auto-publish
    if (
      createNoticeDto.scheduled_publish_at &&
      new Date(createNoticeDto.scheduled_publish_at) <= new Date()
    ) {
      await this.publishNotice(notice.notice_id, userId);
    }

    // Log audit trail
    await this.logAuditTrail(
      userId,
      'CREATE_NOTICE',
      'notices',
      notice.notice_id,
      null,
      createNoticeDto,
    );

    this.logger.log(`Notice created: ${notice.title} by user ${userId}`);

    return this.findOne(notice.notice_id, userId);
  }

  async findAll(userId: string, filterDto: NoticeFilterDto) {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 10;
    const skip = (page - 1) * limit;

    // Get user's accessible notices based on role/org nodes
    const accessibleNoticeIds = await this.getAccessibleNoticeIds(userId);

    const where: any = {
      notice_id: { in: accessibleNoticeIds },
      deleted_at: null,
    };

    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search, mode: 'insensitive' } },
        { content: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    if (filterDto.category_id) {
      where.category_id = filterDto.category_id;
    }

    if (filterDto.notice_type) {
      where.notice_type = filterDto.notice_type;
    }

    if (filterDto.from_date) {
      where.created_at = { gte: new Date(filterDto.from_date) };
    }

    if (filterDto.to_date) {
      where.created_at = {
        ...where.created_at,
        lte: new Date(filterDto.to_date),
      };
    }

    // Filter by status
    if (filterDto.status) {
      const statusMap = {
        draft: 'draft',
        published: 'published',
        archived: 'archived',
        scheduled: 'scheduled',
        expired: 'expired',
      };

      const statusName = statusMap[filterDto.status];
      const status = await this.prisma.status.findFirst({
        where: { status_name: statusName, category: 'notice' },
      });

      if (status) {
        where.status_id = status.status_id;
      }

      // Handle special cases
      if (filterDto.status === 'scheduled') {
        where.scheduled_publish_at = { gt: new Date() };
        where.published_at = null;
      }

      if (filterDto.status === 'expired') {
        where.expires_at = { lt: new Date() };
      }
    }

    const [notices, total] = await Promise.all([
      this.prisma.notice.findMany({
        where,
        skip,
        take: limit,
        include: {
          published_by: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              profile_pic_url: true,
            },
          },
          category: true,
          status: true,
          targets: {
            include: {
              org_node: {
                select: { org_node_id: true, node_name: true },
              },
              role: {
                select: { role_id: true, role_name: true },
              },
            },
          },
          attachments: {
            include: {
              file: true,
            },
          },
          views: {
            where: { user_id: userId },
            take: 1,
          },
        },
        orderBy: [{ scheduled_publish_at: 'desc' }, { created_at: 'desc' }],
      }),
      this.prisma.notice.count({ where }),
    ]);

    const noticesWithViewStatus = notices.map((notice) => ({
      ...notice,
      is_read: notice.views.length > 0,
      view_count: notice.views.length,
      status: notice.status?.status_name ?? '',
      is_active: notice.status?.is_active ?? false,
      published_by: notice.published_by ?? undefined,
      category: notice.category ?? undefined,
      targets:
        notice.targets?.map((t) => ({
          target_id: t.target_id,
          org_node_id: t.org_node_id ?? undefined,
          role_id: t.role_id ?? undefined,
          target_type: t.target_type,
          org_node_name: t.org_node?.node_name ?? undefined,
          role_name: t.role?.role_name ?? undefined,
        })) ?? [],
      attachments:
        notice.attachments?.map((a) => ({
          file_id: a.file.file_id,
          file_name: a.file.file_name,
          file_url: a.file.file_url,
          mime_type: a.file.mime_type ?? undefined,
        })) ?? [],
    }));

    return {
      data: noticesWithViewStatus.map((n) => new NoticeResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(noticeId: string, userId: string): Promise<NoticeResponseDto> {
    // Check if user has access
    const hasAccess = await this.checkUserAccess(noticeId, userId);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this notice');
    }

    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId, deleted_at: null },
      include: {
        published_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        category: true,
        status: true,
        targets: {
          include: {
            org_node: {
              select: { org_node_id: true, node_name: true },
            },
            role: {
              select: { role_id: true, role_name: true },
            },
          },
        },
        attachments: {
          include: {
            file: true,
          },
        },
      },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${noticeId} not found`);
    }

    // Mark as viewed
    await this.markAsViewed(noticeId, userId);

    const viewCount = await this.prisma.noticeView.count({
      where: { notice_id: noticeId },
    });

    return new NoticeResponseDto({
      ...notice,
      view_count: viewCount,
      status: notice.status?.status_name ?? '',
      is_active: notice.status?.is_active ?? false,
      published_by: notice.published_by ?? undefined,
      category: notice.category ?? undefined,
      targets:
        notice.targets?.map((t) => ({
          target_id: t.target_id,
          org_node_id: t.org_node_id ?? undefined,
          role_id: t.role_id ?? undefined,
          target_type: t.target_type,
          org_node_name: t.org_node?.node_name ?? undefined,
          role_name: t.role?.role_name ?? undefined,
        })) ?? [],
      attachments:
        notice.attachments?.map((a) => ({
          file_id: a.file.file_id,
          file_name: a.file.file_name,
          file_url: a.file.file_url,
          mime_type: a.file.mime_type ?? undefined,
        })) ?? [],
    });
  }

  async update(
    noticeId: string,
    updateNoticeDto: UpdateNoticeDto,
    userId: string,
  ): Promise<NoticeResponseDto> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${noticeId} not found`);
    }

    // Check if user can edit (must be author or admin)
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (notice.published_by_user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to edit this notice',
      );
    }

    // Cannot edit published notices unless admin
    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });

    if (!publishedStatus) {
      throw new BadRequestException('Published status not found');
    }

    if (notice.status_id === publishedStatus.status_id && !isAdmin) {
      throw new BadRequestException('Published notices cannot be edited');
    }

    const updatedNotice = await this.prisma.notice.update({
      where: { notice_id: noticeId },
      data: {
        title: updateNoticeDto.title,
        content: updateNoticeDto.content,
        category_id: updateNoticeDto.category_id !== undefined
          ? updateNoticeDto.category_id
          : undefined,
        notice_type: updateNoticeDto.notice_type,
        scheduled_publish_at: updateNoticeDto.scheduled_publish_at
          ? new Date(updateNoticeDto.scheduled_publish_at)
          : undefined,
        expires_at: updateNoticeDto.expires_at
          ? new Date(updateNoticeDto.expires_at)
          : undefined,
      },
      include: {
        published_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        category: true,
      },
    });

    // Update targets if provided
    if (updateNoticeDto.targets) {
      await this.prisma.noticeTarget.deleteMany({
        where: { notice_id: noticeId },
      });
      await this.addTargets(noticeId, updateNoticeDto.targets);
    }

    // Update attachments if provided
    if (updateNoticeDto.attachment_ids) {
      await this.prisma.noticeAttachment.deleteMany({
        where: { notice_id: noticeId },
      });
      await this.addAttachments(noticeId, updateNoticeDto.attachment_ids);
    }

    await this.logAuditTrail(
      userId,
      'UPDATE_NOTICE',
      'notices',
      noticeId,
      notice,
      updatedNotice,
    );

    this.logger.log(`Notice updated: ${updatedNotice.title}`);

    return this.findOne(noticeId, userId);
  }

  async publishNotice(
    noticeId: string,
    userId: string,
  ): Promise<NoticeResponseDto> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
      include: { status: true },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${noticeId} not found`);
    }

    // Check permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (notice.published_by_user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to publish this notice',
      );
    }

    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });

    if (!publishedStatus) {
      throw new BadRequestException('Published status not found');
    }

    const updatedNotice = await this.prisma.notice.update({
      where: { notice_id: noticeId },
      data: {
        status_id: publishedStatus.status_id,
        published_at: new Date(),
        scheduled_publish_at: null,
      },
    });

    await this.logAuditTrail(
      userId,
      'PUBLISH_NOTICE',
      'notices',
      noticeId,
      { status: notice.status.status_name },
      { status: 'published' },
    );

    this.logger.log(`Notice published: ${notice.title}`);

    // TODO: Send notifications to targeted users
    await this.sendNotificationsToTargets(noticeId);

    return this.findOne(noticeId, userId);
  }

  async archiveNotice(
    noticeId: string,
    userId: string,
  ): Promise<NoticeResponseDto> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${noticeId} not found`);
    }

    const archivedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'archived', category: 'notice' },
    });

    if (!archivedStatus) {
      throw new BadRequestException('Archived status not found');
    }

    const updatedNotice = await this.prisma.notice.update({
      where: { notice_id: noticeId },
      data: {
        status_id: archivedStatus.status_id,
      },
    });

    await this.logAuditTrail(
      userId,
      'ARCHIVE_NOTICE',
      'notices',
      noticeId,
      null,
      { status: 'archived' },
    );

    return this.findOne(noticeId, userId);
  }

  async deleteNotice(
    noticeId: string,
    userId: string,
  ): Promise<{ message: string }> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${noticeId} not found`);
    }

    // Check permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (notice.published_by_user_id !== userId && !isAdmin) {
      throw new ForbiddenException(
        'You are not authorized to delete this notice',
      );
    }

    // Soft delete
    await this.prisma.notice.update({
      where: { notice_id: noticeId },
      data: { deleted_at: new Date() },
    });

    await this.logAuditTrail(
      userId,
      'DELETE_NOTICE',
      'notices',
      noticeId,
      notice,
      null,
    );

    this.logger.log(`Notice deleted: ${notice.title}`);

    return { message: 'Notice deleted successfully' };
  }

  async bulkAction(
    bulkActionDto: NoticeBulkActionDto,
    userId: string,
  ): Promise<{ message: string; results: any[] }> {
    const results: any[] = [];

    for (const noticeId of bulkActionDto.notice_ids) {
      try {
        switch (bulkActionDto.action) {
          case 'publish':
            await this.publishNotice(noticeId, userId);
            results.push({ notice_id: noticeId, status: 'published' });
            break;
          case 'archive':
            await this.archiveNotice(noticeId, userId);
            results.push({ notice_id: noticeId, status: 'archived' });
            break;
          case 'delete':
            await this.deleteNotice(noticeId, userId);
            results.push({ notice_id: noticeId, status: 'deleted' });
            break;
          case 'schedule':
            if (bulkActionDto.scheduled_time) {
              await this.prisma.notice.update({
                where: { notice_id: noticeId },
                data: {
                  scheduled_publish_at: new Date(bulkActionDto.scheduled_time),
                },
              });
              results.push({ notice_id: noticeId, status: 'scheduled' });
            }
            break;
        }
      } catch (error) {
        results.push({
          notice_id: noticeId,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return {
      message: `Bulk ${bulkActionDto.action} completed`,
      results,
    };
  }

  async getAnalytics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<NoticeAnalytics> {
    const whereDate: any = {};
    if (startDate) whereDate.created_at = { gte: startDate };
    if (endDate)
      whereDate.created_at = { ...whereDate.created_at, lte: endDate };

    const allNotices = await this.prisma.notice.findMany({
      where: { deleted_at: null, ...whereDate },
      include: {
        status: true,
        views: true,
      },
    });

    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });
    const draftStatus = await this.prisma.status.findFirst({
      where: { status_name: 'draft', category: 'notice' },
    });
    const archivedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'archived', category: 'notice' },
    });

    const publishedNotices = allNotices.filter(
      (n) => n.status_id === publishedStatus?.status_id,
    );
    const draftNotices = allNotices.filter(
      (n) => n.status_id === draftStatus?.status_id,
    );
    const archivedNotices = allNotices.filter(
      (n) => n.status_id === archivedStatus?.status_id,
    );
    const scheduledNotices = allNotices.filter(
      (n) => n.scheduled_publish_at && n.scheduled_publish_at > new Date(),
    );
    const expiredNotices = allNotices.filter(
      (n) => n.expires_at && n.expires_at < new Date(),
    );

    // Group by type
    const noticesByType = allNotices.reduce(
      (acc, notice) => {
        const type = notice.notice_type || 'general';
        const existing = acc.find((t) => t.type === type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ type, count: 1, percentage: 0 });
        }
        return acc;
      },
      [] as { type: string; count: number; percentage: number }[],
    );

    noticesByType.forEach((t) => {
      t.percentage = (t.count / allNotices.length) * 100;
    });

    // Group by category
    const noticesByCategory = await this.prisma.notice.groupBy({
      by: ['category_id'],
      _count: { notice_id: true },
      where: { deleted_at: null, ...whereDate },
    });

    const categories = await this.prisma.noticeCategory.findMany();
    const noticesByCategoryWithNames = noticesByCategory.map((nc) => ({
      category_id: nc.category_id,
      category_name:
        categories.find((c) => c.category_id === nc.category_id)
          ?.category_name || 'Unknown',
      count: nc._count.notice_id,
    }));

    // Top viewed notices
    const topNotices = allNotices
      .map((n) => ({
        notice_id: n.notice_id,
        title: n.title,
        view_count: n.views.length,
      }))
      .sort((a, b) => b.view_count - a.view_count)
      .slice(0, 5);

    // Publishing trends (last 30 days)
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const publishingTrends = last30Days.map((date) => ({
      date,
      count: allNotices.filter(
        (n) => n.published_at?.toISOString().split('T')[0] === date,
      ).length,
    }));

    const totalViews = allNotices.reduce((sum, n) => sum + n.views.length, 0);

    return {
      total_notices: allNotices.length,
      published_notices: publishedNotices.length,
      draft_notices: draftNotices.length,
      scheduled_notices: scheduledNotices.length,
      archived_notices: archivedNotices.length,
      expired_notices: expiredNotices.length,
      notices_by_type: noticesByType,
      notices_by_category: noticesByCategoryWithNames,
      average_views_per_notice:
        allNotices.length > 0 ? totalViews / allNotices.length : 0,
      engagement_rate:
        allNotices.length > 0 ? (totalViews / allNotices.length) * 100 : 0,
      top_notices: topNotices,
      publishing_trends: publishingTrends,
    };
  }

  private async addTargets(noticeId: string, targets: any[]) {
    for (const target of targets) {
      await this.prisma.noticeTarget.create({
        data: {
          notice_id: noticeId,
          org_node_id: target.org_node_id,
          role_id: target.role_id,
          target_type: target.target_type,
        },
      });
    }
  }

  private async addAttachments(noticeId: string, attachmentIds: string[]) {
    for (const fileId of attachmentIds) {
      await this.prisma.noticeAttachment.create({
        data: {
          notice_id: noticeId,
          file_id: fileId,
        },
      });
    }
  }

  private async markAsViewed(noticeId: string, userId: string) {
    const existing = await this.prisma.noticeView.findUnique({
      where: {
        notice_id_user_id: {
          notice_id: noticeId,
          user_id: userId,
        },
      },
    });

    if (!existing) {
      await this.prisma.noticeView.create({
        data: {
          notice_id: noticeId,
          user_id: userId,
        },
      });
    }
  }

  private async checkUserAccess(
    noticeId: string,
    userId: string,
  ): Promise<boolean> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
      include: {
        targets: true,
        status: true,
      },
    });

    if (!notice) return false;

    // Admin can see everything
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );
    if (isAdmin) return true;

    // Check if notice is published
    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });

    if (!publishedStatus) return notice.published_by_user_id === userId;

    if (notice.status_id !== publishedStatus.status_id) {
      // Only author can see unpublished notices
      return notice.published_by_user_id === userId;
    }

    // If no targets, available to all
    if (notice.targets.length === 0) return true;

    // Get user's org nodes and roles
    const userOrgNodes = await this.prisma.userAssignment.findMany({
      where: { user_id: userId },
      select: { org_node_id: true },
    });

    const userOrgNodeIds = userOrgNodes.map((u) => u.org_node_id);
    const userRoleIds = userRoles.map((ur) => ur.role_id);

    // Check if user matches any target
    return notice.targets.some((target) => {
      if (target.target_type === 'all') return true;
      if (
        target.target_type === 'org_node' &&
        target.org_node_id &&
        userOrgNodeIds.includes(target.org_node_id)
      )
        return true;
      if (
        target.target_type === 'role' &&
        target.role_id &&
        userRoleIds.includes(target.role_id)
      )
        return true;
      return false;
    });
  }

  private async getAccessibleNoticeIds(userId: string): Promise<string[]> {
    // Admin can see all
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );
    if (isAdmin) {
      const allNotices = await this.prisma.notice.findMany({
        where: { deleted_at: null },
        select: { notice_id: true },
      });
      return allNotices.map((n) => n.notice_id);
    }

    // Get user's org nodes
    const userOrgNodes = await this.prisma.userAssignment.findMany({
      where: { user_id: userId },
      select: { org_node_id: true },
    });

    const userOrgNodeIds = userOrgNodes.map((u) => u.org_node_id);
    const userRoleIds = userRoles.map((ur) => ur.role_id);

    // Find accessible notices
    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });

    if (!publishedStatus) {
      return [];
    }

    const notices = await this.prisma.notice.findMany({
      where: {
        deleted_at: null,
        status_id: publishedStatus.status_id,
        OR: [
          { targets: { none: {} } }, // Public notices
          { targets: { some: { target_type: 'all' } } },
          {
            targets: {
              some: {
                target_type: 'org_node',
                org_node_id: { in: userOrgNodeIds },
              },
            },
          },
          {
            targets: {
              some: { target_type: 'role', role_id: { in: userRoleIds } },
            },
          },
        ],
      },
      select: { notice_id: true },
    });

    // Add author's own unpublished notices
    const userNotices = await this.prisma.notice.findMany({
      where: {
        deleted_at: null,
        published_by_user_id: userId,
        status_id: { not: publishedStatus.status_id },
      },
      select: { notice_id: true },
    });

    return [
      ...notices.map((n) => n.notice_id),
      ...userNotices.map((n) => n.notice_id),
    ];
  }

  private async sendNotificationsToTargets(noticeId: string) {
    // Get all users who should receive this notice
    const accessibleUsers = await this.getTargetUsersForNotice(noticeId);

    // TODO: Implement notification creation once Notification model is available
    // The Notification model needs to be added to prisma/schema.prisma

    this.logger.log(
      `Notifications would be sent to ${accessibleUsers.length} users for notice ${noticeId}`,
    );
  }

  private async getTargetUsersForNotice(noticeId: string): Promise<string[]> {
    const notice = await this.prisma.notice.findUnique({
      where: { notice_id: noticeId },
      include: { targets: true },
    });

    if (!notice) return [];

    if (notice.targets.length === 0) {
      // Return all active users
      const users = await this.prisma.user.findMany({
        where: { is_active: true, deleted_at: null },
        select: { user_id: true },
      });
      return users.map((u) => u.user_id);
    }

    const userIds: string[] = [];

    for (const target of notice.targets) {
      if (target.target_type === 'all') {
        const users = await this.prisma.user.findMany({
          where: { is_active: true, deleted_at: null },
          select: { user_id: true },
        });
        userIds.push(...users.map((u) => u.user_id));
      } else if (target.target_type === 'org_node' && target.org_node_id) {
        const assignments = await this.prisma.userAssignment.findMany({
          where: { org_node_id: target.org_node_id },
          select: { user_id: true },
        });
        userIds.push(...assignments.map((a) => a.user_id));
      } else if (target.target_type === 'role' && target.role_id) {
        const userRoles = await this.prisma.userRole.findMany({
          where: { role_id: target.role_id },
          select: { user_id: true },
        });
        userIds.push(...userRoles.map((ur) => ur.user_id));
      }
    }

    return [...new Set(userIds)];
  }

  private async logAuditTrail(
    userId: string,
    action: string,
    tableAffected: string,
    recordId: string,
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

  // Notice Categories
  async createCategory(name: string, description?: string) {
    return this.prisma.noticeCategory.create({
      data: {
        category_name: name,
      },
    });
  }

  async getAllCategories() {
    return this.prisma.noticeCategory.findMany({
      include: {
        _count: {
          select: { notices: true },
        },
      },
      orderBy: { category_name: 'asc' },
    });
  }

  async deleteCategory(categoryId: string) {
    const category = await this.prisma.noticeCategory.findUnique({
      where: { category_id: categoryId },
      include: { notices: { take: 1 } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    if (category.notices.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated notices',
      );
    }

    await this.prisma.noticeCategory.delete({
      where: { category_id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  async saveFile(file: Express.Multer.File, userId: string) {
    return this.prisma.file.create({
      data: {
        file_name: file.filename,
        original_name: file.originalname,
        file_url: `/uploads/${file.filename}`,
        mime_type: file.mimetype,
        file_extension: file.originalname.split('.').pop() || '',
        file_size: BigInt(file.size),
        uploaded_by_user_id: userId,
      },
    });
  }
}
