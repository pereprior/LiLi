import { describe, expect, it } from 'vitest';

import { AuthSecretsUtils } from '#src/auth/utils/auth-secrets/auth-secrets.utils.js';

describe('AuthSecretsUtils', () => {
  describe('generate', () => {
    it('returns a secret containing 256 bits', () => {
      const secret = AuthSecretsUtils.generate();

      expect(Buffer.from(secret, 'base64url')).toHaveLength(32);
    });

    it('encodes secrets as unpadded base64url', () => {
      const secret = AuthSecretsUtils.generate();

      expect(secret).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    });

    it('generates a different secret on subsequent calls', () => {
      const first = AuthSecretsUtils.generate();
      const second = AuthSecretsUtils.generate();

      expect(second).not.toBe(first);
    });
  });

  describe('hash', () => {
    it('returns the SHA-256 hexadecimal digest of the secret', () => {
      const hash = AuthSecretsUtils.hash('secret');

      expect(hash).toBe(
        '2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b',
      );
    });
  });
});
