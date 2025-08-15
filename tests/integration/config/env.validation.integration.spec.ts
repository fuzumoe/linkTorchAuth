import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EnvValidationSchema } from '../../../src/config/env.validation';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('Environment Validation Integration', () => {
    let testingModule: TestingModule;
    let configService: ConfigService;

    // Store original process.env
    const originalEnv = process.env;

    beforeAll(async () => {
        // Create a testing module with the real config and validation
        testingModule = await createTestingModule();
        configService = testingModule.get<ConfigService>(ConfigService);
    });

    afterAll(async () => {
        await testingModule.close();
    });

    afterEach(() => {
        // Reset environment variables after each test
        process.env = originalEnv;
    });

    describe('EnvValidationSchema integration with ConfigModule', () => {
        it('should properly validate and load environment variables', () => {
            // Verify essential environment variables were validated and loaded
            expect(configService.get('DATABASE_TYPE')).toBeDefined();
            expect(configService.get('DATABASE_USERNAME')).toBeDefined();
            expect(configService.get('DATABASE_PASSWORD')).toBeDefined();
            expect(configService.get('DATABASE_NAME')).toBeDefined();
            expect(configService.get('JWT_SECRET')).toBeDefined();
        });

        it('should apply default values from validation schema', () => {
            // Check that default values are correctly applied
            expect(configService.get('APP_NAME')).toBe('LinkTorch Auth');
            expect(configService.get('APP_DESCRIPTION')).toBe('The LinkTorch authentication and authorization API');
            expect(configService.get('API_BASE_PREFIX')).toBe('/api');
            expect(configService.get('API_VERSION')).toBe('v1');
            expect(configService.get('DATABASE_HOST')).toBe('localhost');
        });

        it('should correctly handle numeric values', () => {
            // Verify that numeric values are properly handled
            const appPort = configService.get('APP_PORT');
            const dbPort = configService.get('DATABASE_PORT');

            // ConfigService may return numbers as strings in some cases
            expect(Number(appPort)).toBeGreaterThanOrEqual(3000); // Minimum value constraint
            expect(Number(dbPort)).toBe(5432); // Default value
        });
    });

    describe('Creating ConfigModule with validation schema', () => {
        it('should successfully create a module with valid environment', async () => {
            // Set required environment variables
            process.env = {
                ...process.env,
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'valid-user',
                DATABASE_PASSWORD: 'valid-password',
                DATABASE_NAME: 'valid-db',
                JWT_SECRET: 'a-very-secure-jwt-secret-thats-long-enough',
            };

            // This should not throw an error
            const moduleRef = await Test.createTestingModule({
                imports: [
                    ConfigModule.forRoot({
                        validationSchema: EnvValidationSchema,
                        ignoreEnvFile: true,
                    }),
                ],
            }).compile();

            const config = moduleRef.get<ConfigService>(ConfigService);
            expect(config.get('DATABASE_TYPE')).toBe('postgres');

            await moduleRef.close();
        });

        it('should throw an error with missing required environment variables', async () => {
            // Set minimal environment with missing required values
            process.env = {
                NODE_ENV: 'test',
                // Missing DATABASE_TYPE, DATABASE_USERNAME, etc.
            };

            await expect(async () => {
                await Test.createTestingModule({
                    imports: [
                        ConfigModule.forRoot({
                            validationSchema: EnvValidationSchema,
                            ignoreEnvFile: true,
                        }),
                    ],
                }).compile();
            }).rejects.toThrow();
        });
    });

    describe('Database configuration validation', () => {
        it('should validate DATABASE_TYPE against allowed values', async () => {
            // Try with invalid database type
            process.env = {
                ...originalEnv,
                DATABASE_TYPE: 'mongodb', // Not in allowed list
            };

            await expect(async () => {
                await Test.createTestingModule({
                    imports: [
                        ConfigModule.forRoot({
                            validationSchema: EnvValidationSchema,
                            ignoreEnvFile: true,
                        }),
                    ],
                }).compile();
            }).rejects.toThrow();
        });

        it('should accept all valid database types', async () => {
            const validTypes = ['postgres', 'mysql', 'sqlite'];

            for (const dbType of validTypes) {
                process.env = {
                    ...originalEnv,
                    DATABASE_TYPE: dbType,
                };

                const moduleRef = await Test.createTestingModule({
                    imports: [
                        ConfigModule.forRoot({
                            validationSchema: EnvValidationSchema,
                            validationOptions: { allowUnknown: true }, // Allow test env vars
                            ignoreEnvFile: true,
                        }),
                    ],
                }).compile();

                const config = moduleRef.get<ConfigService>(ConfigService);
                expect(config.get('DATABASE_TYPE')).toBe(dbType);

                await moduleRef.close();
            }
        });
    });

    describe('JWT validation', () => {
        it('should validate JWT_SECRET minimum length', async () => {
            // Try with too short JWT secret
            process.env = {
                ...originalEnv,
                JWT_SECRET: 'short', // Less than 32 chars
            };

            await expect(async () => {
                await Test.createTestingModule({
                    imports: [
                        ConfigModule.forRoot({
                            validationSchema: EnvValidationSchema,
                            ignoreEnvFile: true,
                        }),
                    ],
                }).compile();
            }).rejects.toThrow();
        });

        it('should accept valid JWT_SECRET', async () => {
            // Set long enough JWT secret
            process.env = {
                ...originalEnv,
                JWT_SECRET: 'this-is-a-very-secure-jwt-secret-that-is-long-enough',
            };

            const moduleRef = await Test.createTestingModule({
                imports: [
                    ConfigModule.forRoot({
                        validationSchema: EnvValidationSchema,
                        validationOptions: { allowUnknown: true }, // Allow test env vars
                        ignoreEnvFile: true,
                    }),
                ],
            }).compile();

            const config = moduleRef.get<ConfigService>(ConfigService);
            expect(config.get('JWT_SECRET')).toBe('this-is-a-very-secure-jwt-secret-that-is-long-enough');

            await moduleRef.close();
        });
    });

    describe('Integration with application features', () => {
        it('should provide properly validated values to app.config', () => {
            // Check that app.config gets properly validated values
            expect(configService.get('app.appName')).toBe(configService.get('APP_NAME'));
            expect(configService.get('app.apiBasePrefix')).toBe(configService.get('API_BASE_PREFIX'));
            expect(configService.get('app.apiVersion')).toBe(configService.get('API_VERSION'));
        });

        it('should provide properly validated values to database.config', () => {
            // Check that database.config gets properly validated values
            expect(configService.get('database.type')).toBe(configService.get('DATABASE_TYPE'));
            expect(configService.get('database.host')).toBe(configService.get('DATABASE_HOST'));

            // Handle potential type differences between original env values and processed config
            expect(Number(configService.get('database.port'))).toBe(Number(configService.get('DATABASE_PORT')));

            expect(configService.get('database.username')).toBe(configService.get('DATABASE_USERNAME'));
            expect(configService.get('database.password')).toBe(configService.get('DATABASE_PASSWORD'));
            expect(configService.get('database.database')).toBe(configService.get('DATABASE_NAME'));
        });
    });
});
