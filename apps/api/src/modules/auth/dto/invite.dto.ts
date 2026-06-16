import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export enum InviteRole {
  owner = 'owner',
  billing_admin = 'billing_admin',
  site_manager = 'site_manager',
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
