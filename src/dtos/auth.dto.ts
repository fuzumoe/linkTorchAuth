import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ description: 'User email' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ description: 'User password' })
    @IsString()
    @IsNotEmpty()
    password: string;

    @ApiPropertyOptional({ description: 'Device information', required: false })
    @IsString()
    deviceInfo?: string;

    @ApiPropertyOptional({ description: 'Authentication strategy', required: false })
    @IsString()
    strategy: 'jwt' | 'basic' = 'jwt';
}

export class PasswordResetRequestDto {
    @ApiProperty({ description: 'User email' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}

export class PasswordResetDto {
    @ApiProperty({ description: 'Password reset token' })
    @IsString()
    @IsNotEmpty()
    token: string;

    @ApiProperty({ description: 'New password' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    newPassword: string;
}

export class RefreshTokenDto {
    @ApiProperty({ description: 'Refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;
}

export class VerifyEmailDto {
    @ApiProperty({ description: 'Email verification token' })
    @IsString()
    @IsNotEmpty()
    token: string;
}

export class LoginResponseDto {
    @ApiProperty({ description: 'Access token' })
    @IsString()
    @IsNotEmpty()
    accessToken: string;

    @ApiProperty({ description: 'Refresh token' })
    @IsString()
    @IsNotEmpty()
    refreshToken: string;

    @ApiProperty({ description: 'User information' })
    user: any;
}
