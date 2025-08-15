/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { v4 as uuidv4 } from 'uuid';
import appConfig from '../../../src/config/app.config';
import { EmailVerification } from '../../../src/entities/email-verification.entity';
import { PasswordReset } from '../../../src/entities/password-reset.entity';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { User } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { PasswordService } from '../../../src/services/password.service';
import { UserService } from '../../../src/services/user.service';

jest.mock('uuid', () => ({
    v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('AuthService', () => {
    let authService: AuthService;
    let userService: UserService;
    let passwordService: PasswordService;
    let jwtService: JwtService;
    let refreshTokenRepo: any;
    let passwordResetRepo: any;
    let emailVerificationRepo: any;

    const mockAppConfig = {
        isProduction: false,
        jwtExpiresIn: 3600000, // 1 hour in ms
        cookies: {
            secure: false,
            httpOnly: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 3600000, // 1 hour in ms
        },
    };

    const mockUser = {
        id: 'user-id-1',
        email: 'test@example.com',
        password: 'hashed-password',
        isEmailVerified: false,
        lastLoginAt: new Date('2023-01-01'),
    };

    const mockResponse = {
        setHeader: jest.fn(),
        cookie: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UserService,
                    useValue: {
                        findByEmail: jest.fn(),
                        update: jest.fn(),
                        findById: jest.fn(),
                    },
                },
                {
                    provide: PasswordService,
                    useValue: {
                        comparePasswords: jest.fn(),
                    },
                },
                {
                    provide: JwtService,
                    useValue: {
                        sign: jest.fn().mockReturnValue('mocked-jwt-token'),
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockImplementation((key: string): string | undefined => {
                            const values: Record<string, string> = {
                                JWT_EXPIRES_IN: '1h',
                                REFRESH_TOKEN_EXPIRES_IN: '30d',
                                NODE_ENV: 'development',
                                'app.isProduction': 'false',
                            };
                            return values[key];
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(RefreshToken),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(PasswordReset),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: getRepositoryToken(EmailVerification),
                    useValue: {
                        create: jest.fn(),
                        save: jest.fn(),
                        findOne: jest.fn(),
                        update: jest.fn(),
                    },
                },
                {
                    provide: appConfig.KEY,
                    useValue: mockAppConfig,
                },
            ],
        }).compile();

        authService = module.get<AuthService>(AuthService);
        userService = module.get<UserService>(UserService);
        passwordService = module.get<PasswordService>(PasswordService);
        jwtService = module.get<JwtService>(JwtService);
        refreshTokenRepo = module.get(getRepositoryToken(RefreshToken));
        passwordResetRepo = module.get(getRepositoryToken(PasswordReset));
        emailVerificationRepo = module.get(getRepositoryToken(EmailVerification));
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('validateCredentials', () => {
        it('should return null if user not found', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

            const result = await authService.validateCredentials('test@example.com', 'password');

            expect(result).toBeNull();
            expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
        });

        it('should return null if password is invalid', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as User);
            jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(false);

            const result = await authService.validateCredentials('test@example.com', 'wrong-password');

            expect(result).toBeNull();
            expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(passwordService.comparePasswords).toHaveBeenCalledWith('wrong-password', 'hashed-password');
        });

        it('should return user if credentials are valid', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as User);
            jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(true);

            const result = await authService.validateCredentials('test@example.com', 'password');

            expect(result).toEqual(mockUser);
            expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com');
            expect(passwordService.comparePasswords).toHaveBeenCalledWith('password', 'hashed-password');
        });
    });

    describe('login', () => {
        it('should update user last login time', async () => {
            await authService.login(mockUser as User, '127.0.0.1', 'Chrome', mockResponse as any);

            expect(userService.update).toHaveBeenCalledWith('user-id-1', {
                lastLoginAt: expect.any(Date),
            });
        });

        it('should generate and return access token', async () => {
            const result = await authService.login(mockUser as User, '127.0.0.1', 'Chrome', mockResponse as any);

            expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'user-id-1' }, { expiresIn: '1h' });
            expect(result).toEqual({
                accessToken: 'mocked-jwt-token',
                user: expect.objectContaining({
                    id: 'user-id-1',
                    email: 'test@example.com',
                    isEmailVerified: false,
                }),
            });
        });

        it('should set authorization header and cookie when response is provided', async () => {
            await authService.login(mockUser as User, '127.0.0.1', 'Chrome', mockResponse as any);

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Authorization', 'Bearer mocked-jwt-token');
            expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'mocked-jwt-token', mockAppConfig.cookies);
        });
    });

    describe('createRefreshToken', () => {
        it('should create and save a new refresh token', async () => {
            const mockRefreshToken = {
                userId: 'user-id-1',
                token: 'mocked-uuid',
                expiresAt: expect.any(Date),
                deviceInfo: 'Chrome',
                ipAddress: '127.0.0.1',
            };

            refreshTokenRepo.create.mockReturnValue(mockRefreshToken);

            const result = await authService.createRefreshToken('user-id-1', 'Chrome', '127.0.0.1');

            expect(uuidv4).toHaveBeenCalled();
            expect(refreshTokenRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    userId: 'user-id-1',
                    token: 'mocked-uuid',
                    deviceInfo: 'Chrome',
                    ipAddress: '127.0.0.1',
                    expiresAt: expect.any(Date),
                })
            );
            expect(refreshTokenRepo.save).toHaveBeenCalledWith(mockRefreshToken);
            expect(result).toBe('mocked-uuid');
        });

        it('should set refresh token cookie when response is provided', async () => {
            refreshTokenRepo.create.mockReturnValue({});

            await authService.createRefreshToken('user-id-1', 'Chrome', '127.0.0.1', mockResponse as any);

            expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'mocked-uuid', mockAppConfig.cookies);
        });
    });

    describe('validateRefreshToken', () => {
        it('should return null if refresh token not found', async () => {
            refreshTokenRepo.findOne.mockResolvedValue(null);

            const result = await authService.validateRefreshToken('token');

            expect(result).toBeNull();
            expect(refreshTokenRepo.findOne).toHaveBeenCalledWith({
                where: {
                    token: 'token',
                    isRevoked: false,
                },
                relations: ['user'],
            });
        });

        it('should revoke and return null if token is expired', async () => {
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 1);

            refreshTokenRepo.findOne.mockResolvedValue({
                id: 'token-id',
                expiresAt: expiredDate,
            });

            const result = await authService.validateRefreshToken('token');

            expect(result).toBeNull();
            expect(refreshTokenRepo.update).toHaveBeenCalledWith('token-id', { isRevoked: true });
        });

        it('should return user if token is valid', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            refreshTokenRepo.findOne.mockResolvedValue({
                id: 'token-id',
                expiresAt: futureDate,
                user: mockUser,
            });

            const result = await authService.validateRefreshToken('token');

            expect(result).toEqual(mockUser);
        });
    });

    describe('revokeRefreshToken', () => {
        it('should update token as revoked', async () => {
            refreshTokenRepo.update.mockResolvedValue({ affected: 1 });

            const result = await authService.revokeRefreshToken('token');

            expect(refreshTokenRepo.update).toHaveBeenCalledWith({ token: 'token' }, { isRevoked: true });
            expect(result).toEqual({ success: true });
        });

        it('should return false if no token was updated', async () => {
            refreshTokenRepo.update.mockResolvedValue({ affected: 0 });

            const result = await authService.revokeRefreshToken('token');

            expect(result).toEqual({ success: false });
        });
    });

    describe('revokeAllUserRefreshTokens', () => {
        it('should revoke all user tokens', async () => {
            await authService.revokeAllUserRefreshTokens('user-id-1');

            expect(refreshTokenRepo.update).toHaveBeenCalledWith({ userId: 'user-id-1' }, { isRevoked: true });
        });
    });

    describe('createPasswordResetToken', () => {
        it('should throw error if user not found', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

            await expect(authService.createPasswordResetToken('nonexistent@example.com')).rejects.toThrow(
                BadRequestException
            );

            expect(userService.findByEmail).toHaveBeenCalledWith('nonexistent@example.com');
        });

        it('should create and save password reset token', async () => {
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as User);
            passwordResetRepo.create.mockReturnValue({ token: 'mocked-uuid' });

            const result = await authService.createPasswordResetToken('test@example.com');

            expect(uuidv4).toHaveBeenCalled();
            expect(passwordResetRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    token: 'mocked-uuid',
                    expiresAt: expect.any(Date),
                })
            );
            expect(passwordResetRepo.save).toHaveBeenCalled();
            expect(result).toBe('mocked-uuid');
        });
    });

    describe('validatePasswordResetToken', () => {
        it('should return null if token not found', async () => {
            passwordResetRepo.findOne.mockResolvedValue(null);

            const result = await authService.validatePasswordResetToken('token');

            expect(result).toBeNull();
        });

        it('should return null if token is expired', async () => {
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 1);

            passwordResetRepo.findOne.mockResolvedValue({
                expiresAt: expiredDate,
                email: 'test@example.com',
            });

            const result = await authService.validatePasswordResetToken('token');

            expect(result).toBeNull();
        });

        it('should return email if token is valid', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            passwordResetRepo.findOne.mockResolvedValue({
                expiresAt: futureDate,
                email: 'test@example.com',
            });

            const result = await authService.validatePasswordResetToken('token');

            expect(result).toBe('test@example.com');
        });
    });

    describe('resetPassword', () => {
        it('should throw error if token is invalid', async () => {
            jest.spyOn(authService, 'validatePasswordResetToken').mockResolvedValue(null);

            await expect(authService.resetPassword('invalid-token', 'new-password')).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should throw error if user not found', async () => {
            jest.spyOn(authService, 'validatePasswordResetToken').mockResolvedValue('test@example.com');
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

            await expect(authService.resetPassword('token', 'new-password')).rejects.toThrow(BadRequestException);
        });

        it('should update password, mark token as used, and revoke refresh tokens', async () => {
            jest.spyOn(authService, 'validatePasswordResetToken').mockResolvedValue('test@example.com');
            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as User);
            jest.spyOn(authService, 'revokeAllUserRefreshTokens').mockResolvedValue();

            const result = await authService.resetPassword('token', 'new-password');

            expect(userService.update).toHaveBeenCalledWith('user-id-1', { password: 'new-password' });
            expect(passwordResetRepo.update).toHaveBeenCalledWith({ token: 'token' }, { isUsed: true });
            expect(authService.revokeAllUserRefreshTokens).toHaveBeenCalledWith('user-id-1');
            expect(result).toEqual({ success: true, message: 'Password reset successfully' });
        });
    });

    describe('createEmailVerificationToken', () => {
        it('should create and save email verification token', async () => {
            emailVerificationRepo.create.mockReturnValue({ token: 'mocked-uuid' });

            const result = await authService.createEmailVerificationToken('test@example.com');

            expect(uuidv4).toHaveBeenCalled();
            expect(emailVerificationRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    email: 'test@example.com',
                    token: 'mocked-uuid',
                    expiresAt: expect.any(Date),
                })
            );
            expect(emailVerificationRepo.save).toHaveBeenCalled();
            expect(result).toBe('mocked-uuid');
        });
    });

    describe('verifyEmail', () => {
        it('should throw error if verification token not found', async () => {
            emailVerificationRepo.findOne.mockResolvedValue(null);

            await expect(authService.verifyEmail('token')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw error if token is expired', async () => {
            const expiredDate = new Date();
            expiredDate.setDate(expiredDate.getDate() - 3);

            emailVerificationRepo.findOne.mockResolvedValue({
                expiresAt: expiredDate,
                email: 'test@example.com',
                isUsed: false,
            });

            await expect(authService.verifyEmail('token')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw error if user not found', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            emailVerificationRepo.findOne.mockResolvedValue({
                expiresAt: futureDate,
                email: 'test@example.com',
                isUsed: false,
            });

            jest.spyOn(userService, 'findByEmail').mockResolvedValue(null);

            await expect(authService.verifyEmail('token')).rejects.toThrow(BadRequestException);
        });

        it('should mark email as verified and token as used', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1);

            emailVerificationRepo.findOne.mockResolvedValue({
                expiresAt: futureDate,
                email: 'test@example.com',
                isUsed: false,
            });

            jest.spyOn(userService, 'findByEmail').mockResolvedValue(mockUser as User);

            const result = await authService.verifyEmail('token');

            expect(userService.update).toHaveBeenCalledWith('user-id-1', { isEmailVerified: true });
            expect(emailVerificationRepo.update).toHaveBeenCalledWith({ token: 'token' }, { isUsed: true });
            expect(result).toEqual({ success: true, message: 'Email verified successfully' });
        });
    });

    describe('sanitizeUser', () => {
        it('should remove password from user object', () => {
            const user = {
                id: 'user-id',
                email: 'test@example.com',
                password: 'secret-password',
                name: 'Test User',
            };

            const result = (authService as any).sanitizeUser(user);

            expect(result).toEqual(
                expect.objectContaining({
                    id: 'user-id',
                    email: 'test@example.com',
                })
            );
            expect(result.password).toBeUndefined();
        });
    });
});
