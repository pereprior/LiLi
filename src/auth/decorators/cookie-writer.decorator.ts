import { createParamDecorator } from '@nestjs/common';

import { CookieWriterPipe } from '#src/auth/pipes/cookie-writer.pipe.js';

const response = createParamDecorator((_data: unknown, context): unknown =>
  context.switchToHttp().getResponse(),
);

export const ResponseCookies = (): ParameterDecorator =>
  response(CookieWriterPipe);
