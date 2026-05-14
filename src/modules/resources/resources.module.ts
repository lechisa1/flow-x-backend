import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { PrismaService } from 'src/prisma/prisma.service';
@Module({
  controllers: [ResourcesController],
  providers: [ResourcesService, PrismaService],
  exports: [ResourcesService],
})
export class ResourcesModule {}
