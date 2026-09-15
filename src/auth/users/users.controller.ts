import { Body, Controller, Post } from '@nestjs/common';

import { CreateUserDto } from '@/auth/users/dto/create-user.dto.js';
import { UserMapper } from '@/auth/users/mappers/user.mapper.js';
import { UserResponse } from '@/auth/users/responses/user.response.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';

@Controller('auth/users')
export class UsersController {
  constructor(private readonly createUserService: CreateUserService) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    const user = await this.createUserService.execute(dto);

    return UserMapper.toResponse(user);
  }
}
