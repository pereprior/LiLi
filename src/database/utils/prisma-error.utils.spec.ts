import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';

function prismaError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: '7.10.0',
  });
}

describe('PrismaErrorUtils', () => {
  it('recognizes a unique constraint violation', () => {
    expect(PrismaErrorUtils.isUniqueConstraintError(prismaError('P2002'))).toBe(
      true,
    );
  });

  it('rejects unrelated errors as unique constraint violations', () => {
    expect(PrismaErrorUtils.isUniqueConstraintError(prismaError('P2025'))).toBe(
      false,
    );
    expect(PrismaErrorUtils.isUniqueConstraintError(new Error('P2002'))).toBe(
      false,
    );
  });

  it('recognizes a missing database record', () => {
    expect(PrismaErrorUtils.isRecordNotFoundError(prismaError('P2025'))).toBe(
      true,
    );
  });

  it('rejects unrelated errors as missing records', () => {
    expect(PrismaErrorUtils.isRecordNotFoundError(prismaError('P2002'))).toBe(
      false,
    );
    expect(PrismaErrorUtils.isRecordNotFoundError(new Error('P2025'))).toBe(
      false,
    );
  });
});
