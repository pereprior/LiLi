import { Module } from '@nestjs/common';

import { CompleteOidcLoginService } from '#src/auth/google-login/attempts/services/complete-oidc-login/complete-oidc-login.service.js';
import { StartOidcLoginService } from '#src/auth/google-login/attempts/services/start-oidc-login/start-oidc-login.service.js';
import { GoogleOidcClient } from '#src/auth/google-login/oidc/clients/google-oidc.client.js';
import { OpenidGoogleOidcClient } from '#src/auth/google-login/oidc/clients/openid-google-oidc.client.js';
import { SignInWithGoogleService } from '#src/auth/google-login/services/sign-in-with-google/sign-in-with-google.service.js';
import { SessionsModule } from '#src/auth/sessions/sessions.module.js';
import { DatabaseModule } from '#src/database/database.module.js';

@Module({
  imports: [DatabaseModule, SessionsModule],
  providers: [
    { provide: GoogleOidcClient, useClass: OpenidGoogleOidcClient },
    StartOidcLoginService,
    CompleteOidcLoginService,
    SignInWithGoogleService,
  ],
  exports: [
    StartOidcLoginService,
    CompleteOidcLoginService,
    SignInWithGoogleService,
  ],
})
export class GoogleLoginModule {}
