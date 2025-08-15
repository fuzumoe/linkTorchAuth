import appConfig, { parseExpiresIn } from '../../../src/config/app.config';

describe('App Configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('parseExpiresIn function', () => {
        it('should convert seconds to milliseconds', () => {
            expect(parseExpiresIn('30s')).toBe(30 * 1000);
        });

        it('should convert minutes to milliseconds', () => {
            expect(parseExpiresIn('5m')).toBe(5 * 60 * 1000);
        });

        it('should convert hours to milliseconds', () => {
            expect(parseExpiresIn('2h')).toBe(2 * 60 * 60 * 1000);
        });

        it('should convert days to milliseconds', () => {
            expect(parseExpiresIn('7d')).toBe(7 * 24 * 60 * 60 * 1000);
        });

        it('should return NaN for invalid format', () => {
            expect(parseExpiresIn('invalid')).toBeNaN();
        });

        it('should handle non-numeric values', () => {
            expect(parseExpiresIn('abcd')).toBeNaN();
        });

        it('should handle empty string', () => {
            expect(parseExpiresIn('')).toBe(3600 * 1000);
        });
    });

    describe('appConfig', () => {
        it('should use default values when environment variables are not set', () => {
            process.env = {};

            const config = appConfig();

            expect(config).toEqual({
                port: 3000,
                appName: 'LinkTorch Auth',
                appDescription: 'The LinkTorch authentication and authorization API',
                apiBasePrefix: '/api',
                apiVersion: 'v1',
                nodeEnv: 'development',
                isProduction: false,
                isDevelopment: true,
                isTest: false,
                jwtSecret: 'some-secrete',
                jwtExpiresIn: 86400000, // 1d in ms
                refreshTokenExpiresIn: 604800000, // 7d in ms
                cookies: {
                    secure: false,
                    accessTokenMaxAge: 86400000, // 1d in ms
                    refreshTokenMaxAge: 604800000, // 7d in ms
                    sameSite: 'strict',
                    path: '/',
                    httpOnly: true,
                    maxAge: 2592000000, // 30d in ms
                },
                openApiUrl: undefined,
                openApiJsonUrl: undefined,
                redocUrl: undefined,
            });
        });

        it('should use environment variables when provided', () => {
            process.env = {
                APP_PORT: '4000',
                APP_NAME: 'Custom App',
                APP_DESCRIPTION: 'Custom Description',
                API_BASE_PREFIX: '/custom-api',
                API_VERSION: 'v2',
                NODE_ENV: 'production',
                JWT_SECRET: 'test-secret',
                JWT_EXPIRES_IN: '2h',
                REFRESH_TOKEN_EXPIRES_IN: '14d',
                COOKIE_MAX_AGE: '60d',
                OPEN_API_URL: '${API_BASE_PREFIX}/${API_VERSION}/docs',
                OPEN_API_JSON_URL: '${API_BASE_PREFIX}/${API_VERSION}/docs-json',
                REDOC_URL: '${API_BASE_PREFIX}/${API_VERSION}/redoc',
            };

            const config = appConfig();

            expect(config).toEqual({
                port: 4000,
                appName: 'Custom App',
                appDescription: 'Custom Description',
                apiBasePrefix: '/custom-api',
                apiVersion: 'v2',
                nodeEnv: 'production',
                isProduction: true,
                isDevelopment: false,
                isTest: false,
                jwtSecret: 'test-secret',
                jwtExpiresIn: 7200000, // 2h in ms
                refreshTokenExpiresIn: 1209600000, // 14d in ms
                cookies: {
                    secure: true,
                    accessTokenMaxAge: 7200000, // 2h in ms
                    refreshTokenMaxAge: 1209600000, // 14d in ms
                    sameSite: 'strict',
                    path: '/',
                    httpOnly: true,
                    maxAge: 5184000000, // 60d in ms
                },
                openApiUrl: '/custom-api/v2/docs',
                openApiJsonUrl: '/custom-api/v2/docs-json',
                redocUrl: '/custom-api/v2/redoc',
            });
        });

        it('should correctly handle environment modes', () => {
            process.env = { NODE_ENV: 'production' };
            let config = appConfig();
            expect(config.isProduction).toBe(true);
            expect(config.isDevelopment).toBe(false);
            expect(config.isTest).toBe(false);
            expect(config.cookies.secure).toBe(true);

            process.env = { NODE_ENV: 'development' };
            config = appConfig();
            expect(config.isProduction).toBe(false);
            expect(config.isDevelopment).toBe(true);
            expect(config.isTest).toBe(false);
            expect(config.cookies.secure).toBe(false);

            process.env = { NODE_ENV: 'test' };
            config = appConfig();
            expect(config.isProduction).toBe(false);
            expect(config.isDevelopment).toBe(false);
            expect(config.isTest).toBe(true);
            expect(config.cookies.secure).toBe(false);
        });

        it('should correctly parse APP_PORT as an integer', () => {
            process.env = { APP_PORT: '1234' };
            let config = appConfig();
            expect(config.port).toBe(1234);
            expect(typeof config.port).toBe('number');

            process.env = { APP_PORT: 'not-a-number' };
            config = appConfig();
            expect(config.port).toBeNaN();
        });

        it('should handle template variables in URL configurations', () => {
            process.env = {
                API_BASE_PREFIX: '/test-api',
                API_VERSION: 'v3',
                OPEN_API_URL: '${API_BASE_PREFIX}/${API_VERSION}/open-api',
                OPEN_API_JSON_URL: '${API_BASE_PREFIX}/${API_VERSION}/open-api-json',
                REDOC_URL: '${API_BASE_PREFIX}/${API_VERSION}/api-docs',
            };

            const config = appConfig();

            expect(config.openApiUrl).toBe('/test-api/v3/open-api');
            expect(config.openApiJsonUrl).toBe('/test-api/v3/open-api-json');
            expect(config.redocUrl).toBe('/test-api/v3/api-docs');
        });

        it('should handle URLs without template variables', () => {
            process.env = {
                OPEN_API_URL: '/direct-url',
                OPEN_API_JSON_URL: '/another-direct-url',
                REDOC_URL: '/static-url',
            };

            const config = appConfig();

            expect(config.openApiUrl).toBe('/direct-url');
            expect(config.openApiJsonUrl).toBe('/another-direct-url');
            expect(config.redocUrl).toBe('/static-url');
        });

        it('should handle partial URL template replacements', () => {
            process.env = {
                API_BASE_PREFIX: '/custom-api',
                OPEN_API_URL: '${API_BASE_PREFIX}/docs',
            };

            const config = appConfig();

            expect(config.openApiUrl).toBe('/custom-api/docs');
        });
    });
});
