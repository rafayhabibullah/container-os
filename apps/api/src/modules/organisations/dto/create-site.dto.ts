import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSiteDto {
  @ApiProperty({ example: 'Berlin Mitte Self-Storage' })
  @IsString()
  name: string;

  @ApiProperty({ example: { street: 'Hauptstr. 1', city: 'Berlin', postalCode: '10115', country: 'DE' } })
  @IsObject()
  address: { street: string; city: string; postalCode: string; country: string };

  @ApiPropertyOptional({ example: 'Europe/Berlin' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'EUR' })
  @IsOptional()
  @IsString()
  currency?: string;
}
