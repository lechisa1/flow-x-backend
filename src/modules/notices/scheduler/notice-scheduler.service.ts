import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class NoticeSchedulerService {
  private readonly logger = new Logger(NoticeSchedulerService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async processScheduledNotices() {
    this.logger.log('Checking for scheduled notices...');

    const publishedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'published', category: 'notice' },
    });

    const archivedStatus = await this.prisma.status.findFirst({
      where: { status_name: 'archived', category: 'notice' },
    });

    if (!publishedStatus || !archivedStatus) {
      this.logger.error('Required statuses not found');
      return;
    }

    // Publish scheduled notices
    const scheduledNotices = await this.prisma.notice.findMany({
      where: {
        scheduled_publish_at: { lte: new Date() },
        published_at: null,
        deleted_at: null,
      },
    });

    for (const notice of scheduledNotices) {
      await this.prisma.notice.update({
        where: { notice_id: notice.notice_id },
        data: {
          status_id: publishedStatus.status_id,
          published_at: new Date(),
          scheduled_publish_at: null,
        },
      });
      this.logger.log(`Published scheduled notice: ${notice.title}`);
    }

    // Archive expired notices
    const expiredNotices = await this.prisma.notice.findMany({
      where: {
        expires_at: { lt: new Date() },
        status_id: publishedStatus.status_id,
        deleted_at: null,
      },
    });

    for (const notice of expiredNotices) {
      await this.prisma.notice.update({
        where: { notice_id: notice.notice_id },
        data: {
          status_id: archivedStatus.status_id,
        },
      });
      this.logger.log(`Archived expired notice: ${notice.title}`);
    }

    if (scheduledNotices.length === 0 && expiredNotices.length === 0) {
      this.logger.log('No notices to process');
    }
  }
}
