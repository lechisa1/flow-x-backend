import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('config.jwt.secret') ?? 'default-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: payload.sub },
      include: {
        assigned_roles: {
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
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    if (user.deleted_at) {
      throw new UnauthorizedException('Account has been deleted');
    }

    // Extract roles and permissions
    const roles = user.assigned_roles.map((ur) => ur.role.role_name);
    const permissions = user.assigned_roles.flatMap((ur) =>
      ur.role.permissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    );

    // Update last login time
    await this.prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login: new Date() },
    });

    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      roles,
      permissions,
    };
  }
}
