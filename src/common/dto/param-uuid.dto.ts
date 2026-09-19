import { IsUUID } from 'class-validator';

export class ParamUuidDto {
  @IsUUID('4')
  public uuid!: string;
}
