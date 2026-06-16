import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'crypto';

@Injectable()
export class SystemTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.SYSTEM_API_TOKEN;
    const headers = context.switchToHttp().getRequest().headers;
    const authorization = headers.authorization;
    const supplied = typeof headers['x-system-token'] === 'string'
      ? headers['x-system-token']
      : typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')
        ? authorization.slice(7).trim()
        : undefined;
    if (!expected || typeof supplied !== 'string') throw new UnauthorizedException('SYSTEM_TOKEN_REQUIRED');
    const a = Buffer.from(expected);
    const b = Buffer.from(supplied);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new UnauthorizedException('INVALID_SYSTEM_TOKEN');
    return true;
  }
}
