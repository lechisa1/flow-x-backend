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
import { NoticesService } from './notices.service';
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeFilterDto,
  NoticeResponseDto,
} from './dto';
import type { NoticeBulkActionDto } from './interfaces/notice.interface';
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

@ApiTags('Notices')
@ApiBearerAuth()
@Controller('notices')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class NoticesController {
  constructor(private noticesService: NoticesService) {}

  @Post()
  //   @Permissions('notices:create')
  @ApiOperation({ summary: 'Create a new notice' })
  async create(
    @Body() createNoticeDto: CreateNoticeDto,
    @CurrentUser() user: any,
  ) {
    const notice = await this.noticesService.create(
      createNoticeDto,
      user.user_id,
    );
    return {
      message: 'Notice created successfully',
      data: notice,
    };
  }

  @Get()
  //   @Permissions('notices:read')
  @ApiOperation({ summary: 'Get all notices (with filtering)' })
  async findAll(@CurrentUser() user: any, @Query() filterDto: NoticeFilterDto) {
    return this.noticesService.findAll(user.user_id, filterDto);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get notice analytics' })
  async getAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.noticesService.getAnalytics(start, end);
  }

  @Get('categories')
  //   @Permissions('notices:read')
  @ApiOperation({ summary: 'Get all notice categories' })
  async getAllCategories() {
    return this.noticesService.getAllCategories();
  }

  @Post('categories')

  //   @Permissions('notices:create')
  @ApiOperation({ summary: 'Create notice category' })
  async createCategory(
    @Body('name') name: string,
    @Body('description') description?: string,
  ) {
    const category = await this.noticesService.createCategory(
      name,
      description,
    );
    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  @Delete('categories/:id')

  //   @Permissions('notices:delete')
  @ApiOperation({ summary: 'Delete notice category' })
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.noticesService.deleteCategory(id);
  }

  @Get(':id')
  //   @Permissions('notices:read')
  @ApiOperation({ summary: 'Get notice by ID' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.noticesService.findOne(id, user.user_id);
  }

  @Put(':id')
  //   @Permissions('notices:update')
  @ApiOperation({ summary: 'Update notice' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoticeDto: UpdateNoticeDto,
    @CurrentUser() user: any,
  ) {
    const notice = await this.noticesService.update(
      id,
      updateNoticeDto,
      user.user_id,
    );
    return {
      message: 'Notice updated successfully',
      data: notice,
    };
  }

  @Post(':id/publish')
  //   @Permissions('notices:publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish notice' })
  async publish(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const notice = await this.noticesService.publishNotice(id, user.user_id);
    return {
      message: 'Notice published successfully',
      data: notice,
    };
  }

  @Post(':id/archive')
  //   @Permissions('notices:update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive notice' })
  async archive(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    const notice = await this.noticesService.archiveNotice(id, user.user_id);
    return {
      message: 'Notice archived successfully',
      data: notice,
    };
  }

  @Delete(':id')
  //   @Permissions('notices:delete')
  @ApiOperation({ summary: 'Delete notice (soft delete)' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.noticesService.deleteNotice(id, user.user_id);
  }

  @Post('bulk')
  //   @Permissions('notices:update')
  @ApiOperation({ summary: 'Bulk actions on notices' })
  async bulkAction(
    @Body() bulkActionDto: NoticeBulkActionDto,
    @CurrentUser() user: any,
  ) {
    return this.noticesService.bulkAction(bulkActionDto, user.user_id);
  }
}
