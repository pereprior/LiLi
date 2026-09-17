import { Prisma } from '@prisma/client';

export class PrismaErrorUtils {
  static isUniqueConstraintError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    );
  }
}
