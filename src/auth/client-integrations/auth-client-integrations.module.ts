import { Module } from '@nestjs/common';

import { GoogleOidcModule } from '#src/auth/client-integrations/google-oidc/google-oidc.module.js';

@Module({
  imports: [GoogleOidcModule],
  exports: [GoogleOidcModule],
})
export class AuthClientIntegrationsModule {}
