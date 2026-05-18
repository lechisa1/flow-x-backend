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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PrioritiesService } from './priorities.service';
import { CreatePriorityDto, UpdatePriorityDto } from './dto';
import type { BulkPriorityUpdateDto } from './interfaces/priority.interface';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Priorities')
@ApiBearerAuth()
@Controller('priorities')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PrioritiesController {
  constructor(private prioritiesService: PrioritiesService) {}

  @Post()
  @Permissions('priorities:create')
  @ApiOperation({ summary: 'Create a new priority level' })
  @ApiResponse({ status: 201, description: 'Priority created successfully' })
  @ApiResponse({ status: 409, description: 'Priority already exists' })
  async create(
    @Body() createPriorityDto: CreatePriorityDto,
    @CurrentUser() user: any,
  ) {
    const priority = await this.prioritiesService.create(
      createPriorityDto,
      user.user_id,
    );
    return {
      message: 'Priority created successfully',
      data: priority,
    };
  }

  @Get()
  //   @Permissions('priorities:read')
  @ApiOperation({ summary: 'Get all priorities with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return this.prioritiesService.findAll(page ?? 1, limit ?? 10, search);
  }

  @Get('defaults')
  @Public()
  @ApiOperation({ summary: 'Get default priorities (public)' })
  async getDefaultPriorities() {
    return this.prioritiesService.getDefaultPriorities();
  }

  @Get('usage')
  @Permissions('priorities:read')
  @ApiOperation({ summary: 'Get priority usage statistics' })
  async getPriorityUsage() {
    return this.prioritiesService.getPriorityUsage();
  }

  @Get('analytics')
  @Permissions('priorities:read')
  @ApiOperation({ summary: 'Get priority analytics' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.prioritiesService.getAnalytics(start, end);
  }

  @Get(':id')
  @Permissions('priorities:read')
  @ApiOperation({ summary: 'Get priority by ID' })
  @ApiParam({ name: 'id', description: 'Priority ID' })
  async findOne(@Param('id') id: string) {
    return this.prioritiesService.findOne(id);
  }

  @Get('level/:level')
  @Permissions('priorities:read')
  @ApiOperation({ summary: 'Get priority by level name' })
  async findByLevel(@Param('level') level: string) {
    return this.prioritiesService.findByLevel(level);
  }

  @Put(':id')
  @Permissions('priorities:update')
  @ApiOperation({ summary: 'Update a priority' })
  async update(
    @Param('id') id: string,
    @Body() updatePriorityDto: UpdatePriorityDto,
    @CurrentUser() user: any,
  ) {
    const priority = await this.prioritiesService.update(
      id,
      updatePriorityDto,
      user.user_id,
    );
    return {
      message: 'Priority updated successfully',
      data: priority,
    };
  }

  @Post('reorder')
  @Permissions('priorities:update')
  @ApiOperation({ summary: 'Reorder priorities' })
  async reorder(@Body('priority_ids') priorityIds: string[]) {
    const priorities =
      await this.prioritiesService.reorderPriorities(priorityIds);
    return {
      message: 'Priorities reordered successfully',
      data: priorities,
    };
  }

  @Post('bulk-update')
  @Permissions('priorities:update')
  @ApiOperation({ summary: 'Bulk update priorities' })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkPriorityUpdateDto,
    @CurrentUser() user: any,
  ) {
    const priorities = await this.prioritiesService.bulkUpdate(
      bulkUpdateDto,
      user.user_id,
    );
    return {
      message: 'Priorities updated successfully',
      data: priorities,
    };
  }

  @Delete(':id')
  @Permissions('priorities:delete')
  @ApiOperation({ summary: 'Delete a priority' })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: any,
  ) {
    return this.prioritiesService.delete(id, user.user_id);
  }

  @Post('seed')
  @Permissions('priorities:create')
  @ApiOperation({ summary: 'Seed default priorities (admin only)' })
  async seedDefaultPriorities() {
    await this.prioritiesService.seedDefaultPriorities();
    return {
      message: 'Default priorities seeded successfully',
    };
  }
}
