import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUnitTypeDto {
  @ApiPropertyOptional({ example: 'Small 5m²' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 5.0 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  sizeSqm?: number;

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
