import { Injectable } from '@nestjs/common';

import type { SessionEntity } from '#src/auth/sessions/entities/session.entity.js';
import { SessionMapper } from '#src/auth/sessions/mappers/session.mapper.js';
import { SessionRepository } from '#src/auth/sessions/repositories/session.repository.js';
import type { CreateSessionData } from '#src/auth/sessions/types/data/create-session.data.js';
import type { SessionRecord } from '#src/auth/sessions/types/session-record.type.js';
import { PrismaService } from '#src/database/prisma.service.js';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  override async create(data: CreateSessionData): Promise<void> {
    const { userUuid, ...sessionData } = data;
    await this.prisma.session.create({
      data: {
        ...sessionData,
        user: { connect: { uuid: userUuid, status: 'ACTIVE' } },
      },
    });
  }

  override async findByTokenHash(
    tokenHash: string,
  ): Promise<SessionEntity | null> {
    const record: SessionRecord | null = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) return null;

    return SessionMapper.toEntity(record);
  }

  override async touchIfValid(
    uuid: string,
    now: Date,
    idleCutoff: Date,
  ): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: {
        uuid,
        revokedAt: null,
        expiresAt: { gt: now },
        lastUsedAt: { gt: idleCutoff, lte: now },
        user: { status: 'ACTIVE' },
      },
      data: { lastUsedAt: now },
    });

    return result.count === 1;
  }

  override async revokeByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  override async revokeByUserUuid(
    userUuid: string,
    now: Date,
  ): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { userUuid, revokedAt: null },
      data: { revokedAt: now },
    });

    return result.count;
  }
}
