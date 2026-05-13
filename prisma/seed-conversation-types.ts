import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedConversationTypes() {
  console.log('🌱 Seeding conversation types...');

  const conversationTypes = [
    {
      type_name: 'direct',
      description: 'One-on-one private conversation between two users',
    },
    {
      type_name: 'group',
      description: 'Group conversation with multiple participants',
    },
    {
      type_name: 'node',
      description: 'Conversation for all members of an organizational node',
    },
    { type_name: 'project', description: 'Project-specific conversation' },
  ];

  for (const type of conversationTypes) {
    await prisma.conversationType.upsert({
      where: { type_name: type.type_name },
      update: {},
      create: type,
    });
    console.log(`✅ Created/Updated: ${type.type_name}`);
  }

  console.log('🎉 Conversation types seeded successfully!');
}

seedConversationTypes()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
