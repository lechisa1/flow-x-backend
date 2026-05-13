// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   ForbiddenException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

// @Injectable()
// export class PermissionsGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
//       PERMISSIONS_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredPermissions) {
//       return true;
//     }

//     const { user } = context.switchToHttp().getRequest();

//     if (!user || !user.permissions) {
//       throw new ForbiddenException('Access denied');
//     }

//     const hasPermission = requiredPermissions.every((permission) =>
//       user.permissions.includes(permission),
//     );

//     if (!hasPermission) {
//       throw new ForbiddenException('Insufficient permissions');
//     }

//     return true;
//   }
// }
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.user_id) {
      throw new ForbiddenException('Access denied');
    }

    // Get user's permissions from database with caching consideration
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: user.user_id },
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

    // Check if user has ALL required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.has(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (p) => !userPermissions.has(p),
      );
      throw new ForbiddenException(
        `Missing required permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
