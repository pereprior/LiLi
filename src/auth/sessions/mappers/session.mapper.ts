import { SessionEntity } from '#src/auth/sessions/entities/session.entity.js';
import type { SessionRecord } from '#src/auth/sessions/types/session-record.type.js';
import { UserMapper } from '#src/auth/users/mappers/user.mapper.js';

export class SessionMapper {
  static toEntity(record: SessionRecord): SessionEntity {
    return new SessionEntity(
      record.uuid,
      record.userUuid,
      record.csrfTokenHash,
      record.expiresAt,
      record.lastUsedAt,
      record.revokedAt,
      UserMapper.toEntity(record.user),
    );
  }
}
