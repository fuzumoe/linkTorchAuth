import { ExecutionContext } from '@nestjs/common';
import { normalizeIp, getClientIp } from '../../../src/decorators/device-info.decorator';
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

// Test helper function to create mock context
function createMockContext(headers: Record<string, unknown> = {}, ip?: string) {
    const mockRequest = {
        headers,
        ip,
        connection: {},
        socket: {},
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
    return jest.requireActual('../../../src/decorators/device-info.decorator');
}
/* eslint-enable @typescript-eslint/no-unsafe-return */

describe('Device Info Decorators', () => {
    describe('normalizeIp', () => {
        it('should return unknown for undefined or null input', () => {
            expect(normalizeIp(undefined)).toBe('unknown');
            expect(normalizeIp(null as unknown as string)).toBe('unknown');
            expect(normalizeIp('')).toBe('unknown');
        });

        it('should handle IPv4 addresses correctly', () => {
            expect(normalizeIp('192.168.1.1')).toBe('192.168.1.1');
            expect(normalizeIp('10.0.0.1')).toBe('10.0.0.1');
        });

        it('should handle IPv6-mapped IPv4 addresses correctly', () => {
            expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
        });

        it('should handle IPv6 localhost correctly', () => {
            expect(normalizeIp('::1')).toBe('127.0.0.1');
        });

        it('should use the first IP when multiple are provided', () => {
            expect(normalizeIp('192.168.1.1, 10.0.0.1')).toBe('192.168.1.1');
            expect(normalizeIp('::ffff:192.168.1.1, 10.0.0.1')).toBe('192.168.1.1');
        });
    });

    describe('getClientIp', () => {
        it('should handle x-forwarded-for header as string', () => {
            const mockReq = {
                headers: { 'x-forwarded-for': '192.168.1.1' },
                get: jest.fn(),
                header: jest.fn(),
                accepts: jest.fn(),
                acceptsCharsets: jest.fn(),
                acceptsEncodings: jest.fn(),
                acceptsLanguages: jest.fn(),
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('192.168.1.1');
        });

        it('should handle x-forwarded-for header as array', () => {
            const mockReq = {
                headers: { 'x-forwarded-for': ['192.168.1.1'] },
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('192.168.1.1');
        });

        it('should fall back to req.ip if x-forwarded-for is not provided', () => {
            const mockReq = {
                headers: {},
                ip: '192.168.1.1',
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('192.168.1.1');
        });

        it('should fall back to req.socket.remoteAddress if req.ip is not available', () => {
            const mockReq = {
                headers: {},
                socket: { remoteAddress: '192.168.1.1' },
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('192.168.1.1');
        });

        it('should fall back to req.connection.remoteAddress if other sources are not available', () => {
            const mockReq = {
                headers: {},
                connection: { remoteAddress: '192.168.1.1' },
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('192.168.1.1');
        });

        it('should handle empty string values correctly', () => {
            const mockReq = {
                headers: { 'x-forwarded-for': '' },
            } as unknown as Request;
            expect(getClientIp(mockReq)).toBe('unknown');
        });
    });

    describe('DeviceInfo Decorator', () => {
        it('should format device info with user agent and IP address', () => {
            const { mockContext } = createMockContext({ 'user-agent': 'Test Browser' }, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfo = getDecorators().DeviceInfo;
            const result = DeviceInfo(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toBe('Test Browser (192.168.1.1)');
        });

        it('should handle missing user agent', () => {
            const { mockContext } = createMockContext({}, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfo = getDecorators().DeviceInfo;
            const result = DeviceInfo(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toBe('192.168.1.1');
        });

        it('should handle empty user agent string', () => {
            const { mockContext } = createMockContext({ 'user-agent': '' }, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfo = getDecorators().DeviceInfo;
            const result = DeviceInfo(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toBe('192.168.1.1');
        });

        it('should use x-forwarded-for header when available', () => {
            const { mockContext } = createMockContext({
                'user-agent': 'Test Browser',
                'x-forwarded-for': '203.0.113.195',
            });

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfo = getDecorators().DeviceInfo;
            const result = DeviceInfo(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toBe('Test Browser (203.0.113.195)');
        });
    });

    describe('DeviceInfoObj Decorator', () => {
        it('should return device info as object with user agent and IP address', () => {
            const { mockContext } = createMockContext({ 'user-agent': 'Test Browser' }, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfoObj = getDecorators().DeviceInfoObj;
            const result = DeviceInfoObj(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toEqual({
                userAgent: 'Test Browser',
                ipAddress: '192.168.1.1',
            });
        });

        it('should handle missing user agent', () => {
            const { mockContext } = createMockContext({}, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfoObj = getDecorators().DeviceInfoObj;
            const result = DeviceInfoObj(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toEqual({
                userAgent: undefined,
                ipAddress: '192.168.1.1',
            });
        });

        it('should handle empty user agent string', () => {
            const { mockContext } = createMockContext({ 'user-agent': '' }, '192.168.1.1');

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfoObj = getDecorators().DeviceInfoObj;
            const result = DeviceInfoObj(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toEqual({
                userAgent: undefined,
                ipAddress: '192.168.1.1',
            });
        });

        it('should use x-forwarded-for header when available', () => {
            const { mockContext } = createMockContext({
                'user-agent': 'Test Browser',
                'x-forwarded-for': '203.0.113.195',
            });

            /* eslint-disable @typescript-eslint/no-unsafe-assignment */
            const DeviceInfoObj = getDecorators().DeviceInfoObj;
            const result = DeviceInfoObj(undefined, mockContext);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment */

            expect(result).toEqual({
                userAgent: 'Test Browser',
                ipAddress: '203.0.113.195',
            });
        });
    });
});
