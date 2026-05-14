import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateRateRuleDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  unitTypeId: string;

  @ApiProperty({ example: 8900, description: 'Amount in minor units (cents)' })
  @IsInt()
  @Min(0)
  amountMinor: number;

  @ApiProperty({ enum: ['monthly', 'fixed_term'] })
  @IsEnum(['monthly', 'fixed_term'])
  billingCycle: 'monthly' | 'fixed_term';

  @ApiPropertyOptional()
  @IsOptional()
  conditions?: object;
}
