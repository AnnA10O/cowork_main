import { Role } from '@prisma/client';
export declare class RegisterDto {
    name: string;
    email: string;
    phone?: string;
    password: string;
    role: Role;
    businessName?: string;
    referralCode?: string;
}
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class StaffRegisterDto {
    name: string;
    email: string;
    password: string;
    staffCode: string;
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
export declare class ChangePasswordDto {
    currentPassword: string;
    newPassword: string;
}
export declare class ForgotPasswordDto {
    email: string;
}
export declare class ResetPasswordDto {
    token: string;
    newPassword: string;
}
