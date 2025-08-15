import { RequestWithUser } from '@auth/interfaces/auth.interface';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../entities/user.entity';

export const CurrentUser = createParamDecorator((_: unknown, executionContext: ExecutionContext): Partial<User> => {
    const request: RequestWithUser = executionContext.switchToHttp().getRequest();
    const user = request.user;
    return user;
});

export const UserProperty = createParamDecorator((property: string, executionContext: ExecutionContext): any => {
    const request: RequestWithUser = executionContext.switchToHttp().getRequest();
    const user = request.user;

    return property ? user?.[property] : user;
});
