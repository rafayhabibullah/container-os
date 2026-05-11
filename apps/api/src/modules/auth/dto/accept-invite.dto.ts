import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'Maria Müller' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;
}
