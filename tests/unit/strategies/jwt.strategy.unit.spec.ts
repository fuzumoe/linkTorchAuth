import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from '../../../src/strategies/jwt.strategy';
import { UserService } from '../../../src/services/user.service';
import { JwtPayload } from '../../../src/interfaces/auth.interface';

describe('JwtStrategy', () => {
    let jwtStrategy: JwtStrategy;

    const mockUserService = {
        findById: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        // Reset mocks before setup
        jest.clearAllMocks();

        mockConfigService.get.mockImplementation((key) => {
            if (key === 'jwt.secret') {
                return 'test-secret-key';
            }
            return null;
        });

        const moduleRef: TestingModule = await Test.createTestingModule({
            providers: [
                JwtStrategy,
                {
                    provide: UserService,
                    useValue: mockUserService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
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

            // Verify that config service was used to get the secret during instantiation
            expect(mockConfigService.get).toHaveBeenCalledWith('jwt.secret');

            // Add test to validate JWT extraction method is configured
            // We can't directly access JwtStrategy's options, but we can verify it's properly instantiated
            // by testing its behavior in previous tests
        });
    });
});
