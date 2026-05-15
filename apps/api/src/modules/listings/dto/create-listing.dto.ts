import { IsString, IsOptional, IsInt, IsBoolean, IsIn, IsArray } from 'class-validator';

export class CreateListingDto {
  @IsString() unitId: string;
  @IsString() siteId: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() publicPriceMinor?: number;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsInt() depositMinor?: number;
  @IsOptional() @IsString() availableFrom?: string;
  @IsIn(['approval_required', 'instant_booking', 'request_price'])
  bookingMode: 'approval_required' | 'instant_booking' | 'request_price';
  @IsOptional() @IsArray() requiredDocs?: string[];
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}
