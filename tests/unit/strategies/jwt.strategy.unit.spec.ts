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
        // Mock the config service to return a test secret key
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

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should return user without password if user is found', async () => {
            // Arrange
            const payload: JwtPayload = { sub: 'user-123' };

            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
            };

            mockUserService.findById.mockResolvedValue(mockUser);

            // Act
            const result = await jwtStrategy.validate(payload);

            // Assert
            expect(mockUserService.findById).toHaveBeenCalledWith('user-123');
            expect(result).toEqual({
                id: 'user-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
            });
        });

        it('should throw UnauthorizedException if user is not found', async () => {
            // Arrange
            const payload: JwtPayload = { sub: 'non-existent-user' };
            mockUserService.findById.mockResolvedValue(null);

            // Act & Assert
            await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
            expect(mockUserService.findById).toHaveBeenCalledWith('non-existent-user');
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            // Arrange
            const payload: JwtPayload = { sub: 'non-existent-user' };
            mockUserService.findById.mockResolvedValue(null);

            // Act & Assert
            try {
                await jwtStrategy.validate(payload);
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('User not found');
            }
        });

        it('should remove password from user object', async () => {
            // Arrange
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

            // Act
            const result = await jwtStrategy.validate(payload);

            // Assert
            expect(result).not.toHaveProperty('password');
            expect(Object.keys(result)).toEqual(
                expect.arrayContaining(['id', 'email', 'firstName', 'lastName', 'roles', 'createdAt'])
            );
        });
    });

    describe('constructor configuration', () => {
        // The constructor is called when the JwtStrategy is instantiated in the beforeEach block

        it('should set up the strategy correctly', () => {
            // Since the constructor setup happens during beforeEach, we can only
            // verify its indirect effects. For this, we'll check if the strategy was created
            expect(jwtStrategy).toBeDefined();

            // And we'll verify that the strategy is configured correctly by testing its behavior
            const payload: JwtPayload = { sub: 'test-user-id' };
            void jwtStrategy.validate(payload); // void operator to explicitly ignore the promise
            expect(mockUserService.findById).toHaveBeenCalledWith('test-user-id');
        });
    });
});
