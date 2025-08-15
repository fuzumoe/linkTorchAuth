import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getDataSourceToken } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';

import { AuditLog } from '../../src/entities/audit-log.entity';
import { EmailVerification } from '../../src/entities/email-verification.entity';
import { PasswordReset } from '../../src/entities/password-reset.entity';
import { RefreshToken } from '../../src/entities/refresh-token.entity';
import { User } from '../../src/entities/user.entity';
import { AuthService } from '../../src/services/auth.service';
import { PasswordService } from '../../src/services/password.service';
import { UserService } from '../../src/services/user.service';
import { BasicStrategy } from '../../src/strategies/basic.strategy';
import { JwtStrategy } from '../../src/strategies/jwt.strategy';
import { LocalStrategy } from '../../src/strategies/local.strategy';
import { UserSubscriber } from '../../src/subscribers/user.subscriber';

import request from 'supertest';
import { App } from 'supertest/types';
import appConfig from '../../src/config/app.config';
import databaseConfig from '../../src/config/database.config';
import { AuthController } from '../../src/controllers/auth.controller';
import { UserController } from '../../src/controllers/user.controller';

export async function createTestingModule(): Promise<TestingModule> {
    return await Test.createTestingModule({
        imports: [
            ConfigModule.forRoot({
                isGlobal: true,
                load: [databaseConfig, appConfig],
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
        controllers: [AuthController, UserController],
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

export function getCommonServices(testingModule: TestingModule) {
    const dataSource = testingModule.get(getDataSourceToken());
    const userRepository = dataSource.getRepository(User);
    const authService = testingModule.get(AuthService);
    const basicStrategy = testingModule.get(BasicStrategy);
    const localStrategy = testingModule.get(LocalStrategy);
    const jwtStrategy = testingModule.get(JwtStrategy);
    const userService = testingModule.get(UserService);
    const passwordService = testingModule.get(PasswordService);
    const userSubscriber = testingModule.get(UserSubscriber);

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

export async function createTestAppWithControllers(
    controllers: Array<new (...args: any[]) => any>,
    providers: Array<{ provide: any; useClass: new (...args: any[]) => any }> = []
): Promise<INestApplication> {
    const moduleRef = await Test.createTestingModule({
        controllers,
        providers,
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    return app;
}

export class TestResponse {
    statusCode = 200;
    headers: Record<string, string> = {};
    cookies: Record<string, { value: string; options?: any }> = {};
    body: any = null;

    status(code: number): Response {
        this.statusCode = code;
        return this as unknown as Response;
    }

    json(body: unknown): Response {
        this.body = body;
        return this as unknown as Response;
    }

    send(body: unknown): Response {
        this.body = body;
        return this as unknown as Response;
    }

    cookie(name: string, value: string, options?: CookieOptions): Response {
        this.cookies[name] = { value, options };
        return this as unknown as Response;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    clearCookie(name: string, options: CookieOptions): Response {
        delete this.cookies[name];
        return this as unknown as Response;
    }

    setHeader(name: string, value: string): Response {
        this.headers[name] = value;
        return this as unknown as Response;
    }
}

export const safeRequest = (app: INestApplication) => {
    return request(app.getHttpServer() as unknown as App);
};
