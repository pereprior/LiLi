import { BadRequestException } from '@nestjs/common';

export class InternalReturnPathUtils {
  static validate(value: string | undefined, appOrigin: string): string {
    if (value === undefined) return '/';

    if (
      !value.startsWith('/') ||
      value.startsWith('//') ||
      /[\\\u0000-\u001f\u007f]/u.test(value)
    ) {
      throw new BadRequestException('Invalid return path.');
    }

    try {
      const parsed = new URL(value, appOrigin);
      if (parsed.origin !== appOrigin) {
        throw new BadRequestException('Invalid return path.');
      }
    } catch {
      throw new BadRequestException('Invalid return path.');
    }

    return value;
  }
}
