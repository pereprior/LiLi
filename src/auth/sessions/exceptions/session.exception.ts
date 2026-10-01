import { HttpException, HttpStatus } from '@nestjs/common';

export class SessionException extends HttpException {
  constructor(
    message = 'An unexpected error occurred while processing the session.',
    status = HttpStatus.INTERNAL_SERVER_ERROR,
  ) {
    super(message, status);
    this.name = 'SessionException';
  }
}
