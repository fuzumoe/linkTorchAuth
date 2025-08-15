import { ExecutionContext } from '@nestjs/common';
import { UserRole } from '../../../src/entities/user.entity';

// Mock the @nestjs/common module
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
jest.mock('@nestjs/common', () => {
    const original = jest.requireActual('@nestjs/common');
    return {
        ...original,
        // Type-safe mock of createParamDecorator
        createParamDecorator: (factory: (data: unknown, ctx: ExecutionContext) => unknown) => factory,
    };
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

describe('User Decorators', () => {
    // Test helper function to create mock context
    function createMockContext(userData: unknown) {
        const mockGetRequest = jest.fn().mockReturnValue({ user: userData });
        const mockSwitchToHttp = jest.fn().mockReturnValue({ getRequest: mockGetRequest });

        return {
            mockGetRequest,
            mockSwitchToHttp,
            mockContext: {
                switchToHttp: mockSwitchToHttp,
            } as unknown as ExecutionContext,
        };
    }

    // Re-import the decorators for each test to avoid module caching issues
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    function getDecorators() {
        return jest.requireActual('../../../src/decorators/user.decorator');
    }
    /* eslint-enable @typescript-eslint/no-unsafe-return */

    describe('CurrentUser', () => {
        it('should extract user from request object', () => {
            // Setup
            const mockUser = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                role: UserRole.USER,
                isActive: true,
            };
            const { mockContext, mockSwitchToHttp, mockGetRequest } = createMockContext(mockUser);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const CurrentUser = getDecorators().CurrentUser;
            const result = CurrentUser(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(mockSwitchToHttp).toHaveBeenCalled();
            expect(mockGetRequest).toHaveBeenCalled();
            expect(result).toEqual(mockUser);
        });

        it('should return undefined when user is not present', () => {
            // Setup
            const { mockContext, mockSwitchToHttp, mockGetRequest } = createMockContext(undefined);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const CurrentUser = getDecorators().CurrentUser;
            const result = CurrentUser(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(mockSwitchToHttp).toHaveBeenCalled();
            expect(mockGetRequest).toHaveBeenCalled();
            // CurrentUser now returns undefined when user is not present
            expect(result).toEqual(undefined);
        });
    });

    describe('UserProperty', () => {
        it('should extract specific user property', () => {
            // Setup
            const mockUser = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                role: UserRole.USER,
                isActive: true,
            };
            const { mockContext } = createMockContext(mockUser);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const UserProperty = getDecorators().UserProperty;
            const result = UserProperty('email', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toEqual('test@example.com');
        });

        it('should return entire user when property is not provided', () => {
            // Setup
            const mockUser = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
                role: UserRole.USER,
                isActive: true,
            };
            const { mockContext } = createMockContext(mockUser);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const UserProperty = getDecorators().UserProperty;
            const result = UserProperty('', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toEqual(mockUser);
        });

        it('should return undefined for non-existent property', () => {
            // Setup
            const mockUser = {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'test@example.com',
            };
            const { mockContext } = createMockContext(mockUser);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const UserProperty = getDecorators().UserProperty;
            const result = UserProperty('nonExistentProperty', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            // Updated to match current implementation - returns undefined for non-existent property
            expect(result).toBeUndefined();
        });

        it('should return undefined when user is not present', () => {
            // Setup
            const { mockContext } = createMockContext(undefined);

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const UserProperty = getDecorators().UserProperty;
            const result = UserProperty('email', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBeUndefined();
        });
    });
});
