import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where: Prisma.PermissionWhereInput = search
      ? {
          OR: [
            {
              permission_name: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              resource: {
                contains: search,
                mode: Prisma.QueryMode.insensitive,
              },
            },
            {
              action: { contains: search, mode: Prisma.QueryMode.insensitive },
            },
          ],
        }
      : {};

    const [permissions, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        include: {
          roles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: [{ resource: 'asc' }, { action: 'asc' }],
      }),
      this.prisma.permission.count({ where }),
    ]);

    return {
      data: permissions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(permissionId: string) {
    const permission = await this.prisma.permission.findUnique({
      where: { permission_id: permissionId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!permission) {
      throw new NotFoundException(
        `Permission with ID ${permissionId} not found`,
      );
    }

    return permission;
  }

  async findByResource(resource: string) {
    return this.prisma.permission.findMany({
      where: { resource },
      orderBy: { action: 'asc' },
    });
  }

  async getGroupedByResource() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const grouped = permissions.reduce(
      (acc, permission) => {
        const resource = permission.resource ?? 'unknown';
        if (!acc[resource]) {
          acc[resource] = [];
        }
        acc[resource].push(permission);
        return acc;
      },
      {} as Record<string, typeof permissions>,
    );

    return grouped;
  }
}
