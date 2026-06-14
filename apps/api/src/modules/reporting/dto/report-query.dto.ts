import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class ReportQueryDto {
  @ApiPropertyOptional({ description: 'ISO 8601 start date filter' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ description: 'ISO 8601 end date filter' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ description: 'Filter to a specific site' })
  @IsOptional()
  @IsString()
  siteId?: string;
}
