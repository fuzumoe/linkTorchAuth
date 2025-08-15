import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '../entities/user.entity';

export interface RequestWithUser extends Request {
    user: Partial<User>;
}

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): Partial<User> => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    return request.user || {};
});

export const UserProperty = createParamDecorator((property: string, ctx: ExecutionContext): unknown => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
        return undefined;
    }

    return property && property in user ? user[property as keyof User] : user;
});
