import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const IpAddress = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.ip || '';
});

export const RequestHeader = createParamDecorator((header: string, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const headerValue = request.headers[header?.toLowerCase() || ''];

    // Handle both string and string[] cases that can come from headers
    if (Array.isArray(headerValue)) {
        return headerValue[0];
    }

    return headerValue;
});

export const QueryParam = createParamDecorator(
    (param: string, ctx: ExecutionContext): string | Record<string, string> | undefined => {
        const request = ctx.switchToHttp().getRequest<Request>();
        const query = request.query as Record<string, string | string[]>;

        if (!param) {
            return query as Record<string, string>;
        }

        const value = query[param];

        if (Array.isArray(value)) {
            return value[0];
        }

        return value;
    }
);
