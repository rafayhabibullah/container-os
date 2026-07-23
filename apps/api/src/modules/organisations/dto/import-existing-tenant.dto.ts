import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ImportExistingTenantDto {
  @ApiProperty({ enum: ['private', 'business'], example: 'private' })
  @IsEnum(['private', 'business'])
  type: 'private' | 'business';

  @ApiPropertyOptional({ example: 'Max' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Mustermann' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: 'Muster Logistik GmbH' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: 'tenant@example.de' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: '+49 30 12345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'site_01' })
  @IsString()
  siteId: string;

  @ApiProperty({ example: 'unit_01' })
  @IsString()
  unitId: string;

  @ApiProperty({ example: '2024-01-01' })
  @IsDateString()
  moveInDate: string;

  @ApiProperty({ example: '2026-07-31', description: 'The date until which the imported tenant has already paid outside SiteLager.' })
  @IsDateString()
  paidThroughDate: string;

  @ApiProperty({ example: 14900, description: 'Monthly rent in cents, excluding VAT.' })
  @IsInt()
  @Min(0)
  monthlyRentMinor: number;

  @ApiPropertyOptional({ example: 0.19 })
  @IsOptional()
  vatRate?: number;

  @ApiPropertyOptional({ enum: ['manual_invoice', 'bank_transfer', 'cash', 'sepa_core', 'sepa_b2b', 'card'], example: 'bank_transfer' })
  @IsOptional()
  @IsEnum(['manual_invoice', 'bank_transfer', 'cash', 'sepa_core', 'sepa_b2b', 'card'])
  paymentMethod?: 'manual_invoice' | 'bank_transfer' | 'cash' | 'sepa_core' | 'sepa_b2b' | 'card';

  @ApiPropertyOptional({ example: 'Imported from old system. Paid in legacy accounting.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
