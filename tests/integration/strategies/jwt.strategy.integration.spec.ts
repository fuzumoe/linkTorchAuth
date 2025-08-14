import { UnauthorizedException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { User } from '../../../src/entities/user.entity';
import { JwtStrategy } from '../../../src/strategies/jwt.strategy';
import { JwtPayload } from '../../../src/interfaces/auth.interface';
import { createTestingModule, cleanupTestUsers, createTestUser, getCommonServices } from '../../fixtures/app.fixtures';
import { UserResponseDto } from '@auth/dtos/user.dto';

describe('JwtStrategy Integration Test', () => {
    let app: TestingModule;
    let jwtStrategy: JwtStrategy;
    let userRepository: Repository<User>;
    let jwtService: JwtService;

    const createdUserIds: string[] = [];
    const testEmail = `jwt-strategy-test-${Date.now()}@test.integration.com`;
    const testPassword = 'Password123!';
    let testUser: User;

    beforeAll(async () => {
        app = await createTestingModule();

        const services = getCommonServices(app);
        userRepository = services.userRepository;
        jwtStrategy = services.jwtStrategy;
        jwtService = app.get(JwtService);

        await cleanupTestUsers(userRepository, createdUserIds, '%jwt-strategy-test%@test.integration.com');
        testUser = await createTestUser(app, userRepository, createdUserIds, testEmail, testPassword, 'JWT', 'Test');
    });

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds, '%jwt-strategy-test%@test.integration.com');
        await app.close();
    });

    describe('validate', () => {
        it('should successfully validate payload with valid user ID', async () => {
            const payload: JwtPayload = { sub: testUser.id };

            const result: UserResponseDto = await jwtStrategy.validate(payload);

            expect(result).toBeDefined();
            expect(result.id).toBe(testUser.id);
            expect(result.email).toBe(testEmail);
            expect(result.firstName).toBe('JWT');
            expect(result.lastName).toBe('Test');
        });

        it('should throw UnauthorizedException with non-existent user ID', async () => {
            const payload: JwtPayload = { sub: '00000000-0000-4000-a000-000000000000' };

            await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
        });

        it('should throw UnauthorizedException with specific error message', async () => {
            const payload: JwtPayload = { sub: '00000000-0000-4000-a000-000000000000' };
            try {
                await jwtStrategy.validate(payload);
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('User not found');
            }
        });

        it('should handle JWT with iat and exp claims', async () => {
            const now = Math.floor(Date.now() / 1000);
            const payload: JwtPayload = {
                sub: testUser.id,
                iat: now,
                exp: now + 3600,
            };

            const result: UserResponseDto = await jwtStrategy.validate(payload);
            expect(result).toBeDefined();
            expect(result.id).toBe(testUser.id);
            expect(result.email).toBe(testEmail);
            expect(result.firstName).toBe('JWT');
            expect(result.lastName).toBe('Test');
        });

        it('should validate a properly signed JWT token', async () => {
            const payload: JwtPayload = { sub: testUser.id };
            const token = jwtService.sign(payload);

            const parts = token.split('.');
            expect(parts.length).toBe(3);

            const decodedPayload: JwtPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString()) as JwtPayload;

            const result: UserResponseDto = await jwtStrategy.validate(decodedPayload);
            expect(result).toBeDefined();
            expect(result.id).toBe(testUser.id);
            expect(result.email).toBe(testEmail);
        });
    });
});
