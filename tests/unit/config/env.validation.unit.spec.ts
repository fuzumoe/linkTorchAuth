import { EnvValidationSchema } from '../../../src/config/env.validation';

describe('EnvValidationSchema', () => {
    const validateEnv = (env: Record<string, any>) => {
        const result = EnvValidationSchema.validate(env, {
            abortEarly: false,
            allowUnknown: true,
        });
        return result;
    };

    const hasErrorForPath = (error: any, path: string): boolean => {
        return (
            error && error.details && error.details.some((d: any) => d.path && d.path.includes && d.path.includes(path))
        );
    };

    describe('required fields', () => {
        it('should require DATABASE_TYPE', () => {
            const env = {
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'DATABASE_TYPE')).toBeTruthy();
        });

        it('should require DATABASE_USERNAME', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'DATABASE_USERNAME')).toBeTruthy();
        });

        it('should require DATABASE_PASSWORD', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'DATABASE_PASSWORD')).toBeTruthy();
        });

        it('should require DATABASE_NAME', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'DATABASE_NAME')).toBeTruthy();
        });

        it('should require JWT_SECRET', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'JWT_SECRET')).toBeTruthy();
        });

        it('should require JWT_SECRET to be at least 32 characters', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'short',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'JWT_SECRET')).toBeTruthy();
        });
    });

    describe('valid values', () => {
        it('should accept valid DATABASE_TYPE values', () => {
            const validTypes = ['postgres', 'mysql', 'sqlite'];

            for (const type of validTypes) {
                const env = {
                    DATABASE_TYPE: type,
                    DATABASE_USERNAME: 'user',
                    DATABASE_PASSWORD: 'pass',
                    DATABASE_NAME: 'db',
                    JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
                };

                const { error } = validateEnv(env);
                expect(error).toBeUndefined();
            }
        });

        it('should reject invalid DATABASE_TYPE values', () => {
            const env = {
                DATABASE_TYPE: 'mongodb',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'DATABASE_TYPE')).toBeTruthy();
        });

        it('should validate minimum APP_PORT value', () => {
            const env = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
                APP_PORT: 2999,
            };

            const { error } = validateEnv(env);
            expect(error).toBeDefined();
            expect(hasErrorForPath(error, 'APP_PORT')).toBeTruthy();
        });
    });

    describe('default values', () => {
        it('should set default values for optional fields', () => {
            const minimalEnv = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
            };

            const { value, error } = validateEnv(minimalEnv);

            expect(error).toBeUndefined();
            expect(value).toEqual(
                expect.objectContaining({
                    APP_NAME: 'LinkTorch Auth',
                    APP_DESCRIPTION: 'The LinkTorch authentication and authorization API',
                    APP_PORT: 3000,
                    API_BASE_PREFIX: '/api',
                    API_VERSION: 'v1',
                    DATABASE_HOST: 'localhost',
                    DATABASE_PORT: 5432,
                    JWT_EXPIRES_IN: '1d',
                })
            );
        });

        it('should not override provided values with defaults', () => {
            const customEnv = {
                DATABASE_TYPE: 'postgres',
                DATABASE_USERNAME: 'user',
                DATABASE_PASSWORD: 'pass',
                DATABASE_NAME: 'db',
                JWT_SECRET: 'a-very-long-secret-that-is-at-least-32-chars',
                APP_NAME: 'Custom App',
                APP_PORT: 3001,
                API_BASE_PREFIX: '/v2/api',
                DATABASE_HOST: 'custom-host',
            };

            const { value, error } = validateEnv(customEnv);

            expect(error).toBeUndefined();
            expect(value).toEqual(
                expect.objectContaining({
                    APP_NAME: 'Custom App',
                    APP_PORT: 3001,
                    API_BASE_PREFIX: '/v2/api',
                    DATABASE_HOST: 'custom-host',
                })
            );
        });
    });

    describe('complete validation', () => {
        it('should validate a complete valid environment', () => {
            const fullEnv = {
                APP_NAME: 'Test App',
                APP_DESCRIPTION: 'Test Description',
                APP_PORT: 3333,
                API_BASE_PREFIX: '/test-api',
                API_VERSION: 'v2',
                OPEN_API_URL: '/docs',
                OPEN_API_JSON_URL: '/docs-json',
                REDOC_URL: '/redoc',
                DATABASE_TYPE: 'postgres',
                DATABASE_HOST: 'test-host',
                DATABASE_PORT: 5433,
                DATABASE_BASENAME: 'test-base',
                DATABASE_USERNAME: 'test-user',
                DATABASE_PASSWORD: 'test-pass',
                DATABASE_NAME: 'test-db',
                JWT_SECRET: 'this-is-a-super-secure-jwt-secret-for-tests',
                JWT_EXPIRES_IN: '2h',
            };

            const { value, error } = validateEnv(fullEnv);

            expect(error).toBeUndefined();
            expect(value).toEqual(expect.objectContaining(fullEnv));
        });
    });
});
