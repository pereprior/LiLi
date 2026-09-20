const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export class AuthEnvironmentValueUtils {
  static requireValue(value: string | undefined, name: string): string {
    if (value === undefined || value.trim() === '') {
      throw new Error(`${name} is required.`);
    }

    return value.trim();
  }

  static parseUrl(value: string | undefined, name: string): URL {
    const rawValue = this.requireValue(value, name);

    try {
      return new URL(rawValue);
    } catch {
      throw new Error(`${name} must be a valid URL.`);
    }
  }

  static parsePositiveInteger(value: string | undefined, name: string): number {
    const rawValue = this.requireValue(value, name);

    if (!/^\d+$/u.test(rawValue) || Number(rawValue) <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }

    return Number(rawValue);
  }

  static parseEmailList(value: string | undefined, name: string): Set<string> {
    const emails = (value ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter((email) => email !== '');

    for (const email of emails) {
      if (!EMAIL_PATTERN.test(email)) {
        throw new Error(`${name} contains an invalid email address.`);
      }
    }

    return new Set(emails);
  }
}
