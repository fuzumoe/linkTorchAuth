import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../services/user.service';
import { JwtPayload } from '../interfaces/auth.interface';
import { UserResponseDto } from '@auth/dtos/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret') || 'default-secret-change-me',
        });
    }

    async validate(payload: JwtPayload): Promise<UserResponseDto> {
        const userId = payload.sub;

        const user = await this.userService.findById(userId);

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        return userResponse;
    }
}
