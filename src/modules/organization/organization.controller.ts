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
import { OrganizationService } from './organization.service';
import {
  CreateOrgNodeDto,
  UpdateOrgNodeDto,
  MoveOrgNodeDto,
  CreatePositionDto,
  UpdatePositionDto,
  AssignUserDto,
} from './dto';
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
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Organization')
@ApiBearerAuth()
@Controller('organization')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class OrganizationController {
  constructor(private organizationService: OrganizationService) {}

  // ==================== Organizational Nodes ====================

  @Post('nodes')
  @Permissions('organization:create')
  @ApiOperation({ summary: 'Create organizational node' })
  async createNode(
    @Body() createOrgNodeDto: CreateOrgNodeDto,
    @CurrentUser() user: any,
  ) {
    const node = await this.organizationService.createNode(
      createOrgNodeDto,
      user.user_id,
    );
    return {
      message: 'Organization node created successfully',
      data: node,
    };
  }

   @Get('nodes')
   //   @Permissions('organization:read')
   @ApiOperation({ summary: 'Get all organization nodes' })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiQuery({ name: 'search', required: false })
   @ApiQuery({ name: 'nodeType', required: false })
   async findAllNodes(
     @Query('page', new ParseIntPipe({ optional: true })) page?: number,
     @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
     @Query('search') search?: string,
     @Query('nodeType') nodeType?: string,
   ) {
     return this.organizationService.findAllNodes(
       page ?? 1,
       limit ?? 10,
       search,
       nodeType,
     );
   }

   @Get('nodes/tree')
   @Permissions('organization:read')
   @ApiOperation({ summary: 'Get organization tree' })
   @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
   @ApiQuery({ name: 'maxDepth', required: false, type: Number })
   async getTree(
     @Query('includeInactive') includeInactive?: boolean,
     @Query('maxDepth') maxDepth?: number,
   ) {
     return this.organizationService.getOrganizationTree({
       includeInactive: includeInactive === true,
       maxDepth: maxDepth ? +maxDepth : undefined,
     });
   }

  @Get('nodes/:id')
  @Permissions('organization:read')
  @ApiOperation({ summary: 'Get organization node by ID' })
  async findNode(@Param('id', ParseIntPipe) id: number) {
    return this.organizationService.findNode(id);
  }

   @Get('nodes/:id/users')
   @Permissions('organization:read')
   @ApiOperation({ summary: 'Get users assigned to a node' })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   async getNodeUsers(
     @Param('id', ParseIntPipe) id: number,
     @Query('page', new ParseIntPipe({ optional: true })) page?: number,
     @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
   ) {
     return this.organizationService.getNodeUsers(id, page ?? 1, limit ?? 10);
   }

  @Put('nodes/:id')
  @Permissions('organization:update')
  @ApiOperation({ summary: 'Update organization node' })
  async updateNode(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrgNodeDto: UpdateOrgNodeDto,
    @CurrentUser() user: any,
  ) {
    const node = await this.organizationService.updateNode(
      id,
      updateOrgNodeDto,
      user.user_id,
    );
    return {
      message: 'Organization node updated successfully',
      data: node,
    };
  }

  @Post('nodes/:id/move')
  @Permissions('organization:update')
  @ApiOperation({ summary: 'Move organization node to different parent' })
  async moveNode(
    @Param('id', ParseIntPipe) id: number,
    @Body() moveOrgNodeDto: MoveOrgNodeDto,
    @CurrentUser() user: any,
  ) {
    const node = await this.organizationService.moveNode(
      id,
      moveOrgNodeDto,
      user.user_id,
    );
    return {
      message: 'Organization node moved successfully',
      data: node,
    };
  }

  @Delete('nodes/:id')
  @Permissions('organization:delete')
  @ApiOperation({ summary: 'Delete organization node' })
  async deleteNode(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.deleteNode(id, user.user_id);
  }

  // ==================== Positions ====================

  @Post('positions')
  @Permissions('organization:create')
  @ApiOperation({ summary: 'Create position' })
  async createPosition(
    @Body() createPositionDto: CreatePositionDto,
    @CurrentUser() user: any,
  ) {
    const position = await this.organizationService.createPosition(
      createPositionDto,
      user.user_id,
    );
    return {
      message: 'Position created successfully',
      data: position,
    };
  }

   @Get('positions')
   @Permissions('organization:read')
   @ApiOperation({ summary: 'Get all positions' })
   @ApiQuery({ name: 'page', required: false, type: Number })
   @ApiQuery({ name: 'limit', required: false, type: Number })
   @ApiQuery({ name: 'search', required: false })
   async findAllPositions(
     @Query('page', new ParseIntPipe({ optional: true })) page?: number,
     @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
     @Query('search') search?: string,
   ) {
     return this.organizationService.findAllPositions(page ?? 1, limit ?? 10, search);
   }

  @Put('positions/:id')
  @Permissions('organization:update')
  @ApiOperation({ summary: 'Update position' })
  async updatePosition(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePositionDto: UpdatePositionDto,
    @CurrentUser() user: any,
  ) {
    const position = await this.organizationService.updatePosition(
      id,
      updatePositionDto,
      user.user_id,
    );
    return {
      message: 'Position updated successfully',
      data: position,
    };
  }

  @Delete('positions/:id')
  @Permissions('organization:delete')
  @ApiOperation({ summary: 'Delete position' })
  async deletePosition(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.deletePosition(id, user.user_id);
  }

  // ==================== User Assignments ====================

  @Post('assignments')
  @Permissions('organization:assign')
  @ApiOperation({ summary: 'Assign user to node' })
  async assignUserToNode(
    @Body() assignUserDto: AssignUserDto,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.organizationService.assignUserToNode(
      assignUserDto,
      user.user_id,
    );
    return {
      message: 'User assigned to node successfully',
      data: assignment,
    };
  }

  @Put('assignments/:id')
  @Permissions('organization:update')
  @ApiOperation({ summary: 'Update user assignment' })
  async updateUserAssignment(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: Partial<AssignUserDto>,
    @CurrentUser() user: any,
  ) {
    const assignment = await this.organizationService.updateUserAssignment(
      id,
      updateData,
      user.user_id,
    );
    return {
      message: 'User assignment updated successfully',
      data: assignment,
    };
  }

  @Delete('assignments/:id')
  @Permissions('organization:assign')
  @ApiOperation({ summary: 'Remove user from node' })
  async removeUserFromNode(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: any,
  ) {
    return this.organizationService.removeUserFromNode(id, user.user_id);
  }

  // ==================== User Nodes ====================

  @Get('my-nodes')
  @Permissions('organization:read')
  @ApiOperation({ summary: "Get current user's organization nodes" })
  async getMyNodes(@CurrentUser() user: any) {
    return this.organizationService.getUserNodes(user.user_id);
  }

  @Get('users/:userId/nodes')
  @Permissions('organization:read')
  @ApiOperation({ summary: "Get user's organization nodes" })
  async getUserNodes(@Param('userId', ParseIntPipe) userId: number) {
    return this.organizationService.getUserNodes(userId);
  }

  // ==================== Statistics ====================

  @Get('stats')
  @Permissions('organization:read')
  @ApiOperation({ summary: 'Get organization statistics' })
  async getStatistics() {
    return this.organizationService.getStatistics();
  }
}
