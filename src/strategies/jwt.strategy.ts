import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { plainToInstance } from 'class-transformer';
import { ExtractJwt, Strategy } from 'passport-jwt';
import appConfig from '../config/app.config';
import { UserResponseDto } from '../dtos/user.dto';
import { JwtPayload } from '../interfaces/auth.interface';
import { UserService } from '../services/user.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        @Inject(appConfig.KEY) private readonly appCfg: ConfigType<typeof appConfig>,
        private userService: UserService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: appCfg.jwtSecret,
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
