import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { extname } from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceFilterDto,
  AddCommentDto,
  AddReviewDto,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto';
import { ResourceResponseDto } from './dto/resource-response.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== Resource CRUD ====================

  async create(
    userId: number,
    createDto: CreateResourceDto,
    file?: Express.Multer.File,
  ): Promise<ResourceResponseDto> {
    let dbFile;

    if (file) {
      dbFile = await this.prisma.file.create({
        data: {
          file_name: file.filename,
          original_name: file.originalname,
          file_url: `/uploads/${file.filename}`,
          mime_type: file.mimetype,
          file_extension: extname(file.originalname),
          file_size: file.size,
          uploaded_by_user_id: userId,
          storage_provider: 'local',
          is_public: false,
        },
      });
    } else if (createDto.file_id) {
      dbFile = await this.prisma.file.findUnique({
        where: { file_id: createDto.file_id },
      });
    }

    if (!dbFile) {
      throw new NotFoundException(
        'File not found. Please upload a file or provide a valid file_id',
      );
    }

    const resource = await this.prisma.resource.create({
      data: {
        title: createDto.title,
        description: createDto.description,
        file_id: dbFile.file_id,
        uploaded_by_user_id: userId,
        org_node_id: createDto.org_node_id,
        is_featured: createDto.is_featured || false,
      },
      include: {
        file: true,
        uploaded_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        org_node: true,
      },
    });

    // Add categories
    if (createDto.category_ids && createDto.category_ids.length > 0) {
      for (const categoryId of createDto.category_ids) {
        await this.prisma.resourceCategoryMapping.create({
          data: {
            resource_id: resource.resource_id,
            category_id: categoryId,
          },
        });
      }
    }

    // Add tags
    if (createDto.tags && createDto.tags.length > 0) {
      for (const tagName of createDto.tags) {
        let tag = await this.prisma.resourceTag.findUnique({
          where: { tag_name: tagName.toLowerCase() },
        });

        if (!tag) {
          tag = await this.prisma.resourceTag.create({
            data: { tag_name: tagName.toLowerCase() },
          });
        }

        await this.prisma.resourceTagMapping.create({
          data: {
            resource_id: resource.resource_id,
            tag_id: tag.tag_id,
          },
        });

        // Increment usage count
        await this.prisma.resourceTag.update({
          where: { tag_id: tag.tag_id },
          data: { usage_count: { increment: 1 } },
        });
      }
    }

    // Create initial version
    await this.prisma.resourceVersion.create({
      data: {
        resource_id: resource.resource_id,
        version_number: 1,
        file_id: dbFile.file_id,
        change_notes: 'Initial version',
        created_by: userId,
      },
    });

    await this.logAuditTrail(
      userId,
      'CREATE_RESOURCE',
      'resources',
      resource.resource_id,
      null,
      createDto,
    );

    this.logger.log(`Resource created: ${resource.title} by user ${userId}`);

    return this.findOne(resource.resource_id, userId);
  }

  async findAll(userId: number, filterDto: ResourceFilterDto) {
    const page = filterDto.page || 1;
    const limit = filterDto.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {
      is_active: true,
      deleted_at: null,
    };

    // Search
    if (filterDto.search) {
      where.OR = [
        { title: { contains: filterDto.search, mode: 'insensitive' } },
        { description: { contains: filterDto.search, mode: 'insensitive' } },
      ];
    }

    // Filter by category
    if (filterDto.category_id) {
      where.categories = {
        some: { category_id: filterDto.category_id },
      };
    }

    // Filter by tags
    if (filterDto.tags && filterDto.tags.length > 0) {
      where.tags = {
        some: { tag: { tag_name: { in: filterDto.tags } } },
      };
    }

    // Filter by org node
    if (filterDto.org_node_id) {
      where.org_node_id = filterDto.org_node_id;
    }

    // Filter by uploader
    if (filterDto.uploaded_by) {
      where.uploaded_by_user_id = filterDto.uploaded_by;
    }

    // Featured only
    if (filterDto.is_featured) {
      where.is_featured = true;
    }

    // Determine sort order
    let orderBy: any = {};
    switch (filterDto.sort_by) {
      case 'newest':
        orderBy = { created_at: 'desc' };
        break;
      case 'oldest':
        orderBy = { created_at: 'asc' };
        break;
      case 'popular':
        orderBy = { download_count: 'desc' };
        break;
      case 'most_viewed':
        orderBy = { view_count: 'desc' };
        break;
      case 'top_rated':
        orderBy = { rating_avg: 'desc' };
        break;
      default:
        orderBy = { created_at: 'desc' };
    }

    const [resources, total] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        skip,
        take: limit,
        include: {
          file: true,
          uploaded_by: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              profile_pic_url: true,
            },
          },
          org_node: true,
          categories: {
            include: { category: true },
          },
          tags: {
            include: { tag: true },
          },
          favorites: {
            where: { user_id: userId },
          },
        },
        orderBy,
      }),
      this.prisma.resource.count({ where }),
    ]);

    const resourcesWithDetails = await Promise.all(
      resources.map(async (resource) => {
        const userRating = await this.prisma.resourceReview.findUnique({
          where: {
            resource_id_user_id: {
              resource_id: resource.resource_id,
              user_id: userId,
            },
          },
        });

        return {
          ...resource,
          is_favorite: resource.favorites.length > 0,
          user_rating: userRating?.rating,
          categories: resource.categories.map((c) => c.category),
          tags: resource.tags.map((t) => t.tag),
        };
      }),
    );

    return {
      data: resourcesWithDetails.map((r) => new ResourceResponseDto(r)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    resourceId: number,
    userId: number,
  ): Promise<ResourceResponseDto> {
    const resource = await this.prisma.resource.findUnique({
      where: { resource_id: resourceId, deleted_at: null },
      include: {
        file: true,
        uploaded_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        org_node: true,
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
        versions: {
          orderBy: { version_number: 'desc' },
          take: 5,
          include: {
            file: true,
            creator: {
              select: {
                user_id: true,
                full_name: true,
              },
            },
          },
        },
        comments: {
          where: { parent_id: null },
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
                profile_pic_url: true,
              },
            },
            replies: {
              include: {
                user: {
                  select: {
                    user_id: true,
                    full_name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        favorites: {
          where: { user_id: userId },
        },
        reviews: {
          where: { user_id: userId },
        },
      },
    });

    if (!resource) {
      throw new NotFoundException(`Resource with ID ${resourceId} not found`);
    }

    // Check access based on org_node
    if (resource.org_node_id) {
      const userAssignment = await this.prisma.userAssignment.findFirst({
        where: {
          user_id: userId,
          org_node_id: resource.org_node_id,
        },
      });

      const userRoles = await this.prisma.userRole.findMany({
        where: { user_id: userId },
        include: { role: true },
      });
      const isAdmin = userRoles.some((ur) =>
        ['super_admin', 'admin'].includes(ur.role.role_name),
      );

      if (
        !userAssignment &&
        !isAdmin &&
        resource.uploaded_by_user_id !== userId
      ) {
        throw new ForbiddenException('You do not have access to this resource');
      }
    }

    // Increment view count
    await this.prisma.resource.update({
      where: { resource_id: resourceId },
      data: { view_count: { increment: 1 } },
    });

    // Log access
    await this.prisma.resourceAccessLog.create({
      data: {
        resource_id: resourceId,
        user_id: userId,
        action: 'view',
      },
    });

    return new ResourceResponseDto({
      ...resource,
      is_favorite: resource.favorites.length > 0,
      user_rating: resource.reviews[0]?.rating,
      categories: resource.categories.map((c) => c.category),
      tags: resource.tags.map((t) => t.tag),
      version_number: resource.versions[0]?.version_number,
    });
  }

  async update(
    resourceId: number,
    userId: number,
    updateDto: UpdateResourceDto,
  ): Promise<ResourceResponseDto> {
    const resource = await this.prisma.resource.findUnique({
      where: { resource_id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    // Check permissions
    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (resource.uploaded_by_user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own resources');
    }

    // If new file uploaded, create new version
    if (updateDto.file_id && updateDto.file_id !== resource.file_id) {
      const currentMaxVersion = await this.prisma.resourceVersion.aggregate({
        where: { resource_id: resourceId },
        _max: { version_number: true },
      });

      const newVersionNumber = (currentMaxVersion._max.version_number || 0) + 1;

      await this.prisma.resourceVersion.create({
        data: {
          resource_id: resourceId,
          version_number: newVersionNumber,
          file_id: updateDto.file_id,
          change_notes: updateDto.change_notes || `Version ${newVersionNumber}`,
          created_by: userId,
        },
      });
    }

    // Update resource
    const updatedResource = await this.prisma.resource.update({
      where: { resource_id: resourceId },
      data: {
        title: updateDto.title,
        description: updateDto.description,
        file_id: updateDto.file_id,
        is_active: updateDto.is_active,
        is_featured: updateDto.is_featured,
      },
      include: {
        file: true,
        uploaded_by: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        org_node: true,
      },
    });

    // Update categories if provided
    if (updateDto.category_ids) {
      await this.prisma.resourceCategoryMapping.deleteMany({
        where: { resource_id: resourceId },
      });

      for (const categoryId of updateDto.category_ids) {
        await this.prisma.resourceCategoryMapping.create({
          data: {
            resource_id: resourceId,
            category_id: categoryId,
          },
        });
      }
    }

    // Update tags if provided
    if (updateDto.tags) {
      await this.prisma.resourceTagMapping.deleteMany({
        where: { resource_id: resourceId },
      });

      for (const tagName of updateDto.tags) {
        let tag = await this.prisma.resourceTag.findUnique({
          where: { tag_name: tagName.toLowerCase() },
        });

        if (!tag) {
          tag = await this.prisma.resourceTag.create({
            data: { tag_name: tagName.toLowerCase() },
          });
        }

        await this.prisma.resourceTagMapping.create({
          data: {
            resource_id: resourceId,
            tag_id: tag.tag_id,
          },
        });

        await this.prisma.resourceTag.update({
          where: { tag_id: tag.tag_id },
          data: { usage_count: { increment: 1 } },
        });
      }
    }

    await this.logAuditTrail(
      userId,
      'UPDATE_RESOURCE',
      'resources',
      resourceId,
      resource,
      updateDto,
    );

    return this.findOne(resourceId, userId);
  }

  async delete(
    resourceId: number,
    userId: number,
  ): Promise<{ message: string }> {
    const resource = await this.prisma.resource.findUnique({
      where: { resource_id: resourceId },
    });

    if (!resource) {
      throw new NotFoundException('Resource not found');
    }

    const userRoles = await this.prisma.userRole.findMany({
      where: { user_id: userId },
      include: { role: true },
    });
    const isAdmin = userRoles.some((ur) =>
      ['super_admin', 'admin'].includes(ur.role.role_name),
    );

    if (resource.uploaded_by_user_id !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own resources');
    }

    await this.prisma.resource.update({
      where: { resource_id: resourceId },
      data: { deleted_at: new Date(), is_active: false },
    });

    await this.logAuditTrail(
      userId,
      'DELETE_RESOURCE',
      'resources',
      resourceId,
      resource,
      null,
    );

    return { message: 'Resource deleted successfully' };
  }

  // ==================== Download Tracking ====================

  async downloadResource(
    resourceId: number,
    userId: number,
  ): Promise<{ download_url: string }> {
    const resource = await this.findOne(resourceId, userId);

    // Increment download count
    await this.prisma.resource.update({
      where: { resource_id: resourceId },
      data: { download_count: { increment: 1 } },
    });

    // Log download
    await this.prisma.resourceAccessLog.create({
      data: {
        resource_id: resourceId,
        user_id: userId,
        action: 'download',
      },
    });

    return { download_url: resource.file.file_url };
  }

  // ==================== Favorites ====================

  async toggleFavorite(
    resourceId: number,
    userId: number,
  ): Promise<{ is_favorite: boolean }> {
    const existing = await this.prisma.resourceFavorite.findUnique({
      where: {
        resource_id_user_id: {
          resource_id: resourceId,
          user_id: userId,
        },
      },
    });

    if (existing) {
      await this.prisma.resourceFavorite.delete({
        where: {
          resource_id_user_id: {
            resource_id: resourceId,
            user_id: userId,
          },
        },
      });
      return { is_favorite: false };
    } else {
      await this.prisma.resourceFavorite.create({
        data: {
          resource_id: resourceId,
          user_id: userId,
        },
      });
      return { is_favorite: true };
    }
  }

  async getUserFavorites(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const favorites = await this.prisma.resourceFavorite.findMany({
      where: { user_id: userId },
      skip,
      take: limit,
      include: {
        resource: {
          include: {
            file: true,
            uploaded_by: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
            categories: {
              include: { category: true },
            },
            tags: {
              include: { tag: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return {
      data: favorites.map((f) => new ResourceResponseDto({
        ...f.resource,
        categories: f.resource.categories.map((c) => c.category),
        tags: f.resource.tags.map((t) => t.tag),
      })),
      meta: {
        page,
        limit,
        total: favorites.length,
        totalPages: Math.ceil(favorites.length / limit),
      },
    };
  }

  // ==================== Comments ====================

  async addComment(
    resourceId: number,
    userId: number,
    commentDto: AddCommentDto,
  ) {
    await this.findOne(resourceId, userId);

    const comment = await this.prisma.resourceComment.create({
      data: {
        resource_id: resourceId,
        user_id: userId,
        parent_id: commentDto.parent_id,
        content: commentDto.content,
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
      },
    });

    return comment;
  }

  async getComments(
    resourceId: number,
    userId: number,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.findOne(resourceId, userId);

    const skip = (page - 1) * limit;

    const comments = await this.prisma.resourceComment.findMany({
      where: {
        resource_id: resourceId,
        parent_id: null,
      },
      skip,
      take: limit,
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
            profile_pic_url: true,
          },
        },
        replies: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
          },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const total = await this.prisma.resourceComment.count({
      where: { resource_id: resourceId, parent_id: null },
    });

    return {
      data: comments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== Reviews & Ratings ====================

  async addReview(resourceId: number, userId: number, reviewDto: AddReviewDto) {
    await this.findOne(resourceId, userId);

    const existing = await this.prisma.resourceReview.findUnique({
      where: {
        resource_id_user_id: {
          resource_id: resourceId,
          user_id: userId,
        },
      },
    });

    let review;
    if (existing) {
      review = await this.prisma.resourceReview.update({
        where: {
          resource_id_user_id: {
            resource_id: resourceId,
            user_id: userId,
          },
        },
        data: {
          rating: reviewDto.rating,
          review_text: reviewDto.review_text,
        },
      });
    } else {
      review = await this.prisma.resourceReview.create({
        data: {
          resource_id: resourceId,
          user_id: userId,
          rating: reviewDto.rating,
          review_text: reviewDto.review_text,
        },
      });
    }

    // Update average rating
    const avgRating = await this.prisma.resourceReview.aggregate({
      where: { resource_id: resourceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.resource.update({
      where: { resource_id: resourceId },
      data: {
        rating_avg: avgRating._avg.rating || 0,
        rating_count: avgRating._count.rating || 0,
      },
    });

    return review;
  }

  // ==================== Categories ====================

  async createCategory(createDto: CreateCategoryDto) {
    const existing = await this.prisma.resourceCategory.findUnique({
      where: { category_name: createDto.category_name },
    });

    if (existing) {
      throw new BadRequestException('Category with this name already exists');
    }

    return this.prisma.resourceCategory.create({
      data: {
        category_name: createDto.category_name,
        description: createDto.description,
        parent_id: createDto.parent_id,
        icon: createDto.icon,
        color: createDto.color,
        sort_order: createDto.sort_order || 0,
      },
    });
  }

  async getAllCategories() {
    const categories = await this.prisma.resourceCategory.findMany({
      where: { is_active: true },
      include: {
        _count: {
          select: { resources: true },
        },
        children: {
          where: { is_active: true },
          include: {
            _count: {
              select: { resources: true },
            },
          },
        },
      },
      orderBy: { sort_order: 'asc' },
    });

    return categories;
  }

  async getCategoryTree() {
    const categories = await this.prisma.resourceCategory.findMany({
      where: { parent_id: null, is_active: true },
      include: {
        children: {
          where: { is_active: true },
          include: {
            children: {
              where: { is_active: true },
            },
          },
        },
      },
      orderBy: { sort_order: 'asc' },
    });

    return categories;
  }

  async updateCategory(categoryId: number, updateDto: UpdateCategoryDto) {
    return this.prisma.resourceCategory.update({
      where: { category_id: categoryId },
      data: updateDto,
    });
  }

  async deleteCategory(categoryId: number) {
    const category = await this.prisma.resourceCategory.findUnique({
      where: { category_id: categoryId },
      include: { resources: { take: 1 } },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.resources.length > 0) {
      throw new BadRequestException(
        'Cannot delete category with associated resources',
      );
    }

    await this.prisma.resourceCategory.delete({
      where: { category_id: categoryId },
    });

    return { message: 'Category deleted successfully' };
  }

  // ==================== Analytics ====================

  async getAnalytics() {
    const [
      totalResources,
      totalDownloads,
      totalViews,
      topResources,
      popularTags,
    ] = await Promise.all([
      this.prisma.resource.count({ where: { deleted_at: null } }),
      this.prisma.resource.aggregate({
        where: { deleted_at: null },
        _sum: { download_count: true },
      }),
      this.prisma.resource.aggregate({
        where: { deleted_at: null },
        _sum: { view_count: true },
      }),
      this.prisma.resource.findMany({
        where: { deleted_at: null },
        orderBy: { download_count: 'desc' },
        take: 10,
        include: {
          file: true,
        },
      }),
      this.prisma.resourceTag.findMany({
        orderBy: { usage_count: 'desc' },
        take: 10,
      }),
    ]);

    return {
      total_resources: totalResources,
      total_downloads: totalDownloads._sum.download_count || 0,
      total_views: totalViews._sum.view_count || 0,
      top_resources: topResources.map((r) => ({
        resource_id: r.resource_id,
        title: r.title,
        download_count: r.download_count,
        view_count: r.view_count,
      })),
      popular_tags: popularTags,
    };
  }

  // ==================== Helper Methods ====================

  private async logAuditTrail(
    userId: number,
    action: string,
    tableAffected: string,
    recordId: number,
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
}
