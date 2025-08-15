import { User } from '@auth/entities/user.entity';

export interface JwtPayload {
    sub: string; // "sub" stands for "subject" in JWT standard - this is the user ID
    iat?: number; // "iat" = issued at timestamp
    exp?: number; // "exp" = expiration timestamp
}

export interface RequestWithUser extends Request {
    user: Partial<User>;
}
