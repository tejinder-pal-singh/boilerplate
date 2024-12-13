import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): string {
    // Use IP address as the tracker
    return req.ips.length ? req.ips[0] : req.ip;
  }
}
