import { HttpException, HttpStatus } from '@nestjs/common';

export class UserException extends HttpException {
  constructor(
    message = 'An unexpected error occurred while processing the user.',
    status = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
  }
}
