import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { BasicStrategy as Strategy } from 'passport-http';
import { AuthService } from '../services/auth.service';
import { UserResponseDto } from '../dtos/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class BasicStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super();
    }

    async validate(username: string, password: string): Promise<UserResponseDto> {
        const user = await this.authService.validateCredentials(username, password);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        return userResponse;
    }
}
