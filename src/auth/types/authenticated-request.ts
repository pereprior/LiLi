import type { IncomingMessage } from 'node:http';

export interface AuthenticatedRequest extends IncomingMessage {
  authenticatedUser?: { uuid: string; email: string };
  sessionToken?: string;
}
