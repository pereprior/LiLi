import { createHash, randomBytes } from 'node:crypto';

export class AuthSecretsUtils {
  static generate(): string {
    return randomBytes(32).toString('base64url');
  }

  static hash(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }
}
