import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const IpAddress = createParamDecorator((_: unknown, executionContext: ExecutionContext): string => {
    const request = executionContext.switchToHttp().getRequest<Request>();
    return request.ip || '';
});

export const RequestHeader = createParamDecorator(
    (header: string, executionContext: ExecutionContext): string | undefined => {
        const request = executionContext.switchToHttp().getRequest<Request>();
        const headerValue = request.headers[header?.toLowerCase() || ''];

        if (Array.isArray(headerValue)) {
            return headerValue[0];
        }

        return headerValue;
    }
);

export const QueryParam = createParamDecorator(
    (param: string, executionContext: ExecutionContext): string | Record<string, string> | undefined => {
        const request = executionContext.switchToHttp().getRequest<Request>();
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
