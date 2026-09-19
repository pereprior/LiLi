import { Injectable } from '@nestjs/common';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserException } from '#src/auth/users/exceptions/user.exception.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import { UserLoggerContext } from '#src/auth/users/types/enum/user-logger-context.enum.js';
import { AppLogger } from '#src/logging/app-logger.js';

@Injectable()
export class ListUsersService {
  private readonly logger = new AppLogger(UserLoggerContext.LIST_USERS_SERVICE);

  constructor(private readonly userRepository: UserRepository) {}

  async execute(): Promise<UserEntity[]> {
    this.logger.log('Listing users.');

    try {
      const users = await this.userRepository.findAll();

      this.logger.log('Users listed successfully.');

      return users;
    } catch (error) {
      this.logger.error(
        'Failed to list users.',
        error instanceof Error ? error : undefined,
      );

      throw new UserException();
    }
  }
}
