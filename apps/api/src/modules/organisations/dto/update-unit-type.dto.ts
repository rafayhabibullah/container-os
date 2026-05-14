import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUnitTypeDto {
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.1) sizeSqm?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) sizeCbm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() doorType?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
}
