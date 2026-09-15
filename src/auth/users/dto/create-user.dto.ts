import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  public username!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  public password!: string;
}
