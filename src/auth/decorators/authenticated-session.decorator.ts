import { createParamDecorator, UnauthorizedException } from '@nestjs/common';

import type { AuthenticatedRequest } from '#src/auth/types/authenticated-request.js';
import type { AuthenticatedSession } from '#src/auth/types/authenticated-session.type.js';

export const Authenticated = createParamDecorator(
  (_data: unknown, context): AuthenticatedSession => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (!request.authenticatedUser || !request.sessionToken) {
      throw new UnauthorizedException();
    }

    return { user: request.authenticatedUser, token: request.sessionToken };
  },
);
