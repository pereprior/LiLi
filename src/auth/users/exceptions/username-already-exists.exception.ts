import { HttpStatus } from '@nestjs/common';

import { UserException } from '#src/auth/users/exceptions/user.exception.js';

export class UsernameAlreadyExistsException extends UserException {
  constructor() {
    super('A user with this username already exists.', HttpStatus.CONFLICT);
  }
}
