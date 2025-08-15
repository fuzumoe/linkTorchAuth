import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { EmailVerification } from '../../../src/entities/email-verification.entity';
import { PasswordReset } from '../../../src/entities/password-reset.entity';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { User } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import {
    cleanupTestUsers,
    createTestUser,
    createTestingModule,
    getCommonServices,
    safeRequest,
} from '../../fixtures/app.fixtures';

describe('AuthController E2E', () => {
    let testingModule: TestingModule;
    let app: INestApplication;
    let authService: AuthService;
    let userRepository: Repository<User>;
    let refreshTokenRepository: Repository<RefreshToken>;
    let passwordResetRepository: Repository<PasswordReset>;
    let emailVerificationRepository: Repository<EmailVerification>;
    let testUser: User;

    const testPassword = 'TestPassword123!';
    let testEmail: string;
    beforeAll(async () => {
        testingModule = await createTestingModule();
        app = testingModule.createNestApplication();

        await app.init();

        const services = getCommonServices(testingModule);
        userRepository = services.userRepository;
        authService = services.authService;

        const dataSource = services.dataSource;
        refreshTokenRepository = dataSource.getRepository(RefreshToken);
        passwordResetRepository = dataSource.getRepository(PasswordReset);
        emailVerificationRepository = dataSource.getRepository(EmailVerification);
    });

    const createdUserIds: string[] = [];

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds);
        await app.close();
    });

    beforeEach(async () => {
        testEmail = `test-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        testUser = await createTestUser(testingModule, userRepository, createdUserIds, testEmail, testPassword);
    });

    describe('login', () => {
        it('should handle authentication properly', async () => {
            const response = await safeRequest(app).post('/auth/login').send({
                email: testEmail,
                password: testPassword,
            });

            expect(response.statusCode).toBe(200);
            expect(response.body.accessToken).toBeDefined();
            expect(response.body.refreshToken).toBeDefined();
            expect(response.body.user).toBeDefined();
            expect(response.body.user.email).toBe(testEmail);
        });

        it('should reject invalid credentials', async () => {
            await safeRequest(app)
                .post('/auth/login')
                .send({
                    email: testEmail,
                    password: 'wrongpassword',
                })
                .expect(401);
        });

        it('should reject non-existent users', async () => {
            await safeRequest(app)
                .post('/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: testPassword,
                })
                .expect(401);
        });
    });

    describe('refresh token', () => {
        it('should validate and refresh tokens properly', async () => {
            const token = await authService.createRefreshToken(testUser.id, 'Test Device', '127.0.0.1');

            const user = await authService.validateRefreshToken(token);
            expect(user).not.toBeNull();
            expect(user?.id).toBe(testUser.id);

            await authService.revokeRefreshToken(token);

            const revokedCheck = await authService.validateRefreshToken(token);
            expect(revokedCheck).toBeNull();

            const tokenRecord = await refreshTokenRepository.findOne({ where: { token } });
            expect(tokenRecord?.isRevoked).toBe(true);
        });
    });

    describe('logout', () => {
        it('should revoke refresh tokens on logout', async () => {
            const token = await authService.createRefreshToken(testUser.id, 'Test Device', '127.0.0.1');

            const mockResponse = { clearCookie: jest.fn() } as unknown as Response;

            const result = await authService.logout(testUser.id, token, mockResponse, false);

            expect(result.success).toBe(true);

            const tokenRecord = await refreshTokenRepository.findOne({ where: { token } });
            expect(tokenRecord?.isRevoked).toBe(true);
        });
    });

    describe('logout from all devices', () => {
        it('should revoke all refresh tokens for a user', async () => {
            const token1 = await authService.createRefreshToken(testUser.id, 'Device 1', '127.0.0.1');
            const token2 = await authService.createRefreshToken(testUser.id, 'Device 2', '127.0.0.2');

            const mockResponse = { clearCookie: jest.fn() } as unknown as Response;

            const result = await authService.logout(testUser.id, undefined, mockResponse, true);

            expect(result.success).toBe(true);

            const token1Record = await refreshTokenRepository.findOne({ where: { token: token1 } });
            const token2Record = await refreshTokenRepository.findOne({ where: { token: token2 } });
            expect(token1Record?.isRevoked).toBe(true);
            expect(token2Record?.isRevoked).toBe(true);
        });
    });

    describe('password reset', () => {
        it('should request password reset for existing user', async () => {
            const response = await safeRequest(app)
                .post('/auth/password-reset-request')
                .send({ email: testEmail })
                .expect(201);

            expect(response.body.success).toBe(true);

            const resetTokens = await passwordResetRepository.find({ where: { email: testEmail } });
            expect(resetTokens.length).toBeGreaterThan(0);
            expect(resetTokens[resetTokens.length - 1].isUsed).toBe(false);
        });

        it('should handle non-existent user securely', async () => {
            const response = await safeRequest(app)
                .post('/auth/password-reset-request')
                .send({ email: 'nonexistent@example.com' });

            expect(response.status).toBe(400);
        });

        it('should reset password with valid token', async () => {
            const token = await authService.createPasswordResetToken(testEmail);
            const newPassword = 'NewPassword456!';

            const result = await authService.resetPassword(token, newPassword);

            expect(result.success).toBe(true);

            const resetToken = await passwordResetRepository.findOne({ where: { token } });
            expect(resetToken?.isUsed).toBe(true);

            const validUser = await authService.validateCredentials(testEmail, newPassword);
            expect(validUser).not.toBeNull();
            expect(validUser?.email).toBe(testEmail);

            const invalidUser = await authService.validateCredentials(testEmail, testPassword);
            expect(invalidUser).toBeNull();
        });
    });

    describe('email verification', () => {
        it('should create email verification token', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);

            const tokens = await emailVerificationRepository.find({ where: { email: testEmail } });
            expect(tokens.length).toBeGreaterThan(0);

            expect(tokens[tokens.length - 1].isUsed).toBe(false);
            expect(tokens[tokens.length - 1].token).toBe(token);
        });

        it('should verify email with valid token', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);

            const response = await safeRequest(app).post('/auth/verify-email').send({ token }).expect(201);

            expect(response.body.success).toBe(true);

            const user = await userRepository.findOne({ where: { id: testUser.id } });
            expect(user?.isEmailVerified).toBe(true);

            const verificationToken = await emailVerificationRepository.findOne({ where: { token } });
            expect(verificationToken?.isUsed).toBe(true);
        });

        it('should fail with invalid verification token', async () => {
            await safeRequest(app).post('/auth/verify-email').send({ token: 'invalid-token' }).expect(401);
        });

        it('should resend verification email for unverified user', async () => {
            const newEmail = `unverified-${uuidv4().substring(0, 8)}@test.integration.com`;
            const unverifiedUser = await createTestUser(
                testingModule,
                userRepository,
                createdUserIds,
                newEmail,
                testPassword
            );

            await userRepository.update({ id: unverifiedUser.id }, { isEmailVerified: false });

            const response = await safeRequest(app)
                .post('/auth/resend-verification')
                .send({ email: newEmail })
                .expect(201);

            expect(response.body.success).toBe(true);

            const verificationTokens = await emailVerificationRepository.find({ where: { email: newEmail } });
            expect(verificationTokens.length).toBeGreaterThan(0);
        });

        it('should not resend verification for already verified email', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);
            await authService.verifyEmail(token);

            const response = await safeRequest(app)
                .post('/auth/resend-verification')
                .send({ email: testEmail })
                .expect(201);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('already verified');
        });
    });
});
