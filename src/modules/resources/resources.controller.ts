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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { extname } from 'path';
import { diskStorage } from 'multer';
import { ResourcesService } from './resources.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceFilterDto,
  AddCommentDto,
  AddReviewDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  // ==================== Categories (before :id param routes) ====================

  @Post('categories')
  // @Permissions('resources:manage_categories')
  @ApiOperation({ summary: 'Create resource category' })
  async createCategory(@Body() createDto: CreateCategoryDto) {
    const category = await this.resourcesService.createCategory(createDto);
    return {
      message: 'Category created successfully',
      data: category,
    };
  }

  @Get('categories')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get all categories' })
  async getAllCategories() {
    return this.resourcesService.getAllCategories();
  }

  @Get('categories/tree')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get category tree' })
  async getCategoryTree() {
    return this.resourcesService.getCategoryTree();
  }

  @Put('categories/:id')
  // @Permissions('resources:manage_categories')
  @ApiOperation({ summary: 'Update category' })
  async updateCategory(
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    const category = await this.resourcesService.updateCategory(id, updateDto);
    return {
      message: 'Category updated successfully',
      data: category,
    };
  }

  @Delete('categories/:id')
  // @Permissions('resources:manage_categories')
  @ApiOperation({ summary: 'Delete category' })
  async deleteCategory(@Param('id') id: string) {
    return this.resourcesService.deleteCategory(id);
  }

  // ==================== Resource CRUD ====================

  @Post()
  // @Permissions('resources:create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_, file, callback) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, uniqueSuffix + extname(file.originalname));
        },
      }),
      fileFilter: (_, file, callback) => {
        callback(null, true);
      },
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: 'Employee Handbook 2024' },
        description: {
          type: 'string',
          example: 'Complete guide for employees',
        },
        org_node_id: { type: 'number', example: 5 },
        category_ids: { type: 'string', example: '[1,2]' },
        tags: { type: 'string', example: '["handbook","policy"]' },
        is_featured: { type: 'boolean', example: false },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload a new resource' })
  async create(
    @Body() createDto: CreateResourceDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    const resource = await this.resourcesService.create(
      user.user_id,
      createDto,
      file,
    );
    return {
      message: 'Resource uploaded successfully',
      data: resource,
    };
  }

  @Get()
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get all resources with filters' })
  async findAll(
    @CurrentUser() user: any,
    @Query() filterDto: ResourceFilterDto,
  ) {
    return this.resourcesService.findAll(user.user_id, filterDto);
  }

  @Get('favorites')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get user favorites' })
  async getFavorites(
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.resourcesService.getUserFavorites(user.user_id, +page, +limit);
  }

  @Get('analytics')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get resource analytics' })
  async getAnalytics() {
    return this.resourcesService.getAnalytics();
  }

  @Get(':id')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get resource by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourcesService.findOne(id, user.user_id);
  }

  @Put(':id')
  // @Permissions('resources:update')
  @ApiOperation({ summary: 'Update resource' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateResourceDto,
    @CurrentUser() user: any,
  ) {
    const resource = await this.resourcesService.update(
      id,
      user.user_id,
      updateDto,
    );
    return {
      message: 'Resource updated successfully',
      data: resource,
    };
  }

  @Post(':id/download')
  // @Permissions('resources:download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Download resource' })
  async download(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourcesService.downloadResource(id, user.user_id);
  }

  @Delete(':id')
  // @Permissions('resources:delete')
  @ApiOperation({ summary: 'Delete resource' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourcesService.delete(id, user.user_id);
  }

  // ==================== Favorites ====================

  @Post(':id/favorite')
  // @Permissions('resources:read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle favorite' })
  async toggleFavorite(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourcesService.toggleFavorite(id, user.user_id);
  }

  // ==================== Comments ====================

  @Post(':id/comments')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Add comment to resource' })
  async addComment(
    @Param('id') id: string,
    @Body() commentDto: AddCommentDto,
    @CurrentUser() user: any,
  ) {
    const comment = await this.resourcesService.addComment(
      id,
      user.user_id,
      commentDto,
    );
    return {
      message: 'Comment added successfully',
      data: comment,
    };
  }

  @Get(':id/comments')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Get resource comments' })
  async getComments(
    @Param('id') id: string,
    @CurrentUser() user: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.resourcesService.getComments(id, user.user_id, +page, +limit);
  }

  // ==================== Reviews ====================

  @Post(':id/reviews')
  // @Permissions('resources:read')
  @ApiOperation({ summary: 'Add review/rating' })
  async addReview(
    @Param('id') id: string,
    @Body() reviewDto: AddReviewDto,
    @CurrentUser() user: any,
  ) {
    const review = await this.resourcesService.addReview(
      id,
      user.user_id,
      reviewDto,
    );
    return {
      message: 'Review added successfully',
      data: review,
    };
  }
}
