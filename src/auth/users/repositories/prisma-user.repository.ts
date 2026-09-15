import { Injectable } from '@nestjs/common';

import { UserEntity } from '@/auth/users/entities/user.entity.js';
import { UserMapper } from '@/auth/users/mappers/user.mapper.js';
import { UserRepository } from '@/auth/users/repositories/user.repository.js';
import { PrismaService } from '@/database/prisma.service.js';

@Injectable()
export class PrismaUserRepository extends UserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async create(user: UserEntity): Promise<UserEntity> {
    const record = await this.prisma.user.create({
      data: UserMapper.toCreateInput(user),
    });

    return UserMapper.toEntity(record);
  }

  override async findByUsername(username: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { username },
    });

    return record === null ? null : UserMapper.toEntity(record);
  }
}
