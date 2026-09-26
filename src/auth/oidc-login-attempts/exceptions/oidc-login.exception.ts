import { BadRequestException } from '@nestjs/common';

export class OidcLoginException extends BadRequestException {
  constructor() {
    super('Invalid or expired OIDC login attempt.');
  }
}
