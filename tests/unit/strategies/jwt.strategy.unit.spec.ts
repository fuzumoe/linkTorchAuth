import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import appConfig from '../../../src/config/app.config';
import { JwtPayload } from '../../../src/interfaces/auth.interface';
import { UserService } from '../../../src/services/user.service';
import { JwtStrategy } from '../../../src/strategies/jwt.strategy';

describe('JwtStrategy', () => {
    let jwtStrategy: JwtStrategy;

    const mockUserService = {
        findById: jest.fn(),
    };

    // Mock app config values
    const mockAppConfig = {
        jwtSecret: 'test-secret-key',
        jwtExpiresIn: 3600,
    };

    beforeEach(async () => {
        // Reset mocks before setup
        jest.clearAllMocks();

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: appConfig.KEY,
                    useValue: mockAppConfig,
                },
            ],
        }).compile();

        jwtStrategy = moduleRef.get<JwtStrategy>(JwtStrategy);

        // Don't clear mocks after setup - that would erase the constructor calls
    });

    describe('validate', () => {
        it('should return user without password if user is found', async () => {
            const payload: JwtPayload = { sub: 'user-123' };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
            };

            mockUserService.findById.mockResolvedValue(mockUser);

            const result = await jwtStrategy.validate(payload);

            expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({
                id: 'user-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                avatar: undefined,
                isEmailVerified: undefined,
                isActive: undefined,
                role: undefined,
                createdAt: undefined,
                updatedAt: undefined,
            });
        });

        it('should throw UnauthorizedException if user is not found', async () => {
            const payload: JwtPayload = { sub: 'non-existent-user' };
            mockUserService.findById.mockResolvedValue(null);

            await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
            expect(mockUserService.findById).toHaveBeenCalledWith('non-existent-user');
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            const payload: JwtPayload = { sub: 'non-existent-user' };
            mockUserService.findById.mockResolvedValue(null);

            try {
                await jwtStrategy.validate(payload);
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('User not found');
            }
        });

        it('should remove password from user object', async () => {
            const payload: JwtPayload = { sub: 'user-123' };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
                roles: ['user'],
                createdAt: new Date(),
            };

            mockUserService.findById.mockResolvedValue(mockUser);

            const result = await jwtStrategy.validate(payload);

            expect(result).not.toHaveProperty('password');
            expect(Object.keys(result)).toEqual(
                expect.arrayContaining([
                    'id',
                    'email',
                    'firstName',
                    'lastName',
                    'avatar',
                    'isEmailVerified',
                    'isActive',
                    'role',
                    'createdAt',
                    'updatedAt',
                ])
            );
        });
    });

    describe('constructor configuration', () => {
        it('should set up the strategy correctly', () => {
            // Just verify the strategy was created successfully
            expect(jwtStrategy).toBeDefined();

            // We can't directly check if the config was used, but we can verify it's properly instantiated
            // by testing its behavior in previous tests
        });
    });
});
