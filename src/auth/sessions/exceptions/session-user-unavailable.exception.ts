import { SessionException } from '#src/auth/sessions/exceptions/session.exception.js';

export class SessionUserUnavailableException extends SessionException {
  constructor() {
    super('Cannot create a session for this user.');
    this.name = 'SessionUserUnavailableException';
  }
}
