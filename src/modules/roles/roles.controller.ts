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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto, AssignPermissionDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class RolesController {
  constructor(private rolesService: RolesService) {}

  @Post()
  // @Permissions('roles:create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role already exists' })
  async create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() user: any) {
    const role = await this.rolesService.create(createRoleDto, user.user_id);
    return {
      message: 'Role created successfully',
      data: role,
    };
  }

  @Get()
  // @Permissions('roles:read')
  @ApiOperation({ summary: 'Get all roles with pagination' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.rolesService.findAll(+page, +limit, search);
  }

  @Get('stats')
  // @Permissions('roles:read')
  @ApiOperation({ summary: 'Get role system statistics' })
  async getStats() {
    return this.rolesService.getSystemStats();
  }

  @Get(':id')
  // @Permissions('roles:read')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiParam({ name: 'id', description: 'Role ID' })
  async findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Get(':id/permissions')
  // @Permissions('roles:read')
  @ApiOperation({ summary: 'Get all permissions for a role' })
  async getRolePermissions(@Param('id') id: string) {
    return this.rolesService.getRolePermissions(id);
  }

  @Get(':id/users')
  // @Permissions('roles:read')
  @ApiOperation({ summary: 'Get all users with a specific role' })
  async getUsersWithRole(
    @Param('id') id: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.rolesService.getUsersWithRole(id, +page, +limit);
  }

  @Put(':id')
  // @Permissions('roles:update')
  @ApiOperation({ summary: 'Update a role' })
  async update(
    @Param('id') id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @CurrentUser() user: any,
  ) {
    const role = await this.rolesService.update(
      id,
      updateRoleDto,
      user.user_id,
    );
    return {
      message: 'Role updated successfully',
      data: role,
    };
  }

  @Post(':id/permissions')
  // @Permissions('roles:update')
  @ApiOperation({ summary: 'Assign permissions to a role' })
  async assignPermissions(
    @Param('id') id: string,
    @Body() assignPermissionDto: AssignPermissionDto,
  ) {
    const role = await this.rolesService.assignPermissions(
      id,
      assignPermissionDto,
    );
    return {
      message: 'Permissions assigned successfully',
      data: role,
    };
  }

  @Delete(':id/permissions/:permissionId')
  // @Permissions('roles:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a permission from a role' })
  async removePermission(
    @Param('id') id: string,
    @Param('permissionId') permissionId: string,
  ) {
    const role = await this.rolesService.removePermission(id, permissionId);
    return {
      message: 'Permission removed successfully',
      data: role,
    };
  }

  @Delete(':id')
  // @Permissions('roles:delete')
  @ApiOperation({ summary: 'Delete a role' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.rolesService.delete(id, user.user_id);
  }
}
