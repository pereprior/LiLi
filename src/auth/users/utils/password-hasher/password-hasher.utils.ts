import { randomBytes, scrypt as scryptCallback } from 'node:crypto';

const HEX_ENCODING = 'hex';
const SALT_BYTE_LENGTH = 16;
const SCRYPT_KEY_LENGTH = 64;
const HASH_PARTS_SEPARATOR = ':';

export class PasswordHasherUtils {
  static async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTE_LENGTH).toString(HEX_ENCODING);
    const derivedKey = await this.scrypt(password, salt);

    return `${salt}${HASH_PARTS_SEPARATOR}${derivedKey.toString(HEX_ENCODING)}`;
  }

  private static scrypt(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scryptCallback(password, salt, SCRYPT_KEY_LENGTH, (error, derivedKey) => {
        if (error !== null) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      });
    });
  }
}
