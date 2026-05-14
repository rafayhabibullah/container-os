import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class CreatePriceBookDto {
  @ApiProperty({ example: 'Summer 2026' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  effectiveFrom: string;
}
