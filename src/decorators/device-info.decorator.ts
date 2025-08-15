import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export function normalizeIp(ip?: string): string {
    if (!ip) return 'unknown';
    const first = ip.split(',')[0].trim();
    if (first === '::1') return '127.0.0.1';
    if (first.startsWith('::ffff:')) return first.slice('::ffff:'.length);
    return first;
}

export function getClientIp(request: Request): string {
    const xfwd = request.headers['x-forwarded-for'];
    if (Array.isArray(xfwd)) return normalizeIp(xfwd[0]);
    if (typeof xfwd === 'string' && xfwd.length > 0) return normalizeIp(xfwd);

    const socketRemoteAddress = request.socket?.remoteAddress;

    const connectionRemoteAddress = request.socket?.remoteAddress;

    return normalizeIp(
        (request.ip as string) ||
            (typeof socketRemoteAddress === 'string' ? socketRemoteAddress : undefined) ||
            (typeof connectionRemoteAddress === 'string' ? connectionRemoteAddress : undefined)
    );
}

export const DeviceInfo = createParamDecorator((_: unknown, executionContext: ExecutionContext): string => {
    const request: Request = executionContext.switchToHttp().getRequest();
    const ipAddress = getClientIp(request);
    const uaHeader = request.headers['user-agent'];
    const userAgent = typeof uaHeader === 'string' && uaHeader.trim().length > 0 ? uaHeader : '';

    return userAgent ? `${userAgent} (${ipAddress})` : ipAddress;
});

export const DeviceInfoObj = createParamDecorator(
    (_: unknown, executionContext: ExecutionContext): { userAgent?: string; ipAddress: string } => {
        const request: Request = executionContext.switchToHttp().getRequest();
        const ipAddress = getClientIp(request);
        const uaHeader = request.headers['user-agent'];
        const userAgent = typeof uaHeader === 'string' && uaHeader.trim().length > 0 ? uaHeader : undefined;

        return {
            userAgent,
            ipAddress: String(ipAddress),
        };
    }
);
