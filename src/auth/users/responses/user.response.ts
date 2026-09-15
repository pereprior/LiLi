export class UserResponse {
  constructor(
    public readonly uuid: string,
    public readonly username: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
