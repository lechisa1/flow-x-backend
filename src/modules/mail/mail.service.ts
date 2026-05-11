// mail/mail.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendPasswordResetEmail(
    to: string,
    resetLink: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Password Reset Request',
        html: `
          <h2>Password Reset Request</h2>
          <p>You requested a password reset for your account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          ${ipAddress ? `<p>Request from IP: ${ipAddress}</p>` : ''}
          <p>If you didn't request this, please ignore this email.</p>
        `,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendPasswordChangeNotification(
    to: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Password Changed Successfully',
        html: `
          <h2>Password Changed</h2>
          <p>Your password has been successfully changed.</p>
          ${ipAddress ? `<p>Changed from IP: ${ipAddress}</p>` : ''}
          <p>If you didn't make this change, please contact support immediately.</p>
        `,
      });
      this.logger.log(`Password change notification sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send notification to ${to}:`, error);
    }
  }

  async testEmail() {
    try {
      await this.mailerService.sendMail({
        to: 'lechisedo123@gmail.com',
        subject: 'SMTP Test',
        text: 'If you receive this, SMTP is configured correctly!',
      });
      this.logger.log('Test email sent successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to send test email:', error.message);
      return false;
    }
  }
}
