import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '../dtos/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({
            usernameField: 'email',
            passwordField: 'password',
        });
    }

    async validate(email: string, password: string): Promise<UserResponseDto> {
        const user = await this.authService.validateCredentials(email, password);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        return userResponse;
    }
}
