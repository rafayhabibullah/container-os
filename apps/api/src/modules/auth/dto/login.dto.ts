import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'max@alpha-storage.de' })
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  password: string;
}
