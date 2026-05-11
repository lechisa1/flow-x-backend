import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    return Promise.resolve(req.ips.length ? req.ips[0] : req.ip);
  }

  protected async handleRequest(requestProps: any): Promise<boolean> {
    const { context, limit, ttl } = requestProps;
    const req = context.switchToHttp().getRequest();
    const key = await this.getTracker(req);
    const { totalHits } = await this.storageService.increment(
      key,
      ttl,
      limit,
      0,
      'default',
    );

    if (totalHits > limit) {
      throw new Error('Too many requests');
    }

    return true;
  }
}
