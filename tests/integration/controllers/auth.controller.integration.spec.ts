import { TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { AuthController } from '../../../src/controllers/auth.controller';
import { EmailVerification } from '../../../src/entities/email-verification.entity';
import { PasswordReset } from '../../../src/entities/password-reset.entity';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { User } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { UserService } from '../../../src/services/user.service';
import {
    TestResponse,
    cleanupTestUsers,
    createTestUser,
    createTestingModule,
    getCommonServices,
} from '../../fixtures/app.fixtures';

describe('AuthController Integration', () => {
    let testingModule: TestingModule;
    let authController: AuthController;
    let authService: AuthService;
    let userService: UserService;
    let userRepository: Repository<User>;
    let refreshTokenRepository: Repository<RefreshToken>;
    let passwordResetRepository: Repository<PasswordReset>;
    let emailVerificationRepository: Repository<EmailVerification>;
    let testUser: User;

    const testPassword = 'TestPassword123!';
    let testEmail: string;

    beforeAll(async () => {
        testingModule = await createTestingModule();

        const services = getCommonServices(testingModule);
        userRepository = services.userRepository;
        authService = services.authService;
        userService = services.userService;

        authController = new AuthController(userService, authService);

        const dataSource = services.dataSource;
        refreshTokenRepository = dataSource.getRepository(RefreshToken);
        passwordResetRepository = dataSource.getRepository(PasswordReset);
        emailVerificationRepository = dataSource.getRepository(EmailVerification);
    });

    const createdUserIds: string[] = [];

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds);
    });

    beforeEach(async () => {
        testEmail = `test-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        testUser = await createTestUser(testingModule, userRepository, createdUserIds, testEmail, testPassword);
    });

    describe('login', () => {
        it('should handle authentication properly', async () => {
            const response = new TestResponse();

            const result = await authController.login(
                testUser,
                response as unknown as Response,
                '127.0.0.1',
                'Test Browser (Test OS)'
            );

            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(testEmail);
        });

        it('should reject invalid credentials', async () => {
            const invalidUser = await authService.validateCredentials(testEmail, 'wrongpassword');
            expect(invalidUser).toBeNull();
        });

        it('should reject non-existent users', async () => {
            const nonExistentUser = await authService.validateCredentials('nonexistent@example.com', testPassword);
            expect(nonExistentUser).toBeNull();
        });
    });

    describe('refresh token', () => {
        it('should refresh token properly', async () => {
            const token = await authService.createRefreshToken(testUser.id, 'Test Device', '127.0.0.1');

            const response = new TestResponse();

            const result = await authController.refreshToken(
                testUser,
                { refreshToken: token },
                'Test Device (127.0.0.1)',
                response as unknown as Response
            );
            expect(result.accessToken).toBeDefined();
            expect(result.refreshToken).toBeDefined();
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(testEmail);

            const revokedCheck = await authService.validateRefreshToken(token);
            expect(revokedCheck).toBeNull();

            const tokenRecord = await refreshTokenRepository.findOne({ where: { token } });
            expect(tokenRecord?.isRevoked).toBe(true);
        });
    });
    describe('logout', () => {
        it('should revoke refresh tokens on logout', async () => {
            const token = await authService.createRefreshToken(testUser.id, 'Test Device', '127.0.0.1');

            const response = new TestResponse();

            const result = await authService.logout(testUser.id, token, response as unknown as Response, false);

            expect(result.success).toBe(true);

            const tokenRecord = await refreshTokenRepository.findOne({ where: { token } });
            expect(tokenRecord?.isRevoked).toBe(true);
        });
    });

    describe('logout from all devices', () => {
        it('should revoke all refresh tokens for a user', async () => {
            const token1 = await authService.createRefreshToken(testUser.id, 'Device 1', '127.0.0.1');
            const token2 = await authService.createRefreshToken(testUser.id, 'Device 2', '127.0.0.2');

            const response = new TestResponse();

            const result = await authService.logout(testUser.id, undefined, response as unknown as Response, true);

            expect(result.success).toBe(true);
            const token1Record = await refreshTokenRepository.findOne({ where: { token: token1 } });
            const token2Record = await refreshTokenRepository.findOne({ where: { token: token2 } });
            expect(token1Record?.isRevoked).toBe(true);
            expect(token2Record?.isRevoked).toBe(true);
        });
    });

    describe('password reset', () => {
        it('should request password reset for existing user', async () => {
            const result = await authController.requestPasswordReset({ email: testEmail });

            expect(result.success).toBe(true);

            const resetTokens = await passwordResetRepository.find({ where: { email: testEmail } });
            expect(resetTokens.length).toBeGreaterThan(0);
            expect(resetTokens[resetTokens.length - 1].isUsed).toBe(false);
        });

        it('should handle non-existent user securely', async () => {
            jest.spyOn(authService, 'createPasswordResetToken').mockImplementation(async (): Promise<string> => {
                return Promise.resolve('mocked-token');
            });

            const result = await authController.requestPasswordReset({ email: 'nonexistent@example.com' });

            expect(result.success).toBe(true);
            expect(result.message).toContain('If the email exists');

            jest.restoreAllMocks();
        });

        it('should reset password with valid token', async () => {
            const token = await authService.createPasswordResetToken(testEmail);
            const newPassword = 'NewPassword456!';

            const result = await authController.resetPassword({ token, newPassword });

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

            const result = await authController.verifyEmail({ token });
            expect(result.success).toBe(true);

            const user = await userRepository.findOne({ where: { id: testUser.id } });
            expect(user?.isEmailVerified).toBe(true);

            const verificationToken = await emailVerificationRepository.findOne({ where: { token } });
            expect(verificationToken?.isUsed).toBe(true);
        });

        it('should fail with invalid verification token', async () => {
            try {
                await authController.verifyEmail({ token: 'invalid-token' });
                fail('Expected an error to be thrown for invalid token');
            } catch (error) {
                expect(error).toBeDefined();
            }
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

            const result = await authController.resendVerificationEmail({ email: newEmail });
            expect(result.success).toBe(true);

            const verificationTokens = await emailVerificationRepository.find({ where: { email: newEmail } });
            expect(verificationTokens.length).toBeGreaterThan(0);
        });

        it('should not resend verification for already verified email', async () => {
            const token = await authService.createEmailVerificationToken(testEmail);
            await authService.verifyEmail(token);

            await userRepository.update({ id: testUser.id }, { isEmailVerified: true });

            const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
            expect(updatedUser?.isEmailVerified).toBe(true);

            const result = await authController.resendVerificationEmail({ email: testEmail });

            expect(result.success).toBe(false);
            expect(result.message).toContain('already verified');
        });
    });
});
