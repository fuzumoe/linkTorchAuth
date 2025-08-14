import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository, Like } from 'typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { User } from '../../src/entities/user.entity';
import { RefreshToken } from '../../src/entities/refresh-token.entity';
import { AuditLog } from '../../src/entities/audit-log.entity';
import { EmailVerification } from '../../src/entities/email-verification.entity';
import { PasswordReset } from '../../src/entities/password-reset.entity';
import { PasswordService } from '../../src/services/password.service';
import { AuthService } from '../../src/services/auth.service';
import { UserService } from '../../src/services/user.service';
import { BasicStrategy } from '../../src/strategies/basic.strategy';
import { LocalStrategy } from '../../src/strategies/local.strategy';
import { JwtStrategy } from '../../src/strategies/jwt.strategy';
import { UserSubscriber } from '../../src/subscribers/user.subscriber';

import databaseConfig from '../../src/config/database.config';
import jwtConfig from '../../src/config/jwt.config';
import appConfig from '../../src/config/app.config';

export async function createTestingModule(): Promise<TestingModule> {
    return await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                load: [databaseConfig, jwtConfig, appConfig],
                envFilePath: ['.env'],
            }),
            PassportModule,
            JwtModule.registerAsync({
                useFactory: (configService: ConfigService) => ({
                    secret: configService.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: configService.get('JWT_EXPIRES_IN') || '1h',
                    },
                }),
                inject: [ConfigService],
            }),
            TypeOrmModule.forRootAsync({
                useFactory: (configService: ConfigService) => ({
                    type: 'postgres',
                    host: configService.get('DATABASE_HOST'),
                    port: parseInt(configService.get('DATABASE_PORT') || '5432'),
                    username: configService.get('DATABASE_USERNAME'),
                    password: configService.get('DATABASE_PASSWORD'),
                    database: configService.get('DATABASE_NAME'),
                    entities: [User, RefreshToken, AuditLog, EmailVerification, PasswordReset],
                    synchronize: true, // Create tables automatically for testing
                }),
                inject: [ConfigService],
            }),
            TypeOrmModule.forFeature([User, RefreshToken, AuditLog, EmailVerification, PasswordReset]),
        ],
        providers: [
            AuthService,
            UserService,
            PasswordService,
            BasicStrategy,
            LocalStrategy,
            JwtStrategy,
            UserSubscriber,
        ],
    }).compile();
}

export async function cleanupTestUsers(
    userRepository: Repository<User>,
    createdUserIds: string[],
    pattern: string = '%@test.integration.com'
): Promise<void> {
    try {
        if (createdUserIds.length > 0) {
            await userRepository.delete(createdUserIds);
            createdUserIds.length = 0;
        }

        // Also delete any test users by email pattern
        await userRepository.delete({
            email: Like(pattern),
        });
    } catch (error) {
        console.log('Cleanup error (can be ignored on first run):', error.message);
    }
}

export async function createTestUser(
    app: TestingModule,
    userRepository: Repository<User>,
    createdUserIds: string[],
    email: string,
    password: string,
    firstName: string = 'Test',
    lastName: string = 'User'
): Promise<User> {
    const passwordService = app.get(PasswordService);
    const hashedPassword = await passwordService.hashPassword(password);

    const testUser = userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        isActive: true,
    });

    const savedUser = await userRepository.save(testUser);
    createdUserIds.push(savedUser.id);
    return savedUser;
}

export function getCommonServices(app: TestingModule) {
    const dataSource = app.get(getDataSourceToken());
    const userRepository = dataSource.getRepository(User);
    const authService = app.get(AuthService);
    const basicStrategy = app.get(BasicStrategy);
    const localStrategy = app.get(LocalStrategy);
    const jwtStrategy = app.get(JwtStrategy);
    const userService = app.get(UserService);
    const passwordService = app.get(PasswordService);
    let userSubscriber: UserSubscriber | null = null;
    try {
        userSubscriber = app.get(UserSubscriber);
    } catch {
        // If UserSubscriber is not available, keep it as null
    }

    return {
        dataSource,
        userRepository,
        authService,
        basicStrategy,
        localStrategy,
        jwtStrategy,
        userSubscriber,
        userService,
        passwordService,
    };
}
