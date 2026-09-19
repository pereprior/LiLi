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

import { CreateUserDto } from '#src/auth/users/dto/create-user.dto.js';
import { UpdateUserDto } from '#src/auth/users/dto/update-user.dto.js';
import { UserMapper } from '#src/auth/users/mappers/user.mapper.js';
import { UserResponse } from '#src/auth/users/responses/user.response.js';
import { UserListResponse } from '#src/auth/users/responses/user-list.response.js';
import { CreateUserService } from '#src/auth/users/services/create-user/create-user.service.js';
import { DeleteUserService } from '#src/auth/users/services/delete-user/delete-user.service.js';
import { FindUserService } from '#src/auth/users/services/find-user/find-user.service.js';
import { ListUsersService } from '#src/auth/users/services/list-users/list-users.service.js';
import { UpdateUserService } from '#src/auth/users/services/update-user/update-user.service.js';
import { ParamUuidDto } from '#src/common/dto/param-uuid.dto.js';
import { DeleteResponse } from '#src/common/responses/delete.response.js';

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
