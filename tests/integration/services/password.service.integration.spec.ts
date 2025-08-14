import { TestingModule } from '@nestjs/testing';
import { PasswordService } from '../../../src/services/password.service';
import * as bcrypt from 'bcrypt';
import { createTestingModule, getCommonServices } from '../../fixtures/app.fixtures';

describe('PasswordService Integration', () => {
    let app: TestingModule;
    let passwordService: PasswordService;

    beforeAll(async () => {
        app = await createTestingModule();
        const services = getCommonServices(app);
        passwordService = services.passwordService;
    });

    describe('hashPassword', () => {
        it('should hash a password correctly', async () => {
            const plainPassword = 'TestPassword123!';

            const hashedPassword = await passwordService.hashPassword(plainPassword);

            expect(hashedPassword).toMatch(/^\$2[abxy]\$/);

            const isValid = await bcrypt.compare(plainPassword, hashedPassword);
            expect(isValid).toBe(true);
        });

        it('should generate different hashes for the same password', async () => {
            const plainPassword = 'TestPassword123!';

            const hash1 = await passwordService.hashPassword(plainPassword);
            const hash2 = await passwordService.hashPassword(plainPassword);

            expect(hash1).not.toEqual(hash2);
        });
    });

    describe('comparePasswords', () => {
        it('should return true for matching password', async () => {
            const plainPassword = 'TestPassword123!';
            const hashedPassword = await passwordService.hashPassword(plainPassword);

            const result = await passwordService.comparePasswords(plainPassword, hashedPassword);

            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            const plainPassword = 'TestPassword123!';
            const wrongPassword = 'WrongPassword123!';
            const hashedPassword = await passwordService.hashPassword(plainPassword);

            const result = await passwordService.comparePasswords(wrongPassword, hashedPassword);

            expect(result).toBe(false);
        });
    });

    describe('isPasswordHashed', () => {
        it('should return true for bcrypt hashed password', async () => {
            const plainPassword = 'TestPassword123!';
            const hashedPassword = await passwordService.hashPassword(plainPassword);

            const result = passwordService.isPasswordHashed(hashedPassword);

            expect(result).toBe(true);
        });

        it('should return false for plain text password', () => {
            const plainPassword = 'TestPassword123!';

            const result = passwordService.isPasswordHashed(plainPassword);

            expect(result).toBe(false);
        });

        it('should return false for null or undefined input', () => {
            expect(passwordService.isPasswordHashed(null)).toBe(false);
            expect(passwordService.isPasswordHashed(undefined)).toBe(false);
        });

        it('should return false for empty string', () => {
            expect(passwordService.isPasswordHashed('')).toBe(false);
        });

        it('should return true for passwords with different bcrypt versions', () => {
            const bcryptHashSamples = [
                '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
                '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
                '$2x$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
                '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
            ];

            for (const hash of bcryptHashSamples) {
                expect(passwordService.isPasswordHashed(hash)).toBe(true);
            }
        });
    });

    describe('Performance', () => {
        it('should hash password in a reasonable time', async () => {
            const plainPassword = 'TestPassword123!';

            const startTime = Date.now();
            await passwordService.hashPassword(plainPassword);
            const endTime = Date.now();

            const executionTime = endTime - startTime;

            expect(executionTime).toBeLessThan(500);
        });
    });
});
