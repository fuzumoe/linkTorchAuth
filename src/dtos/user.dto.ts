import { User, UserRole } from '../entities/user.entity';
import { PaginationDto } from './pagination.dto';
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsBoolean, IsDate, IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class SearchUserDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Filter users by email' })
    email?: string;

    @ApiPropertyOptional({ description: 'Filter users by first name' })
    firstName?: string;

    @ApiPropertyOptional({ description: 'Filter users by last name' })
    lastName?: string;

    @ApiPropertyOptional({ description: 'Filter users by active status' })
    isActive?: boolean;

    @ApiPropertyOptional({ description: 'Filter users by email verification status' })
    isEmailVerified?: boolean;

    @ApiPropertyOptional({ description: 'Filter users by role', enum: UserRole })
    role?: string;

    @ApiPropertyOptional({ description: 'Field to sort by', default: 'createdAt' })
    sortBy?: string = 'createdAt';

    @ApiPropertyOptional({ description: 'Sort direction', enum: ['ASC', 'DESC'], default: 'DESC' })
    sortDirection?: 'ASC' | 'DESC' = 'DESC';
}

export class RegisterDto {
    @ApiProperty({ description: 'User email address' })
    email: string;

    @ApiProperty({ description: 'User password' })
    password: string;

    @ApiPropertyOptional({ description: 'User first name' })
    firstName?: string;

    @ApiPropertyOptional({ description: 'User last name' })
    lastName?: string;

    @ApiPropertyOptional({ description: 'User role', enum: UserRole })
    role?: UserRole;
}

export class UpdateUserDto {
    @ApiPropertyOptional({ description: 'User email address' })
    email?: string;

    @ApiPropertyOptional({ description: 'User first name' })
    firstName?: string;

    @ApiPropertyOptional({ description: 'User last name' })
    lastName?: string;

    @ApiPropertyOptional({ description: 'User avatar URL' })
    avatar?: string;

    @ApiPropertyOptional({ description: 'User active status' })
    isActive?: boolean;
}

export class ChangePasswordDto {
    @ApiProperty({ description: 'Current password' })
    currentPassword: string;

    @ApiProperty({ description: 'New password' })
    newPassword: string;
}

export class UserResponseDto extends OmitType(User, ['password', 'refreshTokens'] as const) {
    @ApiProperty({ description: 'User ID' })
    @Expose()
    id: string;

    @ApiProperty({ description: 'User email address' })
    @Expose()
    email: string;

    @ApiPropertyOptional({ description: 'User first name' })
    @Expose()
    firstName?: string;

    @ApiPropertyOptional({ description: 'User last name' })
    @Expose()
    lastName?: string;

    @ApiPropertyOptional({ description: 'User avatar URL' })
    @Expose()
    avatar?: string;

    @ApiProperty({ description: 'Whether email is verified' })
    @Expose()
    isEmailVerified: boolean;

    @ApiProperty({ description: 'Whether user is active' })
    @Expose()
    isActive: boolean;

    @ApiProperty({ description: 'User role', enum: UserRole })
    @Expose()
    role: UserRole;

    @ApiProperty({ description: 'User creation date' })
    @Expose()
    createdAt: Date;

    @ApiProperty({ description: 'User last update date' })
    @Expose()
    updatedAt: Date;
}

export class UserDto {
    @Expose()
    @IsString()
    id: string;

    @Expose()
    @IsEmail()
    email: string;

    @Expose()
    @IsBoolean()
    isEmailVerified: boolean;

    @Expose()
    @IsBoolean()
    isActive: boolean;

    @Expose()
    @IsEnum(UserRole)
    role: UserRole;

    @Expose()
    @IsOptional()
    @IsString()
    firstName?: string;

    @Expose()
    @IsOptional()
    @IsString()
    lastName?: string;

    @Expose()
    @IsOptional()
    @IsUrl({ require_tld: false }, { message: 'avatar must be a URL' })
    avatar?: string;

    @Expose()
    @IsOptional()
    @IsDate()
    lastLoginAt?: Date;

    @Expose()
    @IsDate()
    createdAt: Date;

    @Expose()
    @IsDate()
    updatedAt: Date;
}
