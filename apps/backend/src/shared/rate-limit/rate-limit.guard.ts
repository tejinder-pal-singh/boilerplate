import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class RateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip;
  }

  protected getTrackerCustomKey(context: ExecutionContext): string {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    return user ? `${req.ip}-${user.id}` : req.ip;
  }

  protected errorMessage = 'Too many requests. Please try again later.';
}
