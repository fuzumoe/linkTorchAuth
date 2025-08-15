import { BadRequestException, Body, Controller, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { User } from '../entities/user.entity';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeviceInfo } from '../decorators/device-info.decorator';
import { IpAddress } from '../decorators/request.decorator';
import { CurrentUser } from '../decorators/user.decorator';
import {
    LoginResponseDto,
    PasswordResetDto,
    PasswordResetRequestDto,
    RefreshTokenDto,
    VerifyEmailDto,
} from '../dtos/auth.dto';
import { SuccessResponseDto } from '../dtos/process.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private userService: UserService,
        private authService: AuthService
    ) {}
    @Post('login')
    @HttpCode(200)
    @UseGuards(AuthGuard('local'))
    async login(
        @CurrentUser() user: User,
        @Res({ passthrough: true }) response: Response,
        @IpAddress() ipAddress: string,
        @DeviceInfo() deviceInfo: string
    ): Promise<LoginResponseDto> {
        const authResult = await this.authService.login(user, ipAddress, deviceInfo, response);

        const refreshToken = await this.authService.createRefreshToken(user.id, deviceInfo, ipAddress, response);

        return {
            ...authResult,
            refreshToken,
        };
    }
    @Post('refresh')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async refreshToken(
        @CurrentUser() currentUser: User,
        @Body() refreshTokenDto: RefreshTokenDto,
        @DeviceInfo() deviceInfo: string,
        @Res({ passthrough: true }) response: Response
    ): Promise<LoginResponseDto> {
        const ipAddress = deviceInfo?.match(/\(([^)]+)\)$/)?.[1] || 'unknown';
        const validatedUser = await this.authService.validateRefreshToken(refreshTokenDto.refreshToken);

        if (!validatedUser || validatedUser.id !== currentUser.id) {
            throw new BadRequestException('Invalid or expired refresh token');
        }

        await this.authService.revokeRefreshToken(refreshTokenDto.refreshToken);

        const authResult = await this.authService.login(validatedUser, ipAddress, deviceInfo, response);

        const refreshToken = await this.authService.createRefreshToken(
            validatedUser.id,
            deviceInfo,
            ipAddress,
            response
        );

        return {
            ...authResult,
            refreshToken,
        };
    }

    @Post('logout')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async logout(
        @CurrentUser() user: User,
        @Body() refreshTokenDto: RefreshTokenDto,
        @Res({ passthrough: true }) response: Response
    ): Promise<SuccessResponseDto> {
        const result = await this.authService.logout(user.id, refreshTokenDto.refreshToken, response, false);
        return result;
    }

    @Post('logout-all-devices')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async logoutAllDevices(
        @CurrentUser() user: User,
        @Res({ passthrough: true }) response: Response
    ): Promise<SuccessResponseDto> {
        return this.authService.logout(
            user.id,
            undefined, // No specific token
            response,
            true // Revoke all tokens for this user
        );
    }

    @Post('password-reset-request')
    async requestPasswordReset(@Body() dto: PasswordResetRequestDto): Promise<SuccessResponseDto> {
        await this.authService.createPasswordResetToken(dto.email);

        return { success: true, message: 'If the email exists, a password reset link has been sent' };
    }

    @Post('password-reset')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async resetPassword(@Body() dto: PasswordResetDto): Promise<SuccessResponseDto> {
        const success = await this.authService.resetPassword(dto.token, dto.newPassword);

        return success;
    }

    @Post('verify-email')
    async verifyEmail(@Body() dto: VerifyEmailDto): Promise<SuccessResponseDto> {
        const success = await this.authService.verifyEmail(dto.token);

        return success;
    }

    @Post('resend-verification')
    async resendVerificationEmail(@Body() dto: { email: string }): Promise<SuccessResponseDto> {
        const user = await this.userService.findByEmail(dto.email);

        if (!user) {
            return {
                success: true,
                message: 'If the email exists and is not verified, a verification email has been sent',
            };
        }

        if (user.isEmailVerified) {
            return {
                success: false,
                message: 'Email is already verified',
            };
        }

        await this.authService.createEmailVerificationToken(dto.email);

        return {
            success: true,
            message: 'Verification email has been sent',
        };
    }
}
