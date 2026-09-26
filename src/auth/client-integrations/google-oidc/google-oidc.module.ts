import { Module } from '@nestjs/common';

import { GoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/google-oidc.client.js';
import { OpenidGoogleOidcClient } from '#src/auth/client-integrations/google-oidc/clients/openid-google-oidc.client.js';

@Module({
  providers: [
    {
      provide: GoogleOidcClient,
      useClass: OpenidGoogleOidcClient,
    },
  ],
  exports: [GoogleOidcClient],
})
export class GoogleOidcModule {}
