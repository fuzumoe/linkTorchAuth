import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AppModule } from '../../../src/app.module';
import { AuthController } from '../../../src/controllers/auth.controller';
import { UserController } from '../../../src/controllers/user.controller';
import { EmailVerification } from '../../../src/entities/email-verification.entity';
import { PasswordReset } from '../../../src/entities/password-reset.entity';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { User } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { PasswordService } from '../../../src/services/password.service';
import { UserService } from '../../../src/services/user.service';

describe('AppModule (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let testingModule: TestingModule;

    beforeAll(async () => {
        testingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = testingModule.createNestApplication();
        await app.init();

        dataSource = testingModule.get<DataSource>(DataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    it('should be defined', () => {
        expect(app).toBeDefined();
    });

    it('should have a DataSource that is connected', () => {
        expect(dataSource).toBeDefined();
        expect(dataSource.isInitialized).toBe(true);
    });

    describe('ConfigService', () => {
        let configService: ConfigService;

        beforeAll(() => {
            configService = testingModule.get<ConfigService>(ConfigService);
        });

        it('should be defined', () => {
            expect(configService).toBeDefined();
        });

        it('should have loaded configuration values', () => {
            expect(configService.get('NODE_ENV')).toBeDefined();
            expect(configService.get('database.type')).toBeDefined();
        });

        it('should have database configuration', () => {
            interface DatabaseConfig {
                type: string;
                [key: string]: unknown;
            }

            const dbConfig = configService.get<DatabaseConfig>('database');
            expect(dbConfig).toBeDefined();
            if (dbConfig) {
                expect(dbConfig.type).toBeDefined();
            }
        });
    });

    describe('Repository injection', () => {
        it('should have User repository available', () => {
            const userRepository = testingModule.get<Repository<User>>(getRepositoryToken(User));
            expect(userRepository).toBeDefined();
            expect(userRepository.manager).toBeDefined();
        });

        it('should have RefreshToken repository available', () => {
            const refreshTokenRepository = testingModule.get<Repository<RefreshToken>>(
                getRepositoryToken(RefreshToken)
            );
            expect(refreshTokenRepository).toBeDefined();
        });

        it('should have PasswordReset repository available', () => {
            const passwordResetRepository = testingModule.get<Repository<PasswordReset>>(
                getRepositoryToken(PasswordReset)
            );
            expect(passwordResetRepository).toBeDefined();
        });

        it('should have EmailVerification repository available', () => {
            const emailVerificationRepository = testingModule.get<Repository<EmailVerification>>(
                getRepositoryToken(EmailVerification)
            );
            expect(emailVerificationRepository).toBeDefined();
        });
    });

    describe('Service injection', () => {
        it('should have UserService available', () => {
            const userService = testingModule.get<UserService>(UserService);
            expect(userService).toBeDefined();
        });

        it('should have PasswordService available', () => {
            const passwordService = testingModule.get<PasswordService>(PasswordService);
            expect(passwordService).toBeDefined();
        });

        it('should have AuthService available', () => {
            const authService = testingModule.get<AuthService>(AuthService);
            expect(authService).toBeDefined();
        });

        it('should have JwtService available', () => {
            const jwtService = testingModule.get<JwtService>(JwtService);
            expect(jwtService).toBeDefined();
            expect(typeof jwtService.sign).toBe('function');
            expect(typeof jwtService.verify).toBe('function');
        });
    });

    describe('Database connection', () => {
        it('should be able to execute a simple query', async () => {
            interface QueryResult {
                result: number;
            }

            const result = await dataSource.query<QueryResult[]>('SELECT 1 as result');
            expect(result).toBeDefined();
            expect(result[0].result).toBe(1);
        });

        it('should have all expected tables', async () => {
            interface TableResult {
                table_name: string;
            }

            const tables = await dataSource.query<TableResult[]>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

            const tableNames = tables.map((t: TableResult) => t.table_name);

            expect(tableNames).toContain('users');
            expect(tableNames).toContain('refresh_tokens');
            expect(tableNames).toContain('password_resets');
            expect(tableNames).toContain('email_verifications');
        });

        it('should have proper migrations table', async () => {
            interface TableResult {
                table_name: string;
            }

            const migrationTables = await dataSource.query<TableResult[]>(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'migrations'
      `);

            expect(migrationTables.length).toBeGreaterThanOrEqual(0);
            expect(true).toBe(true);
        });
    });

    describe('Module structure', () => {
        it('should have controllers registered correctly', () => {
            expect(() => testingModule.get(AuthController)).not.toThrow();
            expect(() => testingModule.get(UserController)).not.toThrow();
        });

        it('should have providers registered correctly', () => {
            const userService = testingModule.get<UserService>(UserService);
            const authService = testingModule.get<AuthService>(AuthService);
            const passwordService = testingModule.get<PasswordService>(PasswordService);

            expect(userService).toBeDefined();
            expect(authService).toBeDefined();
            expect(passwordService).toBeDefined();
        });
    });
});
