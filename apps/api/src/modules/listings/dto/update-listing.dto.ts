import { IsString, IsOptional, IsInt, IsBoolean, IsIn, IsArray, Min } from 'class-validator';

export class UpdateListingDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @Min(0) publicPriceMinor?: number;
  @IsOptional() @IsBoolean() showPrice?: boolean;
  @IsOptional() @IsInt() @Min(0) depositMinor?: number;
  @IsOptional() @IsString() availableFrom?: string;
  @IsOptional() @IsIn(['approval_required', 'instant_booking', 'request_price'])
  bookingMode?: 'approval_required' | 'instant_booking' | 'request_price';
  @IsOptional() @IsArray() @IsString({ each: true }) requiredDocs?: string[];
  @IsOptional() @IsString() seoTitle?: string;
  @IsOptional() @IsString() seoDescription?: string;
}
