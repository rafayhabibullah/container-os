import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export enum InviteRole {
  owner = 'owner',
  operator = 'operator',
}

export class InviteDto {
  @ApiProperty({ example: 'operator@site.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ enum: InviteRole })
  @IsEnum(InviteRole)
  role: InviteRole;
}
