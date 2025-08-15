/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import { TestingModule } from '@nestjs/testing';
import { AuthService } from '../../../src/services/auth.service';
import { Repository } from 'typeorm';
import { User } from '../../../src/entities/user.entity';
import { Response } from 'express';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { PasswordReset } from '../../../src/entities/password-reset.entity';
import { EmailVerification } from '../../../src/entities/email-verification.entity';
import { v4 as uuidv4 } from 'uuid';
import { createTestingModule, cleanupTestUsers, createTestUser, getCommonServices } from '../../fixtures/app.fixtures';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('AuthService Integration', () => {
    let app: TestingModule;
    let authService: AuthService;
    let userRepository: Repository<User>;
    let refreshTokenRepository: Repository<RefreshToken>;
    let passwordResetRepository: Repository<PasswordReset>;
    let emailVerificationRepository: Repository<EmailVerification>;
    let testUser: User;

    const testPassword = 'TestPassword123!';
    let testEmail: string;
    const createMockResponse = () => {
        const res: Partial<Response> = {
            setHeader: jest.fn(),
            cookie: jest.fn(),
        };
        return res as Response;
    };

    beforeAll(async () => {
        app = await createTestingModule();
        const services = getCommonServices(app);
        authService = services.authService;
        userRepository = services.userRepository;

        refreshTokenRepository = app.get(getRepositoryToken(RefreshToken));
        passwordResetRepository = app.get(getRepositoryToken(PasswordReset));
        emailVerificationRepository = app.get(getRepositoryToken(EmailVerification));
    });

    const createdUserIds: string[] = [];

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds);
        await app.close();
    });

    beforeEach(async () => {
        testEmail = `test-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        testUser = await createTestUser(app, userRepository, createdUserIds, testEmail, testPassword);
    });

    describe('validateCredentials', () => {
        it('should validate correct credentials', async () => {
            const validatedUser = await authService.validateCredentials(testEmail, testPassword);

            expect(validatedUser).not.toBeNull();
            expect(validatedUser!.id).toBe(testUser.id);
            expect(validatedUser!.email).toBe(testEmail);
        });

        it('should not validate incorrect password', async () => {
            const validatedUser = await authService.validateCredentials(testEmail, 'wrongpassword');

            expect(validatedUser).toBeNull();
        });

        it('should not validate non-existent user', async () => {
            const validatedUser = await authService.validateCredentials('nonexistent@test.com', testPassword);

            expect(validatedUser).toBeNull();
        });
    });

    describe('login', () => {
        it('should generate access token and update lastLoginAt', async () => {
            const mockResponse = createMockResponse();
            const ipAddress = '127.0.0.1';
            const deviceInfo = 'Test Device';

            const originalLastLoginAt = testUser.lastLoginAt;

            const loginResult = await authService.login(testUser, ipAddress, deviceInfo, mockResponse);

            expect(loginResult.accessToken).toBeDefined();
            expect(loginResult.user).toBeDefined();

            expect(mockResponse.setHeader).toHaveBeenCalledWith('Authorization', expect.stringContaining('Bearer '));

            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'access_token',
                expect.any(String),
                expect.objectContaining({
                    httpOnly: true,
                    secure: expect.any(Boolean),
                    sameSite: 'strict',
                })
            );

            const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
            expect(updatedUser!.lastLoginAt).not.toEqual(originalLastLoginAt);
        });
    });

    describe('refresh tokens', () => {
        it('should create a refresh token', async () => {
            const mockResponse = createMockResponse();
            const deviceInfo = 'Test Device';
            const ipAddress = '127.0.0.1';

            const token = await authService.createRefreshToken(testUser.id, deviceInfo, ipAddress, mockResponse);

            expect(token).toBeDefined();

            expect(mockResponse.cookie).toHaveBeenCalledWith(
                'refresh_token',
                token,
                expect.objectContaining({
                    httpOnly: true,
                    secure: expect.any(Boolean),
                    sameSite: 'strict',
                })
            );

            const savedToken = await refreshTokenRepository.findOne({
                where: { token, userId: testUser.id },
            });
            expect(savedToken).toBeDefined();
            expect(savedToken!.token).toBe(token);
            expect(savedToken!.deviceInfo).toBe(deviceInfo);
            expect(savedToken!.ipAddress).toBe(ipAddress);
        });

        it('should validate a valid refresh token', async () => {
            const token = await authService.createRefreshToken(testUser.id);

            const validatedUser = await authService.validateRefreshToken(token);

            expect(validatedUser).not.toBeNull();
            expect(validatedUser!.id).toBe(testUser.id);
        });

        it('should not validate a revoked refresh token', async () => {
            const token = await authService.createRefreshToken(testUser.id);
            await authService.revokeRefreshToken(token);

            const validatedUser = await authService.validateRefreshToken(token);

            expect(validatedUser).toBeNull();
        });

        it('should not validate an expired refresh token', async () => {
            const token = await authService.createRefreshToken(testUser.id);

            await refreshTokenRepository.update({ token }, { expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) });
            const validatedUser = await authService.validateRefreshToken(token);

            expect(validatedUser).toBeNull();

            const revokedToken = await refreshTokenRepository.findOne({ where: { token } });
            expect(revokedToken!.isRevoked).toBe(true);
        });
        it('should revoke all refresh tokens for a user', async () => {
            const token1 = await authService.createRefreshToken(testUser.id);
            const token2 = await authService.createRefreshToken(testUser.id);

            await authService.revokeAllUserRefreshTokens(testUser.id);

            const validatedUser1 = await authService.validateRefreshToken(token1);
            const validatedUser2 = await authService.validateRefreshToken(token2);

            expect(validatedUser1).toBeNull();
            expect(validatedUser2).toBeNull();
        });
    });

    describe('password reset', () => {
        it('should create a password reset token', async () => {
            const token = await authService.createPasswordResetToken(testEmail);

            expect(token).toBeDefined();

            const savedToken = await passwordResetRepository.findOne({ where: { token } });
            expect(savedToken).toBeDefined();
            expect(savedToken!.email).toBe(testEmail);
            expect(savedToken!.isUsed).toBe(false);
        });

        it('should throw error when creating reset token for non-existent email', async () => {
            await expect(authService.createPasswordResetToken('non-existent@test.com')).rejects.toThrow(
                'User with this email does not exist'
            );
        });

        it('should validate a valid password reset token', async () => {
            const token = await authService.createPasswordResetToken(testEmail);

            const email = await authService.validatePasswordResetToken(token);

            expect(email).toBe(testEmail);
        });

        it('should return null for invalid password reset token', async () => {
            const email = await authService.validatePasswordResetToken('invalid-token');

            expect(email).toBeNull();
        });

        it('should reset a password with valid token', async () => {
            const token = await authService.createPasswordResetToken(testEmail);
            const newPassword = 'NewPassword456!';

            const result = await authService.resetPassword(token, newPassword);

            expect(result).toEqual({ success: true, message: 'Password reset successfully' });

            const validatedUser = await authService.validateCredentials(testEmail, newPassword);
            expect(validatedUser).not.toBeNull();

            const usedToken = await passwordResetRepository.findOne({ where: { token } });
            expect(usedToken!.isUsed).toBe(true);
        });

        it('should throw error when resetting password with invalid token', async () => {
            await expect(authService.resetPassword('invalid-token', 'NewPassword123!')).rejects.toThrow(
                'Invalid or expired password reset token'
            );
        });
    });
    describe('email verification', () => {
        it('should create an email verification token', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);

            expect(token).toBeDefined();

            const savedToken = await emailVerificationRepository.findOne({ where: { token } });
            expect(savedToken).toBeDefined();
            expect(savedToken!.email).toBe(testEmail);
            expect(savedToken!.isUsed).toBe(false);
        });

        it('should verify email with valid token', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);

            const result = await authService.verifyEmail(token);

            expect(result).toEqual({ success: true, message: 'Email verified successfully' });

            const verifiedUser = await userRepository.findOne({ where: { id: testUser.id } });
            expect(verifiedUser!.isEmailVerified).toBe(true);

            const usedToken = await emailVerificationRepository.findOne({ where: { token } });
            expect(usedToken!.isUsed).toBe(true);
        });

        it('should throw error when verifying with invalid token', async () => {
            await expect(authService.verifyEmail('invalid-token')).rejects.toThrow(
                'Invalid or expired verification token'
            );
        });

        it('should throw error when verifying with used token', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);
            await authService.verifyEmail(token);

            await expect(authService.verifyEmail(token)).rejects.toThrow('Invalid or expired verification token');
        });

        it('should create different tokens for the same email', async () => {
            const token1 = await authService.createEmailVerificationToken(testEmail);
            const token2 = await authService.createEmailVerificationToken(testEmail);

            expect(token1).not.toBe(token2);
        });
    });
});
