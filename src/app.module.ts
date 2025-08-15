import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import { EnvValidationSchema } from './config/env.validation';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { EmailVerification } from './entities/email-verification.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { User } from './entities/user.entity';
import { AuthService } from './services/auth.service';
import { PasswordService } from './services/password.service';
import { UserService } from './services/user.service';
import { BasicStrategy } from './strategies/basic.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UserSubscriber } from './subscribers/user.subscriber';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
            validationSchema: EnvValidationSchema,
            load: [databaseConfig, appConfig],
        }),
        TypeOrmModule.forRootAsync({
            useFactory: typeOrmConfig,
            inject: [ConfigService],
        }),
        PassportModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
                signOptions: {
                    expiresIn: configService.get<string>('jwt.expiresIn'),
                },
            }),
        }),
        TypeOrmModule.forFeature([User, RefreshToken, PasswordReset, EmailVerification]),
    ],
    controllers: [AuthController, UserController],
    providers: [UserService, PasswordService, AuthService, LocalStrategy, JwtStrategy, BasicStrategy, UserSubscriber],
})
export class AppModule {}
