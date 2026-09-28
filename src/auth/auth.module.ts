import { Module } from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { OpenidGoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/openid-google-oidc.client.js';
import { CompleteOidcLoginService } from '#src/auth/oidc-login-attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import { StartOidcLoginService } from '#src/auth/oidc-login-attempts/services/start-oidc-login/start-oidc-login.service.js';
import { CreateSessionService } from '#src/auth/sessions/services/create-session/create-session.service.js';
import { RevokeSessionService } from '#src/auth/sessions/services/revoke-session/revoke-session.service.js';
import { ValidateSessionService } from '#src/auth/sessions/services/validate-session/validate-session.service.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: GoogleOidcClient, useClass: OpenidGoogleOidcClient },
    StartOidcLoginService,
    CompleteOidcLoginService,
    CreateSessionService,
    ValidateSessionService,
    RevokeSessionService,
  ],
})
export class AuthModule {}
