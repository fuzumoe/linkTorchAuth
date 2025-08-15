import { ConfigService } from '@nestjs/config';
import { TestingModule } from '@nestjs/testing';
import { typeOrmConfig } from '../../../src/config/typeorm.config';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('TypeOrmConfig Integration', () => {
    let testingModule: TestingModule;
    let configService: ConfigService;

    beforeAll(async () => {
        // Create a testing module with real configs
        testingModule = await createTestingModule();
        configService = testingModule.get<ConfigService>(ConfigService);
    });

    afterAll(async () => {
        await testingModule.close();
    });

    describe('typeOrmConfig function integration with ConfigModule', () => {
        it('should be defined', () => {
            expect(typeOrmConfig).toBeDefined();
        });

        it('should create valid TypeORM options from ConfigService', () => {
            const options = typeOrmConfig(configService);
            expect(options).toBeDefined();

            // Get the database config from configService
            const dbType = configService.get('database.type');
            const dbHost = configService.get('database.host');
            const dbPort = configService.get('database.port');
            const dbUsername = configService.get('database.username');
            const dbPassword = configService.get('database.password');
            const dbName = configService.get('database.database');

            // Check that typeOrmConfig uses these values correctly
            expect(options.type).toBe(dbType);
            // TypeORM config properties depend on the database type
            // Use type assertion to access these properties
            const dbOptions = options as any;
            expect(dbOptions.host).toBe(dbHost);
            expect(dbOptions.port).toBe(Number(dbPort));
            expect(dbOptions.username).toBe(dbUsername);
            expect(dbOptions.password).toBe(dbPassword);
            expect(dbOptions.database).toBe(dbName);
        });
    });

    describe('TypeORM configuration generation', () => {
        it('should generate valid TypeORM config from ConfigService', () => {
            // Create a mock ConfigService with database config
            const mockConfigService = {
                get: jest.fn((key) => {
                    if (key === 'database') {
                        return {
                            type: 'postgres',
                            host: 'test-host',
                            port: 5432,
                            username: 'test-user',
                            password: 'test-pass',
                            database: 'test-db',
                        };
                    }
                    return undefined;
                }),
            };

            // Generate TypeORM config using our mock
            const config = typeOrmConfig(mockConfigService as unknown as ConfigService);

            // Verify the config is correctly generated
            expect(config).toBeDefined();
            expect(config.type).toBe('postgres');

            // Use type assertion to access these properties
            const dbOptions = config as any;
            expect(dbOptions.host).toBe('test-host');
            expect(dbOptions.port).toBe(5432);
            expect(dbOptions.username).toBe('test-user');
            expect(dbOptions.password).toBe('test-pass');
            expect(dbOptions.database).toBe('test-db');

            // Verify that the entity and migration paths are set
            expect(dbOptions.entities).toBeDefined();
            expect(dbOptions.migrations).toBeDefined();
            expect(dbOptions.migrationsTableName).toBe('migrations');
        });
    });

    describe('TypeORM config entities and migrations', () => {
        it('should include correct entities and migrations paths', () => {
            const options = typeOrmConfig(configService);

            // Check entities path
            expect(options.entities).toBeDefined();
            const entitiesPath = String(options.entities);
            expect(entitiesPath).toContain('**/*.entity.js');

            // Check migrations path
            expect(options.migrations).toBeDefined();
            const migrationsPath = String(options.migrations);
            expect(migrationsPath).toContain('migrations');
            expect(options.migrationsTableName).toBe('migrations');
        });
    });
});
