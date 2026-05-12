import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { role_name: 'super_admin' },
      update: {},
      create: {
        role_name: 'super_admin',
        description: 'Full system access',
      },
    }),
    prisma.role.upsert({
      where: { role_name: 'admin' },
      update: {},
      create: {
        role_name: 'admin',
        description: 'Administrative access',
      },
    }),
    prisma.role.upsert({
      where: { role_name: 'manager' },
      update: {},
      create: {
        role_name: 'manager',
        description: 'Department/Division manager',
      },
    }),
    prisma.role.upsert({
      where: { role_name: 'team_lead' },
      update: {},
      create: {
        role_name: 'team_lead',
        description: 'Team leader',
      },
    }),
    prisma.role.upsert({
      where: { role_name: 'employee' },
      update: {},
      create: {
        role_name: 'employee',
        description: 'Regular employee',
      },
    }),
  ]);

  // Create permissions
  const permissions = [
    // User management
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },

    // Role management
    { resource: 'roles', action: 'create' },
    { resource: 'roles', action: 'read' },
    { resource: 'roles', action: 'update' },
    { resource: 'roles', action: 'delete' },

    // Communication
    { resource: 'messages', action: 'send' },
    { resource: 'messages', action: 'read' },
    { resource: 'conversations', action: 'create' },
    { resource: 'conversations', action: 'delete' },

    // Tasks
    { resource: 'tasks', action: 'create' },
    { resource: 'tasks', action: 'assign' },
    { resource: 'tasks', action: 'update' },
    { resource: 'tasks', action: 'delete' },

    // Notices
    { resource: 'notices', action: 'create' },
    { resource: 'notices', action: 'publish' },
    { resource: 'notices', action: 'delete' },

    // Forum
    { resource: 'forum', action: 'create_topic' },
    { resource: 'forum', action: 'moderate' },
    { resource: 'forum', action: 'delete' },

    // Resources
    { resource: 'resources', action: 'upload' },
    { resource: 'resources', action: 'download' },
    { resource: 'resources', action: 'delete' },

    // Reports
    { resource: 'reports', action: 'generate' },
    { resource: 'reports', action: 'export' },
    // Permission management
    { resource: 'permissions', action: 'read' },
    { resource: 'permissions', action: 'assign' },
    { resource: 'permissions', action: 'revoke' },
    { resource: 'permissions', action: 'de-activate' },
    { resource: 'permissions', action: 'activate' },
    { resource: 'notices', action: 'create' },
    { resource: 'notices', action: 'read' },
    { resource: 'notices', action: 'update' },
    { resource: 'notices', action: 'delete' },
    { resource: 'notices', action: 'publish' },
    { resource: 'notices', action: 'archive' },
    { resource: 'notices', action: 'schedule' },
    { resource: 'notices', action: 'manage_categories' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { permission_name: `${perm.resource}:${perm.action}` },
      update: {},
      create: {
        permission_name: `${perm.resource}:${perm.action}`,
        resource: perm.resource,
        action: perm.action,
      },
    });
  }

  // Assign permissions to roles
  const superAdminRole = await prisma.role.findUnique({
    where: { role_name: 'super_admin' },
  });
  const allPermissions = await prisma.permission.findMany();

  if (superAdminRole) {
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: superAdminRole.role_id,
            permission_id: permission.permission_id,
          },
        },
        update: {},
        create: {
          role_id: superAdminRole.role_id,
          permission_id: permission.permission_id,
        },
      });
    }
  }

  // Create super admin user
  const hashedPassword = await bcrypt.hash('Admin@123456', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@aic.et' },
    update: {},
    create: {
      full_name: 'System Administrator',
      email: 'admin@aic.et',
      password: hashedPassword,
      is_active: true,
    },
  });

  // Assign super admin role
  if (superAdminRole) {
    await prisma.userRole.upsert({
      where: {
        user_id_role_id: {
          user_id: superAdmin.user_id,
          role_id: superAdminRole.role_id,
        },
      },
      update: {},
      create: {
        user_id: superAdmin.user_id,
        role_id: superAdminRole.role_id,
      },
    });
  }

  // Create statuses
  const statuses = [
    { status_name: 'pending', category: 'task' },
    { status_name: 'in_progress', category: 'task' },
    { status_name: 'completed', category: 'task' },
    { status_name: 'cancelled', category: 'task' },
    { status_name: 'draft', category: 'notice' },
    { status_name: 'published', category: 'notice' },
    { status_name: 'archived', category: 'notice' },
  ];

  for (const status of statuses) {
    await prisma.status.upsert({
      where: { status_name: status.status_name },
      update: {},
      create: status,
    });
  }

  // Create priorities
  const priorities = [
    {
      priority_level: 'critical',
      color_code: '#E53E3E',
      sort_order: 1,
      response_time_hrs: 1,
    },
    {
      priority_level: 'high',
      color_code: '#ED8936',
      sort_order: 2,
      response_time_hrs: 4,
    },
    {
      priority_level: 'medium',
      color_code: '#ECC94B',
      sort_order: 3,
      response_time_hrs: 24,
    },
    {
      priority_level: 'low',
      color_code: '#48BB78',
      sort_order: 4,
      response_time_hrs: 48,
    },
  ];

  for (const priority of priorities) {
    await prisma.priority.upsert({
      where: { priority_level: priority.priority_level },
      update: {},
      create: priority,
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
