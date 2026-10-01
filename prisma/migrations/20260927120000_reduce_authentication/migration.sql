-- Unlinked legacy users cannot be associated safely with a Google account.
-- Resolve them before applying this migration.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User") THEN
    RAISE EXCEPTION 'User records must be reviewed and removed or migrated before reducing authentication';
  END IF;
END $$;

DROP TABLE "ExternalIdentity";
ALTER TABLE "User"
  DROP COLUMN "username",
  DROP COLUMN "passwordHash",
  DROP COLUMN "role",
  DROP COLUMN "status",
  ADD COLUMN "googleSubject" TEXT NOT NULL,
  ADD COLUMN "email" TEXT NOT NULL;

DROP TYPE "UserRole";
DROP TYPE "UserStatus";

CREATE UNIQUE INDEX "User_googleSubject_key" ON "User"("googleSubject");

ALTER TABLE "Session"
  DROP COLUMN "csrfTokenHash",
  DROP COLUMN "lastUsedAt",
  DROP COLUMN "updatedAt";

ALTER TABLE "OidcLoginAttempt"
  DROP COLUMN "returnTo";
