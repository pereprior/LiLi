import { scryptSync } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { PasswordHasherUtils } from '@/auth/users/utils/password-hasher/password-hasher.utils.js';

describe('PasswordHasherUtils', () => {
  const HASH_PARTS_SEPARATOR = ':';
  const SCRYPT_KEY_LENGTH = 64;
  const HEX_ENCODING = 'hex';

  it('derives the hash from the password and generated salt with scrypt', async () => {
    const password = 'a-secure-password';

    const passwordHash = await PasswordHasherUtils.hash(password);
    const [salt = '', hash] = passwordHash.split(HASH_PARTS_SEPARATOR);
    const expectedHash = scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString(
      HEX_ENCODING,
    );

    expect(hash).toBe(expectedHash);
  });

  it('uses a distinct salt for each hash', async () => {
    const password = 'a-secure-password';

    const [firstHash, secondHash] = await Promise.all([
      PasswordHasherUtils.hash(password),
      PasswordHasherUtils.hash(password),
    ]);

    expect(firstHash).not.toBe(secondHash);
  });
});
