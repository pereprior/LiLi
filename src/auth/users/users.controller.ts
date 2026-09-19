import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { CreateUserDto } from '@/auth/users/dto/create-user.dto.js';
import { ParamUuidDto } from '@/auth/users/dto/param-uuid.dto.js';
import { UpdateUserDto } from '@/auth/users/dto/update-user.dto.js';
import { UserMapper } from '@/auth/users/mappers/user.mapper.js';
import { DeleteResponse } from '@/auth/users/responses/delete.response.js';
import { UserResponse } from '@/auth/users/responses/user.response.js';
import { UserListResponse } from '@/auth/users/responses/user-list.response.js';
import { CreateUserService } from '@/auth/users/services/create-user/create-user.service.js';
import { DeleteUserService } from '@/auth/users/services/delete-user/delete-user.service.js';
import { FindUserService } from '@/auth/users/services/find-user/find-user.service.js';
import { ListUsersService } from '@/auth/users/services/list-users/list-users.service.js';
import { UpdateUserService } from '@/auth/users/services/update-user/update-user.service.js';

@Controller('auth/users')
export class UsersController {
  constructor(
    private readonly createUserService: CreateUserService,
    private readonly deleteUserService: DeleteUserService,
    private readonly findUserService: FindUserService,
    private readonly listUsersService: ListUsersService,
    private readonly updateUserService: UpdateUserService,
  ) {}

  @Post()
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    const user = await this.createUserService.execute(dto);

    return UserMapper.toResponse(user);
  }

  @Get()
  async findAll(): Promise<UserListResponse> {
    const users = await this.listUsersService.execute();

    return UserMapper.toListResponse(users);
  }

  @Get(':uuid')
  async findOne(@Param() params: ParamUuidDto): Promise<UserResponse> {
    const user = await this.findUserService.execute(params.uuid);

    return UserMapper.toResponse(user);
  }

  @Patch(':uuid')
  async update(
    @Param() params: ParamUuidDto,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.updateUserService.execute(params.uuid, dto);

    return UserMapper.toResponse(user);
  }

  @Delete(':uuid')
  @HttpCode(HttpStatus.OK)
  async remove(@Param() params: ParamUuidDto): Promise<DeleteResponse> {
    return this.deleteUserService.execute(params.uuid);
  }
}
