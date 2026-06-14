import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { OrgPlan } from '@sitelager/domain-types';

export class UpdateOrganisationDto {
  @ApiPropertyOptional({ example: 'Alpha Storage' })
  @IsOptional()
  @IsString()
  tradingName?: string;

  @ApiPropertyOptional({ enum: OrgPlan, example: 'professional' })
  @IsOptional()
  @IsEnum(OrgPlan)
  plan?: OrgPlan;

  @ApiPropertyOptional({ example: 'billing@company.de' })
  @IsOptional()
  @IsEmail()
  billingEmail?: string;

  @ApiPropertyOptional({ example: 'support@company.de' })
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional({ example: '+49 30 12345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'https://company.de' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: 'DE123456789' })
  @IsOptional()
  @IsString()
  vatId?: string;

  @ApiPropertyOptional({ example: '123/456/78901' })
  @IsOptional()
  @IsString()
  taxNumber?: string;
}
