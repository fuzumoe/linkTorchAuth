import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { AuthController } from '../../../src/controllers/auth.controller';
import { RefreshTokenDto } from '../../../src/dtos/auth.dto';
import { SuccessResponseDto } from '../../../src/dtos/process.dto';
import { User } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { UserService } from '../../../src/services/user.service';

describe('AuthController', () => {
    let authController: AuthController;

    // Define mock services
    let mockAuthService: {
        login: jest.Mock;
        createRefreshToken: jest.Mock;
        validateRefreshToken: jest.Mock;
        revokeRefreshToken: jest.Mock;
        logout: jest.Mock;
        createPasswordResetToken: jest.Mock;
        resetPassword: jest.Mock;
        verifyEmail: jest.Mock;
        createEmailVerificationToken: jest.Mock;
    };

    let mockUserService: {
        findByEmail: jest.Mock;
    };

    // Mock response object
    const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
    } as unknown as Response;

    // Mock user object
    const mockUser = {
        id: 'user-id-1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: true,
    } as User;

    // Mock login result
    const mockLoginResult = {
        accessToken: 'mock-access-token',
        user: {
            id: 'user-id-1',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
        },
    };

    // Mock refresh token
    const mockRefreshToken = 'mock-refresh-token';

    beforeEach(async () => {
        // Initialize mock services
        mockAuthService = {
            login: jest.fn().mockResolvedValue(mockLoginResult),
            createRefreshToken: jest.fn().mockResolvedValue(mockRefreshToken),
            validateRefreshToken: jest.fn(),
            revokeRefreshToken: jest.fn(),
            logout: jest.fn(),
            createPasswordResetToken: jest.fn(),
            resetPassword: jest.fn(),
            verifyEmail: jest.fn(),
            createEmailVerificationToken: jest.fn(),
        };

        mockUserService = {
            findByEmail: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
            ],
        }).compile();

        authController = module.get<AuthController>(AuthController);
    });

    describe('login', () => {
        it('should return login result with refresh token', async () => {
            // Login credentials are handled by the authentication guard, not used directly here
            const ipAddress = '127.0.0.1';
            const deviceInfo = 'Chrome (127.0.0.1)';

            const result = await authController.login(mockUser, mockResponse, ipAddress, deviceInfo);

            expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, ipAddress, deviceInfo, mockResponse);
            expect(mockAuthService.createRefreshToken).toHaveBeenCalledWith(
                mockUser.id,
                deviceInfo,
                ipAddress,
                mockResponse
            );
            expect(result).toEqual({
                ...mockLoginResult,
                refreshToken: mockRefreshToken,
            });
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const refreshTokenDto: RefreshTokenDto = {
                refreshToken: 'valid-refresh-token',
            };
            const deviceInfo = 'Chrome (127.0.0.1)';

            // Mock validateRefreshToken to return the mockUser
            mockAuthService.validateRefreshToken.mockResolvedValue(mockUser);

            const result = await authController.refreshToken(mockUser, refreshTokenDto, deviceInfo, mockResponse);

            expect(mockAuthService.validateRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(mockAuthService.revokeRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(mockAuthService.login).toHaveBeenCalledWith(mockUser, '127.0.0.1', deviceInfo, mockResponse);
            expect(mockAuthService.createRefreshToken).toHaveBeenCalledWith(
                mockUser.id,
                deviceInfo,
                '127.0.0.1',
                mockResponse
            );
            expect(result).toEqual({
                ...mockLoginResult,
                refreshToken: mockRefreshToken,
            });
        });

        it('should throw BadRequestException when refresh token is invalid', async () => {
            const refreshTokenDto: RefreshTokenDto = {
                refreshToken: 'invalid-refresh-token',
            };
            const deviceInfo = 'Chrome (127.0.0.1)';

            // Mock validateRefreshToken to return null (invalid token)
            mockAuthService.validateRefreshToken.mockResolvedValue(null);

            await expect(
                authController.refreshToken(mockUser, refreshTokenDto, deviceInfo, mockResponse)
            ).rejects.toThrow(BadRequestException);

            expect(mockAuthService.validateRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(mockAuthService.login).not.toHaveBeenCalled();
            expect(mockAuthService.createRefreshToken).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when token belongs to another user', async () => {
            const refreshTokenDto: RefreshTokenDto = {
                refreshToken: 'another-users-token',
            };
            const deviceInfo = 'Chrome (127.0.0.1)';

            const anotherUser = { ...mockUser, id: 'another-user-id' };

            // Mock validateRefreshToken to return another user
            mockAuthService.validateRefreshToken.mockResolvedValue(anotherUser);

            await expect(
                authController.refreshToken(mockUser, refreshTokenDto, deviceInfo, mockResponse)
            ).rejects.toThrow(BadRequestException);

            expect(mockAuthService.validateRefreshToken).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
            expect(mockAuthService.login).not.toHaveBeenCalled();
            expect(mockAuthService.createRefreshToken).not.toHaveBeenCalled();
        });

        it('should handle missing IP address in device info', async () => {
            const refreshTokenDto: RefreshTokenDto = {
                refreshToken: 'valid-refresh-token',
            };
            const deviceInfo = 'Chrome without IP';

            // Mock validateRefreshToken to return the mockUser
            mockAuthService.validateRefreshToken.mockResolvedValue(mockUser);

            const result = await authController.refreshToken(mockUser, refreshTokenDto, deviceInfo, mockResponse);

            expect(mockAuthService.login).toHaveBeenCalledWith(
                mockUser,
                'unknown', // Should default to 'unknown'
                deviceInfo,
                mockResponse
            );
            expect(result).toEqual({
                ...mockLoginResult,
                refreshToken: mockRefreshToken,
            });
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            const refreshTokenDto: RefreshTokenDto = {
                refreshToken: 'valid-refresh-token',
            };

            const mockLogoutResult: SuccessResponseDto = {
                success: true,
                message: 'Logged out successfully',
            };

            mockAuthService.logout.mockResolvedValue(mockLogoutResult);

            const result = await authController.logout(mockUser, refreshTokenDto, mockResponse);

            expect(mockAuthService.logout).toHaveBeenCalledWith(
                mockUser.id,
                refreshTokenDto.refreshToken,
                mockResponse,
                false
            );
            expect(result).toEqual(mockLogoutResult);
        });
    });

    describe('logoutAllDevices', () => {
        it('should logout from all devices successfully', async () => {
            const mockLogoutResult: SuccessResponseDto = {
                success: true,
                message: 'Logged out from all devices successfully',
            };

            mockAuthService.logout.mockResolvedValue(mockLogoutResult);

            const result = await authController.logoutAllDevices(mockUser, mockResponse);

            expect(mockAuthService.logout).toHaveBeenCalledWith(mockUser.id, undefined, mockResponse, true);
            expect(result).toEqual(mockLogoutResult);
        });
    });

    describe('requestPasswordReset', () => {
        it('should request password reset successfully', async () => {
            const dto = { email: 'test@example.com' };

            const result = await authController.requestPasswordReset(dto);

            expect(mockAuthService.createPasswordResetToken).toHaveBeenCalledWith(dto.email);
            expect(result).toEqual({
                success: true,
                message: 'If the email exists, a password reset link has been sent',
            });
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            const dto = {
                token: 'valid-reset-token',
                newPassword: 'newSecurePassword123',
            };

            const mockResetResult: SuccessResponseDto = {
                success: true,
                message: 'Password has been reset successfully',
            };

            mockAuthService.resetPassword.mockResolvedValue(mockResetResult);

            const result = await authController.resetPassword(dto);

            expect(mockAuthService.resetPassword).toHaveBeenCalledWith(dto.token, dto.newPassword);
            expect(result).toEqual(mockResetResult);
        });
    });

    describe('verifyEmail', () => {
        it('should verify email successfully', async () => {
            const dto = { token: 'valid-verification-token' };

            const mockVerifyResult: SuccessResponseDto = {
                success: true,
                message: 'Email has been verified successfully',
            };

            mockAuthService.verifyEmail.mockResolvedValue(mockVerifyResult);

            const result = await authController.verifyEmail(dto);

            expect(mockAuthService.verifyEmail).toHaveBeenCalledWith(dto.token);
            expect(result).toEqual(mockVerifyResult);
        });
    });

    describe('resendVerificationEmail', () => {
        it('should resend verification email when user exists and not verified', async () => {
            const dto = { email: 'test@example.com' };
            const unverifiedUser = { ...mockUser, isEmailVerified: false };

            mockUserService.findByEmail.mockResolvedValue(unverifiedUser);

            const result = await authController.resendVerificationEmail(dto);

            expect(mockUserService.findByEmail).toHaveBeenCalledWith(dto.email);
            expect(mockAuthService.createEmailVerificationToken).toHaveBeenCalledWith(dto.email);
            expect(result).toEqual({
                success: true,
                message: 'Verification email has been sent',
            });
        });

        it('should return success but not send email when user does not exist', async () => {
            const dto = { email: 'nonexistent@example.com' };

            mockUserService.findByEmail.mockResolvedValue(null);

            const result = await authController.resendVerificationEmail(dto);

            expect(mockUserService.findByEmail).toHaveBeenCalledWith(dto.email);
            expect(mockAuthService.createEmailVerificationToken).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: true,
                message: 'If the email exists and is not verified, a verification email has been sent',
            });
        });

        it('should return failure when email is already verified', async () => {
            const dto = { email: 'verified@example.com' };
            const verifiedUser = { ...mockUser, isEmailVerified: true };

            mockUserService.findByEmail.mockResolvedValue(verifiedUser);

            const result = await authController.resendVerificationEmail(dto);

            expect(mockUserService.findByEmail).toHaveBeenCalledWith(dto.email);
            expect(mockAuthService.createEmailVerificationToken).not.toHaveBeenCalled();
            expect(result).toEqual({
                success: false,
                message: 'Email is already verified',
            });
        });
    });
});
