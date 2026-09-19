import { Injectable } from '@nestjs/common';

import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '#src/auth/users/exceptions/user-not-found.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { UserLoggerContext } from '#src/auth/users/types/enum/user-logger-context.enum.js';
import { DeleteResponse } from '#src/common/responses/delete.response.js';
import { PrismaErrorUtils } from '#src/database/utils/prisma-error.utils.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class DeleteUserService {
  private readonly logger = new AppLogger(
    UserLoggerContext.DELETE_USER_SERVICE,
  );

  constructor(private readonly userRepository: UserRepository) {}

  async execute(uuid: string): Promise<DeleteResponse> {
    this.logger.log('Deleting user.');

    try {
      await this.userRepository.delete(uuid);

      this.logger.log('User deleted successfully.');

      return new DeleteResponse(true);
    } catch (error) {
      this.logger.error(
        'Failed to delete user.',
        error instanceof Error ? error : undefined,
      );

      if (error instanceof UserException) {
        throw error;
      }

      if (PrismaErrorUtils.isRecordNotFoundError(error)) {
        throw new UserNotFoundException();
      }

      throw new UserException();
    }
  }
}
