import { Injectable } from '@nestjs/common';

import type { OidcLoginAttemptEntity } from '#src/auth/oidc-login-attempts/entities/oidc-login-attempt.entity.js';
import { OidcLoginAttemptMapper } from '#src/auth/oidc-login-attempts/mappers/oidc-login-attempt.mapper.js';
import { OidcLoginAttemptRepository } from '#src/auth/oidc-login-attempts/repositories/oidc-login-attempt.repository.js';
import type { CreateOidcLoginAttemptData } from '#src/auth/oidc-login-attempts/types/data/create-oidc-login-attempt.data.js';
import { PrismaService } from '#src/database/prisma.service.js';

@Injectable()
export class PrismaOidcLoginAttemptRepository extends OidcLoginAttemptRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async create(
    data: CreateOidcLoginAttemptData,
  ): Promise<OidcLoginAttemptEntity> {
    const record = await this.prisma.oidcLoginAttempt.create({ data });

    return OidcLoginAttemptMapper.toEntity(record);
  }

  override async consume(
    stateHash: string,
    now: Date,
  ): Promise<OidcLoginAttemptEntity | null> {
    const updated = await this.prisma.oidcLoginAttempt.updateMany({
      where: { stateHash, expiresAt: { gt: now }, consumedAt: null },
      data: { consumedAt: now },
    });
    if (updated.count !== 1) return null;

    const record = await this.prisma.oidcLoginAttempt.findUniqueOrThrow({
      where: { stateHash },
    });

    return OidcLoginAttemptMapper.toEntity(record);
  }
}
