import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(64)
  public username?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @MaxLength(128)
  public password?: string;
}
