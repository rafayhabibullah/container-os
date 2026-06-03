import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Alpha Storage GmbH' })
  @IsString()
  organisationName: string;

  @ApiProperty({ example: 'Max Müller' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'max@alpha-storage.de' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ example: 'DE' })
  @IsOptional()
  @IsString()
  countryCode?: string;

  @ApiPropertyOptional({ example: 'de' })
  @IsOptional()
  @IsString()
  defaultLanguage?: string;
}

export class TenantRegisterDto {
  @ApiProperty({ example: 'Max Mustermann' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'max@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'StrongPass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken: string;
  @ApiProperty() refreshToken: string;
  @ApiProperty({ nullable: true }) organisationId: string | null;
  @ApiProperty() userId: string;
  @ApiProperty() role: string;
}
