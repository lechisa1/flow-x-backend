import { Module } from '@nestjs/common';
import { CommunicationService } from './communication.service';
import { CommunicationController } from './communication.controller';
import { ChatGateway } from './gateways/chat.gateway';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [CommunicationController],
  providers: [
    CommunicationService,
    ChatGateway,
    PrismaService,
    AuthService,
    JwtService,
    ConfigService,
  ],
  exports: [CommunicationService],
})
export class CommunicationModule {}
