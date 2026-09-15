import { randomBytes, scrypt as scryptCallback } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import { PasswordHasher } from '@/auth/users/services/password-hasher/password-hasher.js';

const SCRYPT_KEY_LENGTH = 64;

const scrypt = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scryptCallback(password, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
      if (error !== null) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });

@Injectable()
export class ScryptPasswordHasher extends PasswordHasher {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = await scrypt(password, salt);

    return `${salt}:${derivedKey.toString('hex')}`;
  }
}
