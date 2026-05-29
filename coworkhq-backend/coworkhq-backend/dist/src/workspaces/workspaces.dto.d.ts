import { DayOfWeek, PricingType } from '@prisma/client';
export declare class WorkingHoursDto {
    day: DayOfWeek;
    openTime: string;
    closeTime: string;
    isClosed?: boolean;
}
export declare class CreateWorkspaceDto {
    name: string;
    description?: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    latitude: number;
    longitude: number;
    googleMapsUrl?: string;
    amenities?: string[];
    workingHours: WorkingHoursDto[];
}
export declare class UpdateWorkspaceDto extends CreateWorkspaceDto {
}
export declare class CreateDeskDto {
    deskNumber: string;
    type?: string;
    description?: string;
    premiumExtra?: number;
}
export declare class CreatePricingPlanDto {
    name: string;
    type: PricingType;
    basePrice: number;
}
export declare class UpdatePricingPlanDto extends CreatePricingPlanDto {
    isActive?: boolean;
}
export declare class CreateCouponDto {
    code: string;
    discountPercent?: number;
    discountFlat?: number;
    maxUses?: number;
    validFrom: string;
    validUntil: string;
}
export declare class AssignStaffDto {
    staffId: string;
    workspaceId: string;
}
export declare class GenerateStaffCodeDto {
    note?: string;
}
