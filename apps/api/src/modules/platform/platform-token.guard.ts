import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class PlatformTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.PLATFORM_ADMIN_TOKEN;
    const supplied = context.switchToHttp().getRequest().headers['x-platform-token'];
    if (!expected || typeof supplied !== 'string') throw new UnauthorizedException('PLATFORM_TOKEN_REQUIRED');
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('INVALID_PLATFORM_TOKEN');
    return true;
  }
}
