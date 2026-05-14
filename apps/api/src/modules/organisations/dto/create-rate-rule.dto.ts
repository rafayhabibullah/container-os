import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingCycle } from '@sitelager/domain-types';
import { IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreateRateRuleDto {
  @ApiProperty({ example: 'clx...' })
  @IsString()
  unitTypeId: string;

  @ApiProperty({ example: 8900, description: 'Amount in minor units (cents)' })
  @IsInt()
  @Min(0)
  amountMinor: number;

  @ApiProperty({ enum: BillingCycle })
  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  conditions?: object;
}
