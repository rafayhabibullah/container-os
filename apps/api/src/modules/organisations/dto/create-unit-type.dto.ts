import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUnitTypeDto {
  @ApiProperty({ example: 'Small 5m²' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5.0 })
  @IsNumber()
  @Min(0.1)
  sizeSqm: number;

  @ApiPropertyOptional({ example: 12.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sizeCbm?: number;

  @ApiPropertyOptional({ example: 'roller' })
  @IsOptional()
  @IsString()
  doorType?: string;

  @ApiPropertyOptional({ example: ['climate_controlled', 'ground_floor'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}
