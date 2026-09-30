import { Injectable, type PipeTransform } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

export class CookieWriter {
  constructor(
    private readonly adapter: HttpAdapterHost['httpAdapter'],
    private readonly response: unknown,
  ) {}

  set(
    name: string,
    value: string,
    maxAgeSeconds: number,
    secure: boolean,
  ): void {
    this.adapter.setCookie(this.response, name, value, {
      maxAge: maxAgeSeconds,
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
    });
  }

  clear(name: string, secure: boolean): void {
    this.adapter.clearCookie(this.response, name, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure,
    });
  }
}

@Injectable()
export class CookieWriterPipe implements PipeTransform<unknown, CookieWriter> {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  transform(response: unknown): CookieWriter {
    return new CookieWriter(this.adapterHost.httpAdapter, response);
  }
}
