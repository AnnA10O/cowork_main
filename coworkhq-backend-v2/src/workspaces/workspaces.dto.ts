import {
  IsString, IsOptional, IsNumber, IsBoolean, IsArray,
  IsEnum, IsLatitude, IsLongitude, ValidateNested,
  Min, Max, IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek, PricingType } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class WorkingHoursDto {
  @IsEnum(DayOfWeek)
  day: DayOfWeek;

  @IsString()
  openTime: string; // "09:00"

  @IsString()
  closeTime: string; // "21:00"

  @IsBoolean()
  @IsOptional()
  isClosed?: boolean;
}

export class CreateWorkspaceDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  pincode: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;

  @IsUrl()
  @IsOptional()
  googleMapsUrl?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHoursDto)
  workingHours: WorkingHoursDto[];

  @IsBoolean()
  @IsOptional()
  useDefaultImages?: boolean;

  @IsString()
  @IsOptional()
  type?: string;
}

export class UpdateWorkspaceDto extends CreateWorkspaceDto {}

export class CreateDeskDto {
  @IsString()
  deskNumber: string;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  premiumExtra?: number;
}

export class CreateBulkDesksDto {
  @IsString()
  prefix: string;

  @IsNumber()
  startNumber: number;

  @IsNumber()
  count: number;

  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  premiumExtra?: number;
}

export class CreatePricingPlanDto {
  @IsString()
  name: string;

  @IsEnum(PricingType)
  type: PricingType;

  @IsNumber()
  @Min(0)
  basePrice: number;
}

export class UpdatePricingPlanDto extends PartialType(CreatePricingPlanDto) {
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCouponDto {
  @IsString()
  code: string;

  @IsNumber()
  @IsOptional()
  discountPercent?: number;

  @IsNumber()
  @IsOptional()
  discountFlat?: number;

  @IsNumber()
  @IsOptional()
  maxUses?: number;

  @IsString()
  validFrom: string;

  @IsString()
  validUntil: string;

  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class AssignStaffDto {
  @IsString()
  staffId: string;

  @IsString()
  workspaceId: string;
}

export class GenerateStaffCodeDto {
  @IsString()
  @IsOptional()
  note?: string;
}

