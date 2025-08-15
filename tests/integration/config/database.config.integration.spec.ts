import { ConfigService } from '@nestjs/config';
import { TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import databaseConfig from '../../../src/config/database.config';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('Database Config Integration', () => {
    let module: TestingModule;
    let configService: ConfigService;
    let dataSource: DataSource;

    // Store original process.env
    const originalEnv = process.env;

    beforeAll(async () => {
        // Create a testing module with the real database.config loaded
        module = await createTestingModule();
        configService = module.get<ConfigService>(ConfigService);
        dataSource = module.get<DataSource>(getDataSourceToken());
    });

    afterAll(async () => {
        await module.close();
    });

    afterEach(() => {
        // Reset environment variables after each test
        process.env = originalEnv;
    });

    describe('ConfigService with database.config integration', () => {
        it('should load database config values through ConfigService', () => {
            // Access database config through the config service using the namespace
            const dbType = configService.get<string>('database.type');
            const dbHost = configService.get<string>('database.host');
            const dbPort = configService.get<number>('database.port');
            const dbUsername = configService.get<string>('database.username');
            const dbPassword = configService.get<string>('database.password');
            const dbName = configService.get<string>('database.database');

            // Verify the values match what we expect
            expect(dbType).toBeDefined();
            expect(dbHost).toBeDefined();
            expect(dbPort).toBeDefined();
            expect(typeof dbPort).toBe('number');
            expect(dbUsername).toBeDefined();
            expect(dbPassword).toBeDefined();
            expect(dbName).toBeDefined();
        });

        it('should provide valid database connection parameters', () => {
            // Verify that the database connection established correctly using our config
            expect(dataSource.isInitialized).toBe(true);
            expect(dataSource.options).toEqual(
                expect.objectContaining({
                    type: configService.get<string>('database.type'),
                    host: configService.get<string>('database.host'),
                    port: configService.get<number>('database.port'),
                    username: configService.get<string>('database.username'),
                    database: configService.get<string>('database.database'),
                })
            );
        });
    });

    describe('Environment variable integration', () => {
        it('should create database config with custom environment variables', () => {
            // Set custom environment variables
            process.env = {
                ...originalEnv,
                DATABASE_TYPE: 'mysql',
                DATABASE_HOST: 'custom-db-host',
                DATABASE_PORT: '3306',
                DATABASE_BASENAME: 'custom-basename',
                DATABASE_USERNAME: 'custom-user',
                DATABASE_PASSWORD: 'custom-pass',
                DATABASE_NAME: 'custom-db',
            };

            // Create a fresh databaseConfig with the updated environment
            const config = databaseConfig();

            // Verify the config contains the custom values
            expect(config.type).toBe('mysql');
            expect(config.host).toBe('custom-db-host');
            expect(config.port).toBe(3306);
            expect(config.basename).toBe('custom-basename');
            expect(config.username).toBe('custom-user');
            expect(config.password).toBe('custom-pass');
            expect(config.database).toBe('custom-db');
        });

        it('should use default values when environment variables are not set', () => {
            // Mock a minimal environment with no DB settings
            process.env = {
                ...originalEnv,
                DATABASE_TYPE: undefined,
                DATABASE_HOST: undefined,
                DATABASE_PORT: undefined,
            };

            // Create a fresh databaseConfig with the updated environment
            const config = databaseConfig();

            // Verify defaults are used
            expect(config.type).toBe('postgres'); // Default type
            expect(config.host).toBe('localhost'); // Default host
            expect(config.port).toBe(5432); // Default port
        });

        it('should correctly parse DATABASE_PORT as integer', () => {
            // Set numeric port as string
            process.env = {
                ...originalEnv,
                DATABASE_PORT: '9999',
            };

            const config = databaseConfig();
            expect(config.port).toBe(9999);
            expect(typeof config.port).toBe('number');

            // Set invalid port
            process.env = {
                ...originalEnv,
                DATABASE_PORT: 'not-a-number',
            };

            const configWithInvalidPort = databaseConfig();
            expect(configWithInvalidPort.port).toBeNaN();
        });
    });

    describe('Database connection integration', () => {
        it('should successfully connect to the database with provided config', async () => {
            // Check if we can perform a simple query with our connection
            const result = await dataSource.query<Array<{ value: number }>>('SELECT 1 as value');
            expect(result).toEqual([{ value: 1 }]);
        });
    });

    describe('TypeORM integration', () => {
        it('should properly map config values to TypeORM connection options', () => {
            // Verify that TypeORM connection options match our config
            // Use a specific interface to type the options
            interface DbConnectionOptions {
                type: string;
                host: string;
                port: number;
                username: string;
                password: string;
                database: string;
            }

            const dbOptions = dataSource.options as DbConnectionOptions;

            // Type assertion is needed because TypeORM's DataSourceOptions is a union type
            // and TypeScript can't determine which specific connection options are being used
            expect(dbOptions.type).toBe(configService.get<string>('database.type'));
            expect(dbOptions.host).toBe(configService.get<string>('database.host'));
            expect(dbOptions.port).toBe(configService.get('database.port'));
            expect(dbOptions.username).toBe(configService.get('database.username'));
            expect(dbOptions.password).toBe(configService.get('database.password'));
            expect(dbOptions.database).toBe(configService.get('database.database'));
        });

        it('should have required entities registered', () => {
            // Check that entity metadata is properly loaded
            const entityMetadatas = dataSource.entityMetadatas;
            const entityNames = entityMetadatas.map((metadata) => metadata.name);

            // Verify that key entities are registered
            expect(entityNames).toContain('User');
            expect(entityNames).toContain('RefreshToken');
            expect(entityNames).toContain('PasswordReset');
            expect(entityNames).toContain('EmailVerification');
        });
    });
});
