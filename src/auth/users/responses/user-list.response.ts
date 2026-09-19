import type { UserResponse } from '#src/auth/users/responses/user.response.js';

export class UserListResponse {
  constructor(public readonly users: UserResponse[]) {}
}
