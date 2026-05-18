import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UsersQueryDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  // @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get all users' })
  async findAll(@Query() query: UsersQueryDto) {
    return this.usersService.findAll(
      query.page ?? 1,
      query.limit ?? 10,
      query.search,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findOne(user.user_id);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  // @Roles('admin')
  @ApiOperation({ summary: 'Create new user' })
  async create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    createUserDto.assigned_by = currentUser.user_id;

    return this.usersService.create(createUserDto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() currentUser: any,
  ) {
    updateUserDto.assigned_by = currentUser.user_id;

    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (soft delete)' })
  async delete(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.delete(id, currentUser.user_id);
  }

  @Post(':id/roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
    @CurrentUser() currentUser: any,
  ) {
    return this.usersService.assignRole(id, roleId, currentUser.user_id);
  }

  @Delete(':id/roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Remove role from user' })
  async removeRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('roleId', new ParseUUIDPipe()) roleId: string,
  ) {
    return this.usersService.removeRole(id, roleId);
  }
}
