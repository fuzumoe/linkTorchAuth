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
            const dbType = configService.get<string>('database.type');
            const dbHost = configService.get<string>('database.host');
            const dbPort = configService.get<number>('database.port');
            const dbUsername = configService.get<string>('database.username');
            const dbPassword = configService.get<string>('database.password');
            const dbName = configService.get<string>('database.database');

            // Check that typeOrmConfig uses these values correctly
            expect(options.type).toBe(dbType);
            // TypeORM config properties depend on the database type
            // Use a proper interface to type the options
            interface DbConnectionOptions {
                type: string;
                host: string;
                port: number;
                username: string;
                password: string;
                database: string;
            }

            const dbOptions = options as DbConnectionOptions;
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

            // Use a proper interface to access these properties
            interface DbConnectionOptions {
                type: string;
                host: string;
                port: number;
                username: string;
                password: string;
                database: string;
                entities: string[];
                migrations: string[];
                migrationsTableName: string;
            }
            const dbOptions = config as DbConnectionOptions;
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

            // Safe way to check entities pattern
            if (Array.isArray(options.entities)) {
                // Check if first element is string or object
                if (typeof options.entities[0] === 'string') {
                    expect(options.entities[0]).toContain('**/*.entity.js');
                } else {
                    // If it's an object, just verify it exists without converting to string
                    expect(options.entities).toHaveLength(1);
                }
            } else if (options.entities) {
                // For non-array entities, verify it's a string before trying to use it
                if (typeof options.entities === 'string') {
                    expect(options.entities).toContain('**/*.entity.js');
                } else {
                    // Just verify the entities exist without string conversion
                    expect(options.entities).toBeTruthy();
                }
            }

            // Check migrations path
            expect(options.migrations).toBeDefined();

            // Safe way to check migrations pattern
            if (Array.isArray(options.migrations)) {
                // Check if first element is string or object
                if (typeof options.migrations[0] === 'string') {
                    expect(options.migrations[0]).toContain('migrations');
                } else {
                    // If it's an object, just verify it exists without converting to string
                    expect(options.migrations).toHaveLength(1);
                }
            } else if (options.migrations) {
                // For non-array migrations, verify it's a string before trying to use it
                if (typeof options.migrations === 'string') {
                    expect(options.migrations).toContain('migrations');
                } else {
                    // Just verify the migrations exist without string conversion
                    expect(options.migrations).toBeTruthy();
                }
            }
            expect(options.migrationsTableName).toBe('migrations');
        });
    });
});
