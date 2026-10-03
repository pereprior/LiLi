import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';

describe('PrismaErrorUtils', () => {
  describe('isUniqueConstraintError', () => {
    it('recognizes a Prisma error with code P2002', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Database error', {
        code: 'P2002',
        clientVersion: '7.10.0',
      });

      const result = PrismaErrorUtils.isUniqueConstraintError(error);

      expect(result).toBe(true);
    });

    it.each([
      {
        reason: 'another Prisma error code',
        error: new Prisma.PrismaClientKnownRequestError('Database error', {
          code: 'P2025',
          clientVersion: '7.10.0',
        }),
      },
      {
        reason: 'a standard error mentioning the code',
        error: new Error('P2002'),
      },
      { reason: 'an object containing the code', error: { code: 'P2002' } },
      { reason: 'null', error: null },
      { reason: 'undefined', error: undefined },
    ])('returns false for $reason', ({ error }) => {
      const result = PrismaErrorUtils.isUniqueConstraintError(error);

      expect(result).toBe(false);
    });
  });

  describe('isRecordNotFoundError', () => {
    it('recognizes a Prisma error with code P2025', () => {
      const error = new Prisma.PrismaClientKnownRequestError('Database error', {
        code: 'P2025',
        clientVersion: '7.10.0',
      });

      const result = PrismaErrorUtils.isRecordNotFoundError(error);

      expect(result).toBe(true);
    });

    it.each([
      {
        reason: 'another Prisma error code',
        error: new Prisma.PrismaClientKnownRequestError('Database error', {
          code: 'P2002',
          clientVersion: '7.10.0',
        }),
      },
      {
        reason: 'a standard error mentioning the code',
        error: new Error('P2025'),
      },
      { reason: 'an object containing the code', error: { code: 'P2025' } },
      { reason: 'null', error: null },
      { reason: 'undefined', error: undefined },
    ])('returns false for $reason', ({ error }) => {
      const result = PrismaErrorUtils.isRecordNotFoundError(error);

      expect(result).toBe(false);
    });
  });
});
