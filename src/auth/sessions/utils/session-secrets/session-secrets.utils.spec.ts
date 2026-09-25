import { createHash } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { SessionSecretsUtils } from '#src/auth/sessions/utils/session-secrets/session-secrets.utils.js';

describe('SessionSecretsUtils', () => {
  it('generates independent 256-bit base64url secrets', () => {
    const first = SessionSecretsUtils.generate();
    const second = SessionSecretsUtils.generate();

    expect(Buffer.from(first, 'base64url')).toHaveLength(32);
    expect(first).toMatch(/^[A-Za-z0-9_-]+$/u);
    expect(second).not.toBe(first);
  });

  it('hashes secrets with SHA-256', () => {
    expect(SessionSecretsUtils.hash('secret')).toBe(
      createHash('sha256').update('secret').digest('hex'),
    );
  });
});
