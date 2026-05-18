import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PermissionsController {
  constructor(private permissionsService: PermissionsService) {}

  @Get()
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Get all permissions' })
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ) {
    return this.permissionsService.findAll(+page, +limit, search);
  }

  @Get('grouped')
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Get permissions grouped by resource' })
  async getGrouped() {
    return this.permissionsService.getGroupedByResource();
  }

  @Get(':id')
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Get permission by ID' })
  async findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @Get('resource/:resource')
  @Permissions('permissions:read')
  @ApiOperation({ summary: 'Get permissions by resource' })
  async findByResource(@Param('resource') resource: string) {
    return this.permissionsService.findByResource(resource);
  }
}
