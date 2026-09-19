import { Injectable } from '@nestjs/common';

import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserException } from '@/auth/users/exceptions/user.exception.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { AppLogger } from '@/logging/app-logger.js';
import { LoggerContext } from '@/logging/logger-context.enum.js';

@Injectable()
export class ListUsersService {
  private readonly logger = new AppLogger(LoggerContext.LIST_USERS_SERVICE);

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
