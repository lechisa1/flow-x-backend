import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';
import {
  RegisterDto,
  LoginDto,
  ChangePasswordDto,
  ResetPasswordDto,
} from './dto';
import { JwtPayload, AuthResponse } from './interfaces/jwt-payload.interface';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    if (!user || user.deleted_at) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Extract roles and permissions
    const roles = user.assigned_roles.map((ur) => ur.role.role_name);
    const permissions = user.assigned_roles.flatMap((ur) =>
      ur.role.permissions.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ),
    );

    return {
      user_id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      roles,
      permissions,
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.configService.get<number>('config.security.bcryptSaltRounds') ?? 10,
    );

    const user = await this.prisma.user.create({
      data: {
        full_name: registerDto.full_name,
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.phone,
        is_active: true,
      },
      include: {
        assigned_roles: {
          include: {
            role: true,
          },
        },
      },
    });

    // Assign default role (e.g., 'employee')
    const defaultRole = await this.prisma.role.findFirst({
      where: { role_name: 'employee' },
    });

    if (defaultRole) {
      await this.prisma.userRole.create({
        data: {
          user_id: user.user_id,
          role_id: defaultRole.role_id,
        },
      });
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.user_id, user.email);

    // Log audit trail
    await this.logAuditTrail(
      user.user_id,
      'REGISTER',
      'users',
      user.user_id,
      null,
      { email: user.email },
    );

    return tokens;
  }

  async login(
    loginDto: LoginDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<any> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    // Check for active sessions limit (max 5 concurrent sessions)
    const activeSessions = await this.prisma.userSession.count({
      where: {
        user_id: user.user_id,
        expires_at: { gt: new Date() },
      },
    });

    // if (activeSessions >= 5) {
    //   throw new BadRequestException(
    //     'Maximum concurrent sessions reached. Please logout from other devices.',
    //   );
    // }

    const tokens = await this.generateTokens(user.user_id, user.email);

    // Save session
    await this.prisma.userSession.create({
      data: {
        user_id: user.user_id,
        token: tokens.refresh_token,
        device_info: loginDto.device_name || userAgent,
        ip_address: ipAddress,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Save device info for push notifications
    if (loginDto.device_token) {
      const existingDevice = await this.prisma.userDevice.findFirst({
        where: {
          user_id: user.user_id,
          device_token: loginDto.device_token,
        },
      });

      if (existingDevice) {
        await this.prisma.userDevice.update({
          where: { device_id: existingDevice.device_id },
          data: {
            last_active: new Date(),
            device_name: loginDto.device_name,
            platform: userAgent,
          },
        });
      } else {
        await this.prisma.userDevice.create({
          data: {
            user_id: user.user_id,
            device_token: loginDto.device_token,
            device_name: loginDto.device_name,
            platform: userAgent,
          },
        });
      }
    }

    // Update user presence
    await this.prisma.userPresence.upsert({
      where: { user_id: user.user_id },
      update: {
        presence_status: 'online',
        last_seen: new Date(),
      },
      create: {
        user_id: user.user_id,
        presence_status: 'online',
      },
    });

    // Log login
    await this.logAuditTrail(
      user.user_id,
      'LOGIN',
      'users',
      user.user_id,
      null,
      { ip: ipAddress },
    );

    // Get complete user data with roles and permissions
    const userWithRoles = await this.getUserWithRolesAndPermissions(
      user.user_id,
    );

    // Return formatted response
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: 'Bearer',
      expires_in: 28800, // 8 hours in seconds
      user: userWithRoles,
    };
  }

  private async getUserWithRolesAndPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
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

    // Get profile image if exists (adjust based on your schema)
    const profileImage = null;
    // if (this.prisma.userProfile) {
    //   const profile = await this.prisma.userProfile.findUnique({
    //     where: { user_id: userId },
    //     select: { profile_image: true },
    //   });
    //   profileImage = profile?.profile_image || null;
    // }

    // Format roles as objects with id and name
    const roles = user.assigned_roles.map((ur) => ({
      id: ur.role.role_id,
      name: ur.role.role_name,
    }));

    // Get unique permissions
    const permissions = [
      ...new Set(
        user.assigned_roles.flatMap((ur) =>
          ur.role.permissions.map(
            (rp) => `${rp.permission.resource}:${rp.permission.action}`,
          ),
        ),
      ),
    ];

    return {
      id: user.user_id,
      email: user.email,
      full_name: user.full_name,
      profile_image: profileImage,
      roles,
      permissions,
    };
  }

  async logout(userId: string, token: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: {
        user_id: userId,
        token: token,
      },
    });

    await this.prisma.userPresence.update({
      where: { user_id: userId },
      data: {
        presence_status: 'offline',
        last_seen: new Date(),
      },
    });

    await this.logAuditTrail(userId, 'LOGOUT', 'users', userId, null, {});
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.userSession.deleteMany({
      where: { user_id: userId },
    });

    await this.prisma.userPresence.update({
      where: { user_id: userId },
      data: {
        presence_status: 'offline',
        last_seen: new Date(),
      },
    });

    await this.logAuditTrail(userId, 'LOGOUT_ALL', 'users', userId, null, {});
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const session = await this.prisma.userSession.findFirst({
      where: {
        token: refreshToken,
        expires_at: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = session.user;

    if (!user.is_active || user.deleted_at) {
      throw new UnauthorizedException('Account is not active');
    }

    // Delete old refresh token
    await this.prisma.userSession.delete({
      where: { session_id: session.session_id },
    });

    // Generate new tokens
    const tokens = await this.generateTokens(user.user_id, user.email);

    // Create new session
    await this.prisma.userSession.create({
      data: {
        user_id: user.user_id,
        token: tokens.refresh_token,
        device_info: session.device_info,
        ip_address: session.ip_address,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.current_password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password history
    await this.validatePasswordNotInHistory(
      userId,
      changePasswordDto.new_password,
    );

    const hashedPassword = await bcrypt.hash(
      changePasswordDto.new_password,
      this.configService.get<number>('config.security.bcryptSaltRounds') ?? 10,
    );

    // Save current password to history before updating
    await this.prisma.passwordHistory.create({
      data: {
        user_id: userId,
        password: user.password,
      },
    });

    await this.prisma.user.update({
      where: { user_id: userId },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions after password change
    await this.prisma.userSession.deleteMany({
      where: { user_id: userId },
    });

    await this.logAuditTrail(
      userId,
      'CHANGE_PASSWORD',
      'users',
      userId,
      null,
      {},
    );
  }

  async forgotPassword(email: string, ipAddress?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal that user doesn't exist for security
      this.logger.warn(
        `Password reset requested for non-existent email: ${email}`,
      );
      return;
    }

    // Check for rate limiting - prevent multiple requests within 1 hour
    const recentReset = await this.prisma.passwordResetToken.findFirst({
      where: {
        userId: user.user_id,
        createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) },
        used: false,
      },
    });

    if (recentReset) {
      this.logger.warn(
        `Password reset already requested recently for: ${email}`,
      );
      return;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.user_id,
        token: resetToken,
        expiresAt: resetTokenExpiry,
      },
    });

    // Send email with reset link
    const frontendUrl = this.configService.get('config.app.frontendUrl');
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    try {
      await this.mailService.sendPasswordResetEmail(
        email,
        resetLink,
        ipAddress,
      );
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}:`,
        error,
      );
      // Still log the token for development purposes
      this.logger.warn(`Password reset token for ${email}: ${resetToken}`);
    }

    // Log anomaly detection
    await this.logPasswordResetRequest(user.user_id, ipAddress);
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    // Find the reset token
    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        token: resetPasswordDto.token,
        expiresAt: { gt: new Date() },
        used: false,
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check password history
    await this.validatePasswordNotInHistory(
      resetToken.userId,
      resetPasswordDto.new_password,
    );

    // Hash the new password
    const hashedPassword = await bcrypt.hash(
      resetPasswordDto.new_password,
      this.configService.get<number>('config.security.bcryptSaltRounds') ?? 10,
    );

    // Save current password to history before updating
    const user = await this.prisma.user.findUnique({
      where: { user_id: resetToken.userId },
    });
    if (user?.password) {
      await this.prisma.passwordHistory.create({
        data: {
          user_id: resetToken.userId,
          password: user.password,
        },
      });
    }

    // Update user password
    await this.prisma.user.update({
      where: { user_id: resetToken.userId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await this.prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    // Invalidate all sessions after password reset for security
    await this.prisma.userSession.deleteMany({
      where: { user_id: resetToken.userId },
    });

    await this.logAuditTrail(
      resetToken.userId,
      'PASSWORD_RESET',
      'users',
      resetToken.userId,
      null,
      {},
    );

    // Send notification email
    try {
      await this.mailService.sendPasswordChangeNotification(
        resetToken.user.email,
      );
    } catch (error) {
      this.logger.error('Failed to send password change notification:', error);
    }
  }

  private generateTokens(userId: string, email: string): any {
    const payload: JwtPayload = { sub: userId, email };

    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('config.jwt.secret'),
      expiresIn: this.configService.get('config.jwt.expiresIn'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get('config.jwt.refreshSecret'),
      expiresIn: this.configService.get('config.jwt.refreshExpiresIn'),
    });

    return {
      access_token,
      refresh_token,
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

  // Get all active sessions for a user
  async getUserSessions(userId: string) {
    return this.prisma.userSession.findMany({
      where: {
        user_id: userId,
        expires_at: { gt: new Date() },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // Revoke specific session
  async revokeSession(sessionId: string, userId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: {
        session_id: sessionId,
        user_id: userId,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.userSession.delete({
      where: { session_id: sessionId },
    });
  }

  // Validate password is not in recent history
  private async validatePasswordNotInHistory(
    userId: string,
    newPassword: string,
  ): Promise<void> {
    const historyCount =
      this.configService.get<number>('config.security.passwordHistoryCount') ??
      5;

    const passwordHistory = await this.prisma.passwordHistory.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: historyCount,
    });

    for (const historyEntry of passwordHistory) {
      const isMatch = await bcrypt.compare(newPassword, historyEntry.password);
      if (isMatch) {
        throw new BadRequestException(
          'New password cannot be the same as any of your last 5 passwords',
        );
      }
    }
  }

  // Log password reset request for anomaly detection
  private async logPasswordResetRequest(userId: string, ipAddress?: string) {
    await this.prisma.auditLog.create({
      data: {
        user_id: userId,
        action: 'PASSWORD_RESET_REQUEST',
        table_affected: 'users',
        record_id: userId,
        old_values: {},
        new_values: { ip: ipAddress },
      },
    });
  }

  async validateToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('config.jwt.secret'),
      });
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

      if (!user || !user.is_active || user.deleted_at) {
        throw new UnauthorizedException('Invalid token');
      }

      // Extract roles and permissions
      const roles = user.assigned_roles.map((ur) => ur.role.role_name);
      const permissions = user.assigned_roles.flatMap((ur) =>
        ur.role.permissions.map(
          (rp) => `${rp.permission.resource}:${rp.permission.action}`,
        ),
      );

      return {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        roles,
        permissions,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
