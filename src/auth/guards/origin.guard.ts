import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { authConfig } from '#src/auth/config/auth.config.js';
import { IS_PUBLIC_KEY } from '#src/auth/decorators/public.decorator.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import type { AuthenticatedRequest } from '#src/auth/types/authenticated-request.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class OriginGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (SAFE_METHODS.has(request.method ?? '')) return true;

    const origin = request.headers.origin;
    if (origin !== undefined) {
      if (origin === this.config.appOrigin) return true;
      throw new ForbiddenException('Invalid request origin.');
    }

    const referer = request.headers.referer;
    try {
      if (referer && new URL(referer).origin === this.config.appOrigin) {
        return true;
      }
    } catch {
      // Invalid Referer is denied below.
    }

    throw new ForbiddenException('Invalid request origin.');
  }
}
