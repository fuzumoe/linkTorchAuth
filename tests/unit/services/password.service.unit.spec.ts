import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordService } from '../../../src/services/password.service';

// Mock bcrypt
jest.mock('bcrypt', () => ({
    genSalt: jest.fn(),
    hash: jest.fn(),
    compare: jest.fn(),
}));

describe('PasswordService', () => {
    let passwordService: PasswordService;
    let loggerSpy: jest.SpyInstance;

    beforeEach(async () => {
        // Create a testing module
        const module: TestingModule = await Test.createTestingModule({
            providers: [PasswordService],
        }).compile();

        // Get the service from the testing module
        passwordService = module.get<PasswordService>(PasswordService);

        // Spy on the logger
        loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation();

        // Clear mocks before each test
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('hashPassword', () => {
        it('should generate a salt with the correct number of rounds', async () => {
            // Arrange
            const password = 'test-password';
            const salt = 'generated-salt';
            const hashedPassword = 'hashed-password';

            // Mock bcrypt functions
            (bcrypt.genSalt as jest.Mock).mockResolvedValue(salt);
            (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

            // Act
            const result = await passwordService.hashPassword(password);

            // Assert
            expect(bcrypt.genSalt).toHaveBeenCalledWith(10); // Check saltRounds parameter
            expect(bcrypt.hash).toHaveBeenCalledWith(password, salt);
            expect(result).toBe(hashedPassword);
            expect(loggerSpy).toHaveBeenCalledWith('Hashing password');
        });

        it('should handle password hashing errors', async () => {
            // Arrange
            const password = 'test-password';
            const error = new Error('Hash failed');

            // Mock bcrypt functions to throw error
            (bcrypt.genSalt as jest.Mock).mockRejectedValue(error);

            // Act & Assert
            await expect(passwordService.hashPassword(password)).rejects.toThrow(error);
            expect(loggerSpy).toHaveBeenCalledWith('Hashing password');
        });
    });

    describe('comparePasswords', () => {
        it('should return true when passwords match', async () => {
            // Arrange
            const plainPassword = 'test-password';
            const hashedPassword = 'hashed-password';

            // Mock bcrypt.compare to return true
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            // Act
            const result = await passwordService.comparePasswords(plainPassword, hashedPassword);

            // Assert
            expect(result).toBe(true);
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
        });

        it('should return false when passwords do not match', async () => {
            // Arrange
            const plainPassword = 'wrong-password';
            const hashedPassword = 'hashed-password';

            // Mock bcrypt.compare to return false
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            // Act
            const result = await passwordService.comparePasswords(plainPassword, hashedPassword);

            // Assert
            expect(result).toBe(false);
            expect(bcrypt.compare).toHaveBeenCalledWith(plainPassword, hashedPassword);
        });

        it('should handle comparison errors', async () => {
            // Arrange
            const plainPassword = 'test-password';
            const hashedPassword = 'hashed-password';
            const error = new Error('Compare failed');

            // Mock bcrypt.compare to throw error
            (bcrypt.compare as jest.Mock).mockRejectedValue(error);

            // Act & Assert
            await expect(passwordService.comparePasswords(plainPassword, hashedPassword)).rejects.toThrow(error);
        });
    });

    describe('isPasswordHashed', () => {
        it('should return true for bcrypt hash format starting with $2b$', () => {
            // Arrange
            const hashedPassword = '$2b$10$abcdefghijklmnopqrstuv';

            // Act
            const result = passwordService.isPasswordHashed(hashedPassword);

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for bcrypt hash format starting with $2a$', () => {
            // Arrange
            const hashedPassword = '$2a$10$abcdefghijklmnopqrstuv';

            // Act
            const result = passwordService.isPasswordHashed(hashedPassword);

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for bcrypt hash format starting with $2x$', () => {
            // Arrange
            const hashedPassword = '$2x$10$abcdefghijklmnopqrstuv';

            // Act
            const result = passwordService.isPasswordHashed(hashedPassword);

            // Assert
            expect(result).toBe(true);
        });

        it('should return true for bcrypt hash format starting with $2y$', () => {
            // Arrange
            const hashedPassword = '$2y$10$abcdefghijklmnopqrstuv';

            // Act
            const result = passwordService.isPasswordHashed(hashedPassword);

            // Assert
            expect(result).toBe(true);
        });

        it('should return false for plain text password', () => {
            // Arrange
            const plainPassword = 'password123';

            // Act
            const result = passwordService.isPasswordHashed(plainPassword);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for different hash format', () => {
            // Arrange
            const differentHash = '$1$abcdefgh'; // MD5 hash format

            // Act
            const result = passwordService.isPasswordHashed(differentHash);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for empty string', () => {
            // Arrange
            const emptyString = '';

            // Act
            const result = passwordService.isPasswordHashed(emptyString);

            // Assert
            expect(result).toBe(false);
        });

        it('should return false for null', () => {
            // Arrange
            const nullValue = null;

            // Act
            const result = passwordService.isPasswordHashed(nullValue as unknown as string);

            // Assert
            expect(result).toBe(false);
        });
    });
});
