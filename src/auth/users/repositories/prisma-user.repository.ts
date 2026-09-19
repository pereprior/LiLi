import { Injectable } from '@nestjs/common';

import { UserEntity } from '#src/auth/users/entities/user.entity.js';
import { UserMapper } from '#src/auth/users/mappers/user.mapper.js';
import { UserRepository } from '#src/auth/users/repositories/user.repository.js';
import type { CreateUserData } from '#src/auth/users/types/data/create-user.data.js';
import type { UpdateUserData } from '#src/auth/users/types/data/update-user.data.js';
import { PrismaService } from '#src/database/prisma.service.js';

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

  override async findAll(): Promise<UserEntity[]> {
    const records = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return UserMapper.toListEntity(records);
  }

  override async findByUuid(uuid: string): Promise<UserEntity | null> {
    const record = await this.prisma.user.findUnique({
      where: { uuid },
    });

    return record ? UserMapper.toEntity(record) : null;
  }

  override async update(
    uuid: string,
    data: UpdateUserData,
  ): Promise<UserEntity> {
    const record = await this.prisma.user.update({
      where: { uuid },
      data,
    });

    return UserMapper.toEntity(record);
  }

  override async delete(uuid: string): Promise<void> {
    await this.prisma.user.delete({
      where: { uuid },
    });
  }
}
