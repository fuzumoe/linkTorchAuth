import { RequestWithUser } from '@auth/interfaces/auth.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';

export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): Partial<User> => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    const user = request.user;
    return user;
});

export const UserProperty = createParamDecorator((property: string, ctx: ExecutionContext): any => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    const user = request.user;

    return property ? user?.[property] : user;
});
