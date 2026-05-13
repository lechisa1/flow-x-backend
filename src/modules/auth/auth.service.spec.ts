import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userSession: {
      count: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    userDevice: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    userPresence: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    role: {
      findFirst: jest.fn(),
    },
    userRole: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      switch (key) {
        case 'config.security.bcryptSaltRounds':
          return 10;
        case 'config.jwt.secret':
          return 'test-secret';
        case 'config.jwt.expiresIn':
          return '8h';
        case 'config.jwt.refreshSecret':
          return 'test-refresh-secret';
        case 'config.jwt.refreshExpiresIn':
          return '7d';
        default:
          return null;
      }
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('forgotPassword', () => {
    it('should generate reset token for existing user', async () => {
      const email = 'test@example.com';
      const user = { user_id: 1, email };
      const resetToken = 'hashed-reset-token';
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

jest
         .spyOn(crypto, 'randomBytes')
         .mockReturnValue({ toString: () => resetToken } as any);
      mockPrismaService.user.findUnique.mockResolvedValue(user);
      mockPrismaService.passwordResetToken.create.mockResolvedValue({});

      await service.forgotPassword(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalledWith({
        data: {
          userId: user.user_id,
          token: resetToken,
          expiresAt: resetTokenExpiry,
        },
      });
    });

    it('should not reveal that user does not exist', async () => {
      const email = 'nonexistent@example.com';
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await service.forgotPassword(email);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(
        mockPrismaService.passwordResetToken.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetPasswordDto = {
        token: 'valid-token',
        new_password: 'NewPassword123!',
      };
      const userId = 1;
      const resetToken = {
        id: 1,
        userId,
        token: 'valid-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: false,
        user: { user_id: userId },
      };
      const hashedPassword = 'hashed-password';

      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(
        resetToken,
      );
      jest.spyOn(bcrypt, 'hash' as any).mockResolvedValue(hashedPassword);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});
      mockPrismaService.userSession.deleteMany.mockResolvedValue({});
      mockPrismaService.auditLog.create.mockResolvedValue({});

      await service.resetPassword(resetPasswordDto);

      expect(
        mockPrismaService.passwordResetToken.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          token: resetPasswordDto.token,
          expiresAt: { gt: expect.any(Date) },
          used: false,
        },
        include: { user: true },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(
        resetPasswordDto.new_password,
        10,
      );
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { user_id: userId },
        data: { password: hashedPassword },
      });
      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: resetToken.id },
        data: { used: true },
      });
      expect(mockPrismaService.userSession.deleteMany).toHaveBeenCalledWith({
        where: { user_id: userId },
      });
      expect(mockPrismaService.auditLog.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          action: 'PASSWORD_RESET',
          table_affected: 'users',
          record_id: userId,
          old_values: null,
          new_values: {},
        },
      });
    });

    it('should throw BadRequestException for invalid token', async () => {
      const resetPasswordDto = {
        token: 'invalid-token',
        new_password: 'NewPassword123!',
      };

      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });

    it('should throw BadRequestException for expired token', async () => {
      const resetPasswordDto = {
        token: 'expired-token',
        new_password: 'NewPassword123!',
      };
      const expiredToken = {
        id: 1,
        userId: 1,
        token: 'expired-token',
        expiresAt: new Date(Date.now() - 1000), // Expired
        used: false,
      };

      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(
        expiredToken,
      );

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });

    it('should throw BadRequestException for already used token', async () => {
      const resetPasswordDto = {
        token: 'used-token',
        new_password: 'NewPassword123!',
      };
      const usedToken = {
        id: 1,
        userId: 1,
        token: 'used-token',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        used: true,
      };

      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue(
        usedToken,
      );

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired reset token',
      );
    });
  });
});
