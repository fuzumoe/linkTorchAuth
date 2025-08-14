import { UnauthorizedException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { User } from '../../../src/entities/user.entity';
import { LocalStrategy } from '../../../src/strategies/local.strategy';
import { createTestingModule, cleanupTestUsers, createTestUser, getCommonServices } from '../../fixtures/app.fixtures';
import { UserResponseDto } from '@auth/dtos/user.dto';

describe('LocalStrategy Integration Test', () => {
    let app: TestingModule;
    let localStrategy: LocalStrategy;
    let userRepository: Repository<User>;

    const createdUserIds: string[] = [];
    const testEmail = `local-strategy-test-${Date.now()}@test.integration.com`;
    const testPassword = 'Password123!';

    beforeAll(async () => {
        app = await createTestingModule();

        const services = getCommonServices(app);
        userRepository = services.userRepository;
        localStrategy = services.localStrategy;

        await cleanupTestUsers(userRepository, createdUserIds, '%local-strategy-test%@test.integration.com');
        await createTestUser(app, userRepository, createdUserIds, testEmail, testPassword, 'Local', 'Test');
    });

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds, '%local-strategy-test%@test.integration.com');
        await app.close();
    });

    describe('validate', () => {
        it('should successfully validate user with correct credentials', async () => {
            const result: UserResponseDto = await localStrategy.validate(testEmail, testPassword);

            expect(result).toBeDefined();
            expect(result.email).toBe(testEmail);
            expect(result.firstName).toBe('Local');
            expect(result.lastName).toBe('Test');
        });

        it('should throw UnauthorizedException with invalid email', async () => {
            await expect(localStrategy.validate('wrong@email.com', testPassword)).rejects.toThrow(
                UnauthorizedException
            );
        });

        it('should throw UnauthorizedException with invalid password', async () => {
            await expect(localStrategy.validate(testEmail, 'wrongpassword')).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            try {
                await localStrategy.validate('wrong@email.com', 'wrongpassword');
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('Invalid credentials');
            }
        });
    });
});
