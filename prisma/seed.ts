// prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  try {
    // Create default roles
    console.log('📝 Creating roles...');

    const superAdminRole = await prisma.role.upsert({
      where: { role_name: 'super_admin' },
      update: {},
      create: {
        role_name: 'super_admin',
        description: 'Full system access',
      },
    });

    const adminRole = await prisma.role.upsert({
      where: { role_name: 'admin' },
      update: {},
      create: {
        role_name: 'admin',
        description: 'Administrative access',
      },
    });

    const managerRole = await prisma.role.upsert({
      where: { role_name: 'manager' },
      update: {},
      create: {
        role_name: 'manager',
        description: 'Department/Division manager',
      },
    });

    const teamLeadRole = await prisma.role.upsert({
      where: { role_name: 'team_lead' },
      update: {},
      create: {
        role_name: 'team_lead',
        description: 'Team leader',
      },
    });

    const employeeRole = await prisma.role.upsert({
      where: { role_name: 'employee' },
      update: {},
      create: {
        role_name: 'employee',
        description: 'Regular employee',
      },
    });

    console.log('✅ Roles created');

    // Create permissions (simplified for testing)
    console.log('📝 Creating permissions...');

    const basicPermissions = [
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
      //here are the communication permissions
      { resource: 'chat', action: 'create' },
      { resource: 'chat', action: 'read' },
      { resource: 'chat', action: 'send' },
      { resource: 'chat', action: 'manage' },
      { resource: 'chat', action: 'request' },
      { resource: 'chat', action: 'respond' },
      { resource: 'chat', action: 'block' },
      { resource: 'chat', action: 'unblock' },
      { resource: 'chat', action: 'pin' },
      { resource: 'chat', action: 'unpin' },
      { resource: 'chat', action: 'delete' },
      // Resource management permissions
      { resource: 'resources', action: 'create' },
      { resource: 'resources', action: 'read' },
      { resource: 'resources', action: 'update' },
      { resource: 'resources', action: 'delete' },
      { resource: 'resources', action: 'download' },
      { resource: 'resources', action: 'manage_categories' },
    ];

    for (const perm of basicPermissions) {
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
    console.log('✅ Permissions created');

    // Create statuses
    console.log('📝 Creating statuses...');

    const taskStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    const noticeStatuses = ['draft', 'published', 'archived'];

    for (const status of taskStatuses) {
      await prisma.status.upsert({
        where: { status_name: status },
        update: {},
        create: {
          status_name: status,
          category: 'task',
        },
      });
    }

    for (const status of noticeStatuses) {
      await prisma.status.upsert({
        where: { status_name: status },
        update: {},
        create: {
          status_name: status,
          category: 'notice',
        },
      });
    }
    console.log('✅ Statuses created');

    // Create priorities
    console.log('📝 Creating priorities...');

    const priorities = [
      { level: 'critical', color: '#E53E3E', order: 1, hours: 1 },
      { level: 'high', color: '#ED8936', order: 2, hours: 4 },
      { level: 'medium', color: '#ECC94B', order: 3, hours: 24 },
      { level: 'low', color: '#48BB78', order: 4, hours: 48 },
    ];

    for (const p of priorities) {
      await prisma.priority.upsert({
        where: { priority_level: p.level },
        update: {},
        create: {
          priority_level: p.level,
          color_code: p.color,
          sort_order: p.order,
          response_time_hrs: p.hours,
        },
      });
    }
    console.log('✅ Priorities created');

    // Create conversation types
    console.log('📝 Creating conversation types...');

    const conversationTypes = [
      { name: 'direct', desc: 'One-on-one private conversation' },
      { name: 'group', desc: 'Group conversation with multiple participants' },
      { name: 'node', desc: 'Conversation for organizational node members' },
      { name: 'project', desc: 'Project-specific conversation' },
    ];

    for (const ct of conversationTypes) {
      await prisma.conversationType.upsert({
        where: { type_name: ct.name },
        update: {},
        create: {
          type_name: ct.name,
          description: ct.desc,
        },
      });
    }
    console.log('✅ Conversation types created');

    // Create notice categories
    console.log('📝 Creating notice categories...');

    const noticeCategories = ['Announcement', 'Policy', 'Event', 'General'];
    for (const category of noticeCategories) {
      await prisma.noticeCategory.upsert({
        where: { category_name: category },
        update: {},
        create: {
          category_name: category,
        },
      });
    }
    console.log('✅ Notice categories created');

    // Create task types
    console.log('📝 Creating task types...');

    const taskTypes = [
      'Development',
      'Bug Fix',
      'Documentation',
      'Review',
      'Meeting',
    ];
    for (const type of taskTypes) {
      await prisma.taskType.upsert({
        where: { type_name: type },
        update: {},
        create: {
          type_name: type,
          is_active: true,
        },
      });
    }
    console.log('✅ Task types created');

    // Create resource categories
    console.log('📝 Creating resource categories...');

    const resourceCategories = [
      {
        name: 'Policies',
        desc: 'Company policies and procedures',
        icon: '📋',
        order: 1,
      },
      {
        name: 'Guidelines',
        desc: 'Best practices and guidelines',
        icon: '📖',
        order: 2,
      },
      {
        name: 'Templates',
        desc: 'Document and code templates',
        icon: '📄',
        order: 3,
      },
      {
        name: 'Technical Docs',
        desc: 'Technical documentation',
        icon: '⚙️',
        order: 4,
      },
      {
        name: 'Standards',
        desc: 'Organizational standards',
        icon: '⭐',
        order: 5,
      },
    ];

    for (const cat of resourceCategories) {
      await prisma.resourceCategory.upsert({
        where: { category_name: cat.name },
        update: {},
        create: {
          category_name: cat.name,
          description: cat.desc,
          icon: cat.icon,
          sort_order: cat.order,
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
    console.log('✅ Resource categories created');

    // Create super admin user
    console.log('📝 Creating super admin user...');

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
    console.log('✅ Super admin user created');

    // Assign super admin role
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
    console.log('✅ Role assigned to super admin');

    console.log('\n🎉 Seeding completed successfully!');
    console.log('📧 Admin email: admin@aic.et');
    console.log('🔑 Admin password: Admin@123456');
    console.log('\n💡 You can now log in with these credentials.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
