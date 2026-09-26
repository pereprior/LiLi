import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { AuthSecretsUtils } from '#src/auth/common/utils/auth-secrets.utils.js';

describe('AuthSecretsUtils', () => {
  it('generates independent 256-bit base64url secrets', () => {
    const first = AuthSecretsUtils.generate();
    const second = AuthSecretsUtils.generate();

    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(second).not.toBe(first);
  });

  it('hashes secrets with SHA-256', () => {
    expect(AuthSecretsUtils.hash('secret')).toBe(
      createHash('sha256').update('secret').digest('hex'),
    );
  });
});
