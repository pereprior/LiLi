import type { UserResponse } from '@/auth/users/responses/user.response.js';

export class UserListResponse {
  constructor(public readonly users: UserResponse[]) {}
}
