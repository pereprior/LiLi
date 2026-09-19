import { HttpStatus } from '@nestjs/common';

import { UserException } from '#src/auth/users/exceptions/user.exception.js';

export class UserNotFoundException extends UserException {
  constructor() {
    super('User not found.', HttpStatus.NOT_FOUND);
  }
}
