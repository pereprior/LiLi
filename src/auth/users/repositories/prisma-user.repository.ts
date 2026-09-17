import { Injectable } from '@nestjs/common';

import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserMapper } from '@/auth/users/mappers/user.mapper.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import type { CreateUserData } from '@/auth/users/types/data/create-user.data.js';
import { PrismaService } from '@/database/prisma.service.js';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async create(data: CreateUserData): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data,
    });
    return UserMapper.toEntity(record);
  }
}
