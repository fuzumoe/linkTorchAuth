import { UnauthorizedException } from '@nestjs/common';
import { BasicStrategy } from '../../../src/strategies/basic.strategy';
import { AuthService } from '../../../src/services/auth.service';

describe('BasicStrategy', () => {
    let basicStrategy: BasicStrategy;
    const mockAuthService = {
        validateCredentials: jest.fn(),
    };

    beforeEach(() => {
        // Direct instantiation with the mock service
        basicStrategy = new BasicStrategy(mockAuthService as unknown as AuthService);

        // Clear all mocks before each test
        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should return user without password if credentials are valid', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
            };
            mockAuthService.validateCredentials.mockResolvedValue(mockUser);

            const result = await basicStrategy.validate('test@example.com', 'password123');

            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith('test@example.com', 'password123');
            expect(result).toEqual({
                id: 'user-123',
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
            });
        });

        it('should throw UnauthorizedException if credentials are invalid', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            await expect(basicStrategy.validate('test@example.com', 'wrongpassword')).rejects.toThrow(
                UnauthorizedException
            );
            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            try {
                await basicStrategy.validate('test@example.com', 'wrongpassword');
                fail('Should have thrown UnauthorizedException');
            } catch (error) {
                expect(error).toBeInstanceOf(UnauthorizedException);
                expect(error.message).toBe('Invalid credentials');
            }
        });

        it('should remove password from user object', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
                roles: ['user'],
                createdAt: new Date(),
            };
            mockAuthService.validateCredentials.mockResolvedValue(mockUser);

            const result = await basicStrategy.validate('test@example.com', 'password123');

            expect(result).not.toHaveProperty('password');
            expect(Object.keys(result)).toEqual(
                expect.arrayContaining(['id', 'email', 'firstName', 'lastName', 'roles', 'createdAt'])
            );
        });
    });
});
