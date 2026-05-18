import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionCheckService {
  constructor(private prisma: PrismaService) {}

  async userHasPermission(
    userId: string,
    permissionName: string,
  ): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return userRoles.some((ur) =>
      ur.role.permissions.some(
        (rp) => rp.permission.permission_name === permissionName,
      ),
    );
  }

  async userHasAnyPermission(
    userId: string,
    permissionNames: string[],
  ): Promise<boolean> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const userPermissions = new Set(
      userRoles.flatMap((ur) =>
        ur.role.permissions.map((rp) => rp.permission.permission_name),
      ),
    );

    return permissionNames.some((p) => userPermissions.has(p));
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    return [
      ...new Set(
        userRoles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.permission_name),
        ),
      ),
    ];
  }
}
