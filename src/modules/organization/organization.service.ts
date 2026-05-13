import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateOrgNodeDto,
  UpdateOrgNodeDto,
  MoveOrgNodeDto,
  CreatePositionDto,
  UpdatePositionDto,
  AssignUserDto,
} from './dto';
import { OrgNodeResponseDto } from './dto/org-node-response.dto';
import {
  OrgTreeOptions,
  OrgNodeWithChildren,
} from './interfaces/organization.interface';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(private prisma: PrismaService) {}

  // ==================== Organizational Nodes ====================

  async createNode(
    createOrgNodeDto: CreateOrgNodeDto,
    createdBy: number,
  ): Promise<OrgNodeResponseDto> {
    // Check if node with same name exists at same level
    const existingNode = await this.prisma.organizationalStructure.findFirst({
      where: {
        node_name: createOrgNodeDto.node_name,
        parent_node_id: createOrgNodeDto.parent_node_id || null,
      },
    });

    if (existingNode) {
      throw new ConflictException(
        `Node "${createOrgNodeDto.node_name}" already exists at this level`,
      );
    }

    // Calculate level if not provided
    let level = createOrgNodeDto.level || 0;
    if (createOrgNodeDto.parent_node_id && !createOrgNodeDto.level) {
      const parent = await this.prisma.organizationalStructure.findUnique({
        where: { org_node_id: createOrgNodeDto.parent_node_id },
      });
      if (parent) {
        level = parent.level + 1;
      }
    }

    const node = await this.prisma.organizationalStructure.create({
      data: {
        node_name: createOrgNodeDto.node_name,
        node_type: createOrgNodeDto.node_type,
        parent_node_id: createOrgNodeDto.parent_node_id,
        level,
        is_active: createOrgNodeDto.is_active ?? true,
      },
      include: {
        parent: true,
        children: true,
        user_assignments: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
              },
            },
            position: true,
          },
        },
      },
    });

    // Log audit trail
    await this.logAuditTrail(
      createdBy,
      'CREATE_ORG_NODE',
      'organizational_structure',
      node.org_node_id,
      null,
      {
        node_name: node.node_name,
        node_type: node.node_type,
        parent_id: node.parent_node_id,
      },
    );

    this.logger.log(
      `Organization node created: ${node.node_name} (${node.node_type})`,
    );

    return new OrgNodeResponseDto(node);
  }

  async findAllNodes(
    page: number = 1,
    limit: number = 10,
    search?: string,
    nodeType?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { node_name: { contains: search, mode: 'insensitive' } },
        { node_type: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (nodeType) {
      where.node_type = nodeType;
    }

    const [nodes, total] = await Promise.all([
      this.prisma.organizationalStructure.findMany({
        where,
        skip,
        take: limit,
        include: {
          parent: true,
          children: true,
          user_assignments: {
            include: {
              user: {
                select: {
                  user_id: true,
                  full_name: true,
                  email: true,
                },
              },
              position: true,
            },
          },
        },
        orderBy: [{ level: 'asc' }, { node_name: 'asc' }],
      }),
      this.prisma.organizationalStructure.count({ where }),
    ]);

    return {
      data: nodes.map((node) => new OrgNodeResponseDto(node)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrganizationTree(
    options?: OrgTreeOptions,
  ): Promise<OrgNodeWithChildren[]> {
    const where: any = { parent_node_id: null };

    if (!options?.includeInactive) {
      where.is_active = true;
    }

    const rootNodes = await this.prisma.organizationalStructure.findMany({
      where,
      orderBy: { node_name: 'asc' },
    });

    const trees = await Promise.all(
      rootNodes.map((root) => this.buildTree(root.org_node_id, options)),
    );

    return trees;
  }

  private async buildTree(
    nodeId: number,
    options?: OrgTreeOptions,
    currentDepth: number = 0,
  ): Promise<OrgNodeWithChildren> {
    const node = await this.prisma.organizationalStructure.findUnique({
      where: { org_node_id: nodeId },
    });

    if (!node) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    if (options?.maxDepth && currentDepth >= options.maxDepth) {
      return {
        org_node_id: node.org_node_id,
        node_name: node.node_name,
        node_type: node.node_type,
        level: node.level,
        children: [],
      };
    }

    const childrenWhere: any = { parent_node_id: nodeId };
    if (!options?.includeInactive) {
      childrenWhere.is_active = true;
    }

    const children = await this.prisma.organizationalStructure.findMany({
      where: childrenWhere,
      orderBy: { node_name: 'asc' },
    });

    const childTrees = await Promise.all(
      children.map((child) =>
        this.buildTree(child.org_node_id, options, currentDepth + 1),
      ),
    );

    return {
      org_node_id: node.org_node_id,
      node_name: node.node_name,
      node_type: node.node_type,
      level: node.level,
      children: childTrees,
    };
  }

  async findNode(nodeId: number): Promise<OrgNodeResponseDto> {
    const node = await this.prisma.organizationalStructure.findUnique({
      where: { org_node_id: nodeId },
      include: {
        parent: {
          include: {
            parent: true,
          },
        },
        children: {
          where: { is_active: true },
          orderBy: { node_name: 'asc' },
        },
        user_assignments: {
          include: {
            user: {
              select: {
                user_id: true,
                full_name: true,
                email: true,
                profile_pic_url: true,
              },
            },
            position: true,
          },
        },
      },
    });

    if (!node) {
      throw new NotFoundException(`Node with ID ${nodeId} not found`);
    }

    return new OrgNodeResponseDto(node);
  }

  async updateNode(
    nodeId: number,
    updateOrgNodeDto: UpdateOrgNodeDto,
    updatedBy: number,
  ): Promise<OrgNodeResponseDto> {
    await this.findNode(nodeId);

    // Check for duplicate name at same level
    if (updateOrgNodeDto.node_name) {
      const node = await this.prisma.organizationalStructure.findUnique({
        where: { org_node_id: nodeId },
      });

      if (!node) {
        throw new NotFoundException(`Node ${nodeId} not found`);
      }

      const existingNode = await this.prisma.organizationalStructure.findFirst({
        where: {
          node_name: updateOrgNodeDto.node_name,
          parent_node_id: node.parent_node_id,
          org_node_id: { not: nodeId },
        },
      });

      if (existingNode) {
        throw new ConflictException(
          `Node "${updateOrgNodeDto.node_name}" already exists at this level`,
        );
      }
    }

    const updatedNode = await this.prisma.organizationalStructure.update({
      where: { org_node_id: nodeId },
      data: {
        node_name: updateOrgNodeDto.node_name,
        node_type: updateOrgNodeDto.node_type,
        is_active: updateOrgNodeDto.is_active,
      },
      include: {
        parent: true,
        children: true,
        user_assignments: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    // If deactivating, also deactivate all children? (Optional)
    if (updateOrgNodeDto.is_active === false) {
      await this.prisma.organizationalStructure.updateMany({
        where: { parent_node_id: nodeId },
        data: { is_active: false },
      });
      this.logger.warn(`Node ${nodeId} and its children deactivated`);
    }

    await this.logAuditTrail(
      updatedBy,
      'UPDATE_ORG_NODE',
      'organizational_structure',
      nodeId,
      null,
      updateOrgNodeDto,
    );

    this.logger.log(`Organization node updated: ${updatedNode.node_name}`);

    return new OrgNodeResponseDto(updatedNode);
  }

  async moveNode(
    nodeId: number,
    moveOrgNodeDto: MoveOrgNodeDto,
    movedBy: number,
  ): Promise<OrgNodeResponseDto> {
    const node = await this.findNode(nodeId);

    // Check for circular reference
    if (moveOrgNodeDto.new_parent_id) {
      const isCircular = await this.checkCircularReference(
        nodeId,
        moveOrgNodeDto.new_parent_id,
      );
      if (isCircular) {
        throw new BadRequestException('Cannot move node to its own descendant');
      }
    }

    // Calculate new level
    let newLevel = 0;
    if (moveOrgNodeDto.new_parent_id) {
      const parent = await this.prisma.organizationalStructure.findUnique({
        where: { org_node_id: moveOrgNodeDto.new_parent_id },
      });
      if (!parent) {
        throw new NotFoundException(
          `Parent node ${moveOrgNodeDto.new_parent_id} not found`,
        );
      }
      newLevel = parent.level + 1;
    }

    // Update node
    const updatedNode = await this.prisma.organizationalStructure.update({
      where: { org_node_id: nodeId },
      data: {
        parent_node_id: moveOrgNodeDto.new_parent_id || null,
        level: newLevel,
      },
      include: {
        parent: true,
        children: true,
        user_assignments: {
          include: {
            user: true,
            position: true,
          },
        },
      },
    });

    // Update levels of all descendants
    await this.updateDescendantLevels(nodeId, newLevel + 1);

    await this.logAuditTrail(
      movedBy,
      'MOVE_ORG_NODE',
      'organizational_structure',
      nodeId,
      { old_parent_id: node.parent_node_id, old_level: node.level },
      { new_parent_id: moveOrgNodeDto.new_parent_id, new_level: newLevel },
    );

    this.logger.log(
      `Organization node moved: ${node.node_name} to parent ${moveOrgNodeDto.new_parent_id}`,
    );

    return new OrgNodeResponseDto(updatedNode);
  }

  private async checkCircularReference(
    nodeId: number,
    targetParentId: number,
  ): Promise<boolean> {
    let currentId: number | null = targetParentId;
    while (currentId) {
      if (currentId === nodeId) {
        return true;
      }
      const parent = await this.prisma.organizationalStructure.findUnique({
        where: { org_node_id: currentId },
        select: { parent_node_id: true },
      });
      currentId = parent?.parent_node_id ?? null;
    }
    return false;
  }

  private async updateDescendantLevels(nodeId: number, newLevel: number) {
    const children = await this.prisma.organizationalStructure.findMany({
      where: { parent_node_id: nodeId },
    });

    for (const child of children) {
      await this.prisma.organizationalStructure.update({
        where: { org_node_id: child.org_node_id },
        data: { level: newLevel },
      });
      await this.updateDescendantLevels(child.org_node_id, newLevel + 1);
    }
  }

  async deleteNode(
    nodeId: number,
    deletedBy: number,
  ): Promise<{ message: string }> {
    const node = await this.findNode(nodeId);

    // Check if node has children
    const childrenCount = await this.prisma.organizationalStructure.count({
      where: { parent_node_id: nodeId },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        `Cannot delete node "${node.node_name}" because it has ${childrenCount} child node(s). Delete or move children first.`,
      );
    }

    // Check if node has user assignments
    const assignmentsCount = await this.prisma.userAssignment.count({
      where: { org_node_id: nodeId },
    });

    if (assignmentsCount > 0) {
      throw new BadRequestException(
        `Cannot delete node "${node.node_name}" because it has ${assignmentsCount} user assignment(s). Remove assignments first.`,
      );
    }

    await this.prisma.organizationalStructure.delete({
      where: { org_node_id: nodeId },
    });

    await this.logAuditTrail(
      deletedBy,
      'DELETE_ORG_NODE',
      'organizational_structure',
      nodeId,
      { node_name: node.node_name },
      null,
    );

    this.logger.log(`Organization node deleted: ${node.node_name}`);

    return { message: `Node "${node.node_name}" deleted successfully` };
  }

  // ==================== Positions ====================

  async createPosition(
    createPositionDto: CreatePositionDto,
    createdBy: number,
  ) {
    const existingPosition = await this.prisma.organizationPosition.findUnique({
      where: { position_name: createPositionDto.position_name },
    });

    if (existingPosition) {
      throw new ConflictException(
        `Position "${createPositionDto.position_name}" already exists`,
      );
    }

    const position = await this.prisma.organizationPosition.create({
      data: {
        position_name: createPositionDto.position_name,
        description: createPositionDto.description,
        hierarchy_rank: createPositionDto.hierarchy_rank,
      },
    });

    await this.logAuditTrail(
      createdBy,
      'CREATE_POSITION',
      'organization_positions',
      position.position_id,
      null,
      createPositionDto,
    );

    this.logger.log(`Position created: ${position.position_name}`);

    return position;
  }

  async findAllPositions(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (search) {
      where.OR = [
        { position_name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [positions, total] = await Promise.all([
      this.prisma.organizationPosition.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ hierarchy_rank: 'asc' }, { position_name: 'asc' }],
      }),
      this.prisma.organizationPosition.count({ where }),
    ]);

    return {
      data: positions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updatePosition(
    positionId: number,
    updatePositionDto: UpdatePositionDto,
    updatedBy: number,
  ) {
    const position = await this.prisma.organizationPosition.findUnique({
      where: { position_id: positionId },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    if (updatePositionDto.position_name) {
      const existing = await this.prisma.organizationPosition.findFirst({
        where: {
          position_name: updatePositionDto.position_name,
          position_id: { not: positionId },
        },
      });

      if (existing) {
        throw new ConflictException(
          `Position "${updatePositionDto.position_name}" already exists`,
        );
      }
    }

    const updatedPosition = await this.prisma.organizationPosition.update({
      where: { position_id: positionId },
      data: updatePositionDto,
    });

    await this.logAuditTrail(
      updatedBy,
      'UPDATE_POSITION',
      'organization_positions',
      positionId,
      position,
      updatedPosition,
    );

    return updatedPosition;
  }

  async deletePosition(positionId: number, deletedBy: number) {
    const position = await this.prisma.organizationPosition.findUnique({
      where: { position_id: positionId },
    });

    if (!position) {
      throw new NotFoundException(`Position with ID ${positionId} not found`);
    }

    // Check if position is in use
    const assignmentsCount = await this.prisma.userAssignment.count({
      where: { position_id: positionId },
    });

    if (assignmentsCount > 0) {
      throw new BadRequestException(
        `Cannot delete position "${position.position_name}" because it is assigned to ${assignmentsCount} user(s)`,
      );
    }

    await this.prisma.organizationPosition.delete({
      where: { position_id: positionId },
    });

    await this.logAuditTrail(
      deletedBy,
      'DELETE_POSITION',
      'organization_positions',
      positionId,
      position,
      null,
    );

    return {
      message: `Position "${position.position_name}" deleted successfully`,
    };
  }

  // ==================== User Assignments ====================

  async assignUserToNode(assignUserDto: AssignUserDto, assignedBy: number) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { user_id: assignUserDto.user_id, deleted_at: null },
    });

    if (!user) {
      throw new NotFoundException(
        `User with ID ${assignUserDto.user_id} not found`,
      );
    }

    // Check if node exists
    const node = await this.prisma.organizationalStructure.findUnique({
      where: { org_node_id: assignUserDto.org_node_id },
    });

    if (!node) {
      throw new NotFoundException(
        `Node with ID ${assignUserDto.org_node_id} not found`,
      );
    }

    // Check if position exists
    const position = await this.prisma.organizationPosition.findUnique({
      where: { position_id: assignUserDto.position_id },
    });

    if (!position) {
      throw new NotFoundException(
        `Position with ID ${assignUserDto.position_id} not found`,
      );
    }

    // Check if assignment already exists
    const existingAssignment = await this.prisma.userAssignment.findUnique({
      where: {
        user_id_org_node_id: {
          user_id: assignUserDto.user_id,
          org_node_id: assignUserDto.org_node_id,
        },
      },
    });

    if (existingAssignment) {
      throw new ConflictException('User is already assigned to this node');
    }

    // If this user is being set as node head, remove other heads
    if (assignUserDto.is_node_head) {
      await this.prisma.userAssignment.updateMany({
        where: {
          org_node_id: assignUserDto.org_node_id,
          is_node_head: true,
        },
        data: { is_node_head: false },
      });
    }

    const assignment = await this.prisma.userAssignment.create({
      data: {
        user_id: assignUserDto.user_id,
        org_node_id: assignUserDto.org_node_id,
        position_id: assignUserDto.position_id,
        is_primary: assignUserDto.is_primary ?? false,
        is_node_head: assignUserDto.is_node_head ?? false,
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        position: true,
        org_node: true,
      },
    });

    await this.logAuditTrail(
      assignedBy,
      'ASSIGN_USER_TO_NODE',
      'user_assignments',
      assignment.assignment_id,
      null,
      assignUserDto,
    );

    this.logger.log(
      `User ${user.email} assigned to ${node.node_name} as ${position.position_name}`,
    );

    return assignment;
  }

  async updateUserAssignment(
    assignmentId: number,
    updateData: Partial<AssignUserDto>,
    updatedBy: number,
  ) {
    const assignment = await this.prisma.userAssignment.findUnique({
      where: { assignment_id: assignmentId },
      include: {
        org_node: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} not found`,
      );
    }

    // If setting as node head, remove other heads
    if (updateData.is_node_head) {
      await this.prisma.userAssignment.updateMany({
        where: {
          org_node_id: assignment.org_node_id,
          is_node_head: true,
          assignment_id: { not: assignmentId },
        },
        data: { is_node_head: false },
      });
    }

    const updatedAssignment = await this.prisma.userAssignment.update({
      where: { assignment_id: assignmentId },
      data: {
        position_id: updateData.position_id,
        is_primary: updateData.is_primary,
        is_node_head: updateData.is_node_head,
      },
      include: {
        user: {
          select: {
            user_id: true,
            full_name: true,
            email: true,
          },
        },
        position: true,
        org_node: true,
      },
    });

    await this.logAuditTrail(
      updatedBy,
      'UPDATE_USER_ASSIGNMENT',
      'user_assignments',
      assignmentId,
      assignment,
      updatedAssignment,
    );

    return updatedAssignment;
  }

  async removeUserFromNode(assignmentId: number, removedBy: number) {
    const assignment = await this.prisma.userAssignment.findUnique({
      where: { assignment_id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(
        `Assignment with ID ${assignmentId} not found`,
      );
    }

    await this.prisma.userAssignment.delete({
      where: { assignment_id: assignmentId },
    });

    await this.logAuditTrail(
      removedBy,
      'REMOVE_USER_FROM_NODE',
      'user_assignments',
      assignmentId,
      assignment,
      null,
    );

    return { message: 'User removed from node successfully' };
  }

  async getNodeUsers(nodeId: number, page: number = 1, limit: number = 10) {
    await this.findNode(nodeId);

    const skip = (page - 1) * limit;

    const [assignments, total] = await Promise.all([
      this.prisma.userAssignment.findMany({
        where: { org_node_id: nodeId },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              full_name: true,
              email: true,
              phone: true,
              profile_pic_url: true,
              is_active: true,
            },
          },
          position: true,
        },
        orderBy: [
          { is_node_head: 'desc' },
          { is_primary: 'desc' },
          { assigned_at: 'asc' },
        ],
      }),
      this.prisma.userAssignment.count({
        where: { org_node_id: nodeId },
      }),
    ]);

    return {
      data: assignments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserNodes(userId: number) {
    const assignments = await this.prisma.userAssignment.findMany({
      where: { user_id: userId },
      include: {
        org_node: {
          include: {
            parent: true,
          },
        },
        position: true,
      },
      orderBy: [{ is_primary: 'desc' }, { assigned_at: 'desc' }],
    });

    return assignments;
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

  async getStatistics() {
    const [totalNodes, totalPositions, totalAssignments, nodesByType] =
      await Promise.all([
        this.prisma.organizationalStructure.count(),
        this.prisma.organizationPosition.count(),
        this.prisma.userAssignment.count(),
        this.prisma.organizationalStructure.groupBy({
          by: ['node_type'],
          _count: true,
        }),
      ]);

    return {
      total_nodes: totalNodes,
      total_positions: totalPositions,
      total_assignments: totalAssignments,
      nodes_by_type: nodesByType.map((n) => ({
        type: n.node_type,
        count: n._count,
      })),
    };
  }
}
