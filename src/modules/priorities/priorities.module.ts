import { Module } from '@nestjs/common';
import { PrioritiesController } from './priorities.controller';
import { PrioritiesService } from './priorities.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PrioritiesController],
  providers: [PrioritiesService, PrismaService],
  exports: [PrioritiesService],
})
export class PrioritiesModule {}
