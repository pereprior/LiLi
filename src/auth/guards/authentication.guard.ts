import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { authConfig } from '#src/auth/config/auth.config.js';
import { IS_PUBLIC_KEY } from '#src/auth/decorators/public.decorator.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import type { AuthConfig } from '#src/auth/types/auth-config.type.js';
import type { AuthenticatedRequest } from '#src/auth/types/authenticated-request.js';
import { AuthCookiesUtils } from '#src/auth/utils/auth-cookies/auth-cookies.utils.js';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly validateSession: ValidateSessionService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = AuthCookiesUtils.read(
      request.headers.cookie,
      AuthCookiesUtils.nameFor('session', this.config.cookieSecure),
    );
    if (!token) throw new UnauthorizedException();

    const user = await this.validateSession.execute(token);
    if (!user) throw new UnauthorizedException();

    request.authenticatedUser = { uuid: user.userUuid, email: user.email };
    request.sessionToken = token;
    return true;
  }
}
