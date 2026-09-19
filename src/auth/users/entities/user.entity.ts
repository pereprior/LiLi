export class UserEntity {
  constructor(
    public readonly uuid: string,
    public username: string,
    public passwordHash: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
