import { Module } from '@nestjs/common';

import { AuthClientIntegrationsModule } from '#src/auth/client-integrations/auth-client-integrations.module.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import { PrismaOidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/prisma-oidc-login-attempt.repository.js';
import { CompleteOidcLoginService } from '#src/auth/oidc-login-attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import { StartOidcLoginService } from '#src/auth/oidc-login-attempts/services/start-oidc-login/start-oidc-login.service.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [DatabaseModule, AuthClientIntegrationsModule],
  providers: [
    {
      provide: OidcLoginAttemptRepository,
      useClass: PrismaOidcLoginAttemptRepository,
    },
    StartOidcLoginService,
    CompleteOidcLoginService,
  ],
  exports: [StartOidcLoginService, CompleteOidcLoginService],
})
export class OidcLoginAttemptsModule {}
