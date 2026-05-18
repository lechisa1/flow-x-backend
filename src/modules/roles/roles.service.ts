import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto';
import { RoleResponseDto } from './dto/role-response.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  async create(
    createRoleDto: CreateRoleDto,
    createdBy: string,
  ): Promise<RoleResponseDto> {
    // Check if role already exists
    const existingRole = await this.prisma.role.findUnique({
      where: { role_name: createRoleDto.role_name.toLowerCase() },
    });

    if (existingRole) {
      throw new ConflictException(
        `Role "${createRoleDto.role_name}" already exists`,
      );
    }

    // Create role
    const role = await this.prisma.role.create({
      data: {
        role_name: createRoleDto.role_name.toLowerCase(),
        description: createRoleDto.description,
      },
    });

    // Assign permissions if provided
    if (
      createRoleDto.permission_ids &&
      createRoleDto.permission_ids.length > 0
    ) {
      await this.assignPermissions(role.role_id, {
        permission_ids: createRoleDto.permission_ids,
      });
    }

    // Log audit trail
    await this.logAuditTrail(
      createdBy,
      'CREATE_ROLE',
      'roles',
      role.role_id,
      null,
      { role_name: role.role_name, permissions: createRoleDto.permission_ids },
    );

    this.logger.log(`Role created: ${role.role_name} by user ${createdBy}`);

    return this.findOne(role.role_id);
  }

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.RoleWhereInput = search
      ? {
          OR: [
            {
              role_name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              description: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
          ],
        }
      : {};

    const [roles, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
          user_roles: {
            select: {
              user_id: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: roles.map((role) => ({
        ...role,
        user_count: role.user_roles.length,
        permissions: role.permissions,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(roleId: string): Promise<RoleResponseDto> {
    const role = await this.prisma.role.findUnique({
      where: { role_id: roleId },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        user_roles: {
          select: {
            user_id: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID ${roleId} not found`);
    }

    return {
      ...role,
      user_count: role.user_roles.length,
    } as any;
  }

  async findByName(roleName: string) {
    return this.prisma.role.findUnique({
      where: { role_name: roleName.toLowerCase() },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  async update(
    roleId: string,
    updateRoleDto: UpdateRoleDto,
    updatedBy: string,
  ): Promise<RoleResponseDto> {
    // Check if role exists
    await this.findOne(roleId);

    // Check for duplicate role name if being updated
    if (updateRoleDto.role_name) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          role_name: updateRoleDto.role_name.toLowerCase(),
          role_id: { not: roleId },
        },
      });

      if (existingRole) {
        throw new ConflictException(
          `Role "${updateRoleDto.role_name}" already exists`,
        );
      }
    }

    // Get old values for audit
    const oldRole = await this.prisma.role.findUnique({
      where: { role_id: roleId },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    // Update role
    const updatedRole = await this.prisma.role.update({
      where: { role_id: roleId },
      data: {
        role_name: updateRoleDto.role_name?.toLowerCase(),
        description: updateRoleDto.description,
      },
      include: {
        permissions: {
          include: {
            permission: true,
          },
        },
        user_roles: {
          select: {
            user_id: true,
          },
        },
      },
    });

    // Update permissions if provided
    if (updateRoleDto.permission_ids) {
      // Remove all existing permissions
      await this.prisma.rolePermission.deleteMany({
        where: { role_id: roleId },
      });

      // Add new permissions
      await this.assignPermissions(roleId, {
        permission_ids: updateRoleDto.permission_ids,
      });
    }

    // Log audit trail
    await this.logAuditTrail(
      updatedBy,
      'UPDATE_ROLE',
      'roles',
      roleId,
      oldRole
        ? {
            role_name: oldRole.role_name,
            permissions: oldRole.permissions.map(
              (p) => p.permission.permission_name,
            ),
          }
        : null,
      {
        role_name: updateRoleDto.role_name,
        permissions: updateRoleDto.permission_ids,
      },
    );

    this.logger.log(
      `Role updated: ${updatedRole.role_name} by user ${updatedBy}`,
    );

    return {
      ...updatedRole,
      user_count: updatedRole.user_roles.length,
    } as any;
  }

  async delete(
    roleId: string,
    deletedBy: string,
  ): Promise<{ message: string }> {
    const role = await this.findOne(roleId);

    // Check if role has users assigned
    const userCount = await this.prisma.userRole.count({
      where: { role_id: roleId },
    });

    if (userCount > 0) {
      throw new BadRequestException(
        `Cannot delete role "${role.role_name}" because it is assigned to ${userCount} user(s). Remove the role from users first.`,
      );
    }

    // Check if it's a system role (prevent deletion)
    const systemRoles = ['super_admin', 'admin', 'employee'];
    if (systemRoles.includes(role.role_name)) {
      throw new BadRequestException(
        `System role "${role.role_name}" cannot be deleted`,
      );
    }

    // Delete role permissions first
    await this.prisma.rolePermission.deleteMany({
      where: { role_id: roleId },
    });

    // Delete role
    await this.prisma.role.delete({
      where: { role_id: roleId },
    });

    // Log audit trail
    await this.logAuditTrail(
      deletedBy,
      'DELETE_ROLE',
      'roles',
      roleId,
      { role_name: role.role_name },
      null,
    );

    this.logger.log(`Role deleted: ${role.role_name} by user ${deletedBy}`);

    return { message: `Role "${role.role_name}" deleted successfully` };
  }

  async assignPermissions(
    roleId: string,
    assignPermissionDto: AssignPermissionDto,
  ): Promise<RoleResponseDto> {
    await this.findOne(roleId);

    // Verify all permissions exist
    const permissions = await this.prisma.permission.findMany({
      where: {
        permission_id: { in: assignPermissionDto.permission_ids as string[] },
      },
    });

    if (permissions.length !== assignPermissionDto.permission_ids.length) {
      const foundIds = permissions.map((p) => p.permission_id);
      const missingIds = assignPermissionDto.permission_ids.filter(
        (id) => !foundIds.includes(id),
      );
      throw new BadRequestException(
        `Permissions with IDs ${missingIds.join(', ')} not found`,
      );
    }

    // Create role-permission mappings
    const data = assignPermissionDto.permission_ids.map((permissionId) => ({
      role_id: roleId,
      permission_id: permissionId as string,
    }));

    await this.prisma.rolePermission.createMany({
      data,
      skipDuplicates: true,
    });

    this.logger.log(`Assigned ${data.length} permissions to role ${roleId}`);

    return this.findOne(roleId);
  }

  async removePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RoleResponseDto> {
    await this.findOne(roleId);

    const rolePermission = await this.prisma.rolePermission.findUnique({
      where: {
        role_id_permission_id: {
          role_id: roleId,
          permission_id: permissionId,
        },
      },
    });

    if (!rolePermission) {
      throw new NotFoundException(
        `Permission ${permissionId} is not assigned to role ${roleId}`,
      );
    }

    await this.prisma.rolePermission.delete({
      where: {
        role_id_permission_id: {
          role_id: roleId,
          permission_id: permissionId,
        },
      },
    });

    this.logger.log(`Removed permission ${permissionId} from role ${roleId}`);

    return this.findOne(roleId);
  }

  async getRolePermissions(roleId: string) {
    const role = await this.findOne(roleId);
    return role.permissions;
  }

  async getUsersWithRole(roleId: string, page: number = 1, limit: number = 10) {
    await this.findOne(roleId);

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.userRole.findMany({
        where: { role_id: roleId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone: true,
              is_active: true,
              created_at: true,
            },
          },
          assigner: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
            },
          },
        },
        orderBy: { assigned_at: 'desc' },
      }),
      this.prisma.userRole.count({
        where: { role_id: roleId },
      }),
    ]);

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSystemStats() {
    const [totalRoles, totalPermissions, rolesWithUsers] = await Promise.all([
      this.prisma.role.count(),
      this.prisma.permission.count(),
      this.prisma.userRole.groupBy({
        by: ['role_id'],
        _count: {
          user_id: true,
        },
      }),
    ]);

    return {
      total_roles: totalRoles,
      total_permissions: totalPermissions,
      average_users_per_role:
        totalRoles > 0
          ? Math.round(
              rolesWithUsers.reduce((sum, r) => sum + r._count.user_id, 0) /
                totalRoles,
            )
          : 0,
    };
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
}
