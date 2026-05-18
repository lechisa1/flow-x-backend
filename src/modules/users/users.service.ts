import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async findAll(page: number = 1, limit: number = 10, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { full_name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
          deleted_at: null,
        }
      : { deleted_at: null };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          assigned_roles: {
            include: { role: true },
          },
          assigned_positions: {
            include: {
              org_node: true,
              position: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.excludePassword(user)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId, deleted_at: null },
      include: {
        assigned_roles: {
          include: { role: true },
        },
        assigned_positions: {
          include: {
            org_node: true,
            position: true,
          },
        },
        presence: true,
        education: true,
        experience: true,
        skills: {
          include: { skill: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.excludePassword(user);
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.configService.get<number>('config.security.bcryptSaltRounds') ?? 10,
    );

    const user = await this.prisma.user.create({
      data: {
        full_name: createUserDto.full_name,
        email: createUserDto.email,
        password: hashedPassword,
        phone: createUserDto.phone,
        is_active: createUserDto.is_active ?? true,
      },
    });

    // Assign roles if provided
    if (createUserDto.role_ids && createUserDto.role_ids.length > 0) {
      await this.prisma.userRole.createMany({
        data: createUserDto.role_ids.map((roleId) => ({
          user_id: user.user_id,
          role_id: roleId as string,
          assigned_by: createUserDto.assigned_by as string | undefined,
        })),
      });
    }

    return this.findOne(user.user_id);
  }

  async update(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(userId);

    const updateData: any = {
      full_name: updateUserDto.full_name,
      phone: updateUserDto.phone,
      is_active: updateUserDto.is_active,
    };

    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateUserDto.password,
        this.configService.get<number>('config.security.bcryptSaltRounds') ??
          10,
      );
    }

    await this.prisma.user.update({
      where: { user_id: userId },
      data: updateData,
    });

    // Update roles if provided
    if (updateUserDto.role_ids) {
      await this.prisma.userRole.deleteMany({
        where: { user_id: userId },
      });

      await this.prisma.userRole.createMany({
        data: updateUserDto.role_ids.map((roleId) => ({
          user_id: userId,
          role_id: roleId as string,
          assigned_by: updateUserDto.assigned_by as string | undefined,
        })),
      });
    }

    return this.findOne(userId);
  }

  async delete(userId: string, deletedBy: string) {
    const user = await this.findOne(userId);

    await this.prisma.user.update({
      where: { user_id: userId },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    // Log deletion
    await this.prisma.auditLog.create({
      data: {
        user_id: deletedBy,
        action: 'DELETE_USER',
        table_affected: 'users',
        record_id: userId,
        old_values: { email: user.email },
        new_values: { deleted_at: new Date() },
      },
    });

    return { message: 'User deleted successfully' };
  }

  async assignRole(userId: string, roleId: string, assignedBy: string) {
    const existing = await this.prisma.userRole.findUnique({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('User already has this role');
    }

    return this.prisma.userRole.create({
      data: {
        user_id: userId,
        role_id: roleId,
        assigned_by: assignedBy,
      },
    });
  }

  async removeRole(userId: string, roleId: string) {
    return this.prisma.userRole.delete({
      where: {
        user_id_role_id: {
          user_id: userId,
          role_id: roleId,
        },
      },
    });
  }

  private excludePassword(user: any) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
