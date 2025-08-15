import { ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Mock the @nestjs/common module
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */
jest.mock('@nestjs/common', () => {
    const originalModule = jest.requireActual('@nestjs/common');
    return {
        ...originalModule,
        createParamDecorator: (factory: (data: unknown, ctx: ExecutionContext) => unknown) => factory,
    };
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return */

// Helper function to create mock context
function createMockContext(
    options: { ip?: string; headers?: Record<string, unknown>; query?: Record<string, unknown> } = {}
) {
    const { ip = '127.0.0.1', headers = {}, query = {} } = options;

    const mockRequest = {
        headers,
        ip,
        query,
    } as unknown as Request;

    const mockGetRequest = jest.fn().mockReturnValue(mockRequest);
    const mockSwitchToHttp = jest.fn().mockReturnValue({ getRequest: mockGetRequest });

    return {
        mockRequest,
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
    return jest.requireActual('../../../src/decorators/request.decorator');
}
/* eslint-enable @typescript-eslint/no-unsafe-return */

describe('Request Decorators', () => {
    describe('IpAddress', () => {
        it('should extract IP address from request object', () => {
            // Setup
            const { mockContext } = createMockContext({ ip: '192.168.1.1' });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const IpAddress = getDecorators().IpAddress;
            const result = IpAddress(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBe('192.168.1.1');
        });
    });

    describe('RequestHeader', () => {
        it('should extract specific header from request', () => {
            // Setup
            const headers = {
                'user-agent': 'Mozilla/5.0',
                'content-type': 'application/json',
                authorization: 'Bearer token123',
            };
            const { mockContext } = createMockContext({ headers });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const RequestHeader = getDecorators().RequestHeader;
            const result = RequestHeader('user-agent', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBe('Mozilla/5.0');
        });

        it('should handle case-insensitive header names', () => {
            // Setup
            const headers = {
                'content-type': 'application/json',
            };
            const { mockContext } = createMockContext({ headers });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const RequestHeader = getDecorators().RequestHeader;
            const result = RequestHeader('Content-Type', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBe('application/json');
        });

        it('should return undefined for non-existent header', () => {
            // Setup
            const headers = {
                'content-type': 'application/json',
            };
            const { mockContext } = createMockContext({ headers });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const RequestHeader = getDecorators().RequestHeader;
            const result = RequestHeader('x-custom-header', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBeUndefined();
        });

        it('should return undefined when header parameter is not provided', () => {
            // Setup
            const headers = {
                'content-type': 'application/json',
            };
            const { mockContext } = createMockContext({ headers });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const RequestHeader = getDecorators().RequestHeader;
            const result = RequestHeader(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBeUndefined();
        });
    });

    describe('QueryParam', () => {
        it('should extract specific query parameter', () => {
            // Setup
            const query = {
                page: '1',
                limit: '10',
                search: 'test',
            };
            const { mockContext } = createMockContext({ query });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const QueryParam = getDecorators().QueryParam;
            const result = QueryParam('search', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBe('test');
        });

        it('should return entire query object when param is not provided', () => {
            // Setup
            const query = {
                page: '1',
                limit: '10',
            };
            const { mockContext } = createMockContext({ query });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const QueryParam = getDecorators().QueryParam;
            const result = QueryParam(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toEqual(query);
        });

        it('should return undefined for non-existent query parameter', () => {
            // Setup
            const query = {
                page: '1',
                limit: '10',
            };
            const { mockContext } = createMockContext({ query });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const QueryParam = getDecorators().QueryParam;
            const result = QueryParam('nonExistent', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBeUndefined();
        });

        it('should handle empty query object', () => {
            // Setup
            const { mockContext } = createMockContext({ query: {} });

            // Execute
            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const QueryParam = getDecorators().QueryParam;
            const result = QueryParam('page', mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            // Verify
            expect(result).toBeUndefined();
        });
    });
});
