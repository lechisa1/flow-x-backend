import { Module } from '@nestjs/common';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { NoticeSchedulerService } from './scheduler/notice-scheduler.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [NoticesController],
  providers: [NoticesService, NoticeSchedulerService, PrismaService],
  exports: [NoticesService],
})
export class NoticesModule {}
