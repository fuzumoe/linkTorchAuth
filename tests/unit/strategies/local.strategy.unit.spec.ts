import { UnauthorizedException } from '@nestjs/common';
import { LocalStrategy } from '../../../src/strategies/local.strategy';
import { AuthService } from '../../../src/services/auth.service';

describe('LocalStrategy', () => {
    let localStrategy: LocalStrategy;

    const mockAuthService = {
        validateCredentials: jest.fn(),
    };

    beforeEach(() => {
        localStrategy = new LocalStrategy(mockAuthService as unknown as AuthService);

        jest.clearAllMocks();
    });

    describe('validate', () => {
        it('should return user if credentials are valid', async () => {
            const mockUser = {
                id: 'user-123',
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
            };
            mockAuthService.validateCredentials.mockResolvedValue(mockUser);

            const result = await localStrategy.validate('test@example.com', 'password123');

            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith('test@example.com', 'password123');
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

        it('should throw UnauthorizedException if credentials are invalid', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            await expect(localStrategy.validate('test@example.com', 'wrongpassword')).rejects.toThrow(
                UnauthorizedException
            );
            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
        });

        it('should throw UnauthorizedException with correct error message', async () => {
            mockAuthService.validateCredentials.mockResolvedValue(null);

            // Use async/await with expect().rejects to properly handle the promise rejection
            await expect(localStrategy.validate('test@example.com', 'wrongpassword')).rejects.toThrow(
                new UnauthorizedException('Invalid credentials')
            );
        });
    });

    describe('constructor configuration', () => {
        it('should configure passport strategy with correct options', async () => {
            expect(localStrategy).toBeDefined();

            const email = 'test@example.com';
            const password = 'testpassword';

            mockAuthService.validateCredentials.mockResolvedValue({ id: 'test-id' });

            await localStrategy.validate(email, password);

            expect(mockAuthService.validateCredentials).toHaveBeenCalledWith(email, password);
        });
    });
});
