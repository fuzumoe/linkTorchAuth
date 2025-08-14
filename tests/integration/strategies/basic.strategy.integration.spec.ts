import { UnauthorizedException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { User } from '../../../src/entities/user.entity';
import { BasicStrategy } from '../../../src/strategies/basic.strategy';
import { createTestingModule, cleanupTestUsers, createTestUser, getCommonServices } from '../../fixtures/app.fixtures';

describe('BasicStrategy Integration Test', () => {
    let app: TestingModule;
    let basicStrategy: BasicStrategy;
    let userRepository: Repository<User>;

    const createdUserIds: string[] = [];
    const testEmail = `basic-strategy-test-${Date.now()}@test.integration.com`;
    const testPassword = 'Password123!';

    beforeAll(async () => {
        app = await createTestingModule();

        const services = getCommonServices(app);
        userRepository = services.userRepository;
        basicStrategy = services.basicStrategy;

        await cleanupTestUsers(userRepository, createdUserIds, '%basic-strategy-test%@test.integration.com');
        await createTestUser(app, userRepository, createdUserIds, testEmail, testPassword, 'Basic', 'Test');
    });

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds, '%basic-strategy-test%@test.integration.com');
        await app.close();
    });

    describe('validate', () => {
        it('should successfully validate user with correct credentials', async () => {
            const result = await basicStrategy.validate(testEmail, testPassword);

            expect(result).toBeDefined();
            expect(result.email).toBe(testEmail);
            expect(result.firstName).toBe('Basic');
            expect(result.lastName).toBe('Test');
        });

        it('should throw UnauthorizedException with invalid email', async () => {
            await expect(basicStrategy.validate('wrong@email.com', testPassword)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should throw UnauthorizedException with invalid password', async () => {
            await expect(basicStrategy.validate(testEmail, 'wrongpassword')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            try {
                await basicStrategy.validate('wrong@email.com', 'wrongpassword');
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('Invalid credentials');
            }
        });
    });
});
