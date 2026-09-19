import { Injectable } from '@nestjs/common';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserNotFoundException } from '#src/auth/users/exceptions/user-not-found.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { UserLoggerContext } from '#src/auth/users/types/enum/user-logger-context.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class FindUserService {
  private readonly logger = new AppLogger(UserLoggerContext.FIND_USER_SERVICE);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(uuid: string): Promise<UserEntity> {
    this.logger.log('Finding user.');

    try {
      const user = await this.userRepository.findByUuid(uuid);

      if (!user) {
        throw new UserNotFoundException();
      }

      this.logger.log('User found successfully.');

      return user;
    } catch (error) {
      this.logger.error(
        'Failed to find user.',
        error instanceof Error ? error : undefined,
      );

      if (error instanceof UserException) {
        throw error;
      }

      throw new UserException();
    }
  }
}
