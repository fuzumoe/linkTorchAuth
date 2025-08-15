import { ConfigService } from '@nestjs/config';
import { TestingModule } from '@nestjs/testing';
import appConfig from '../../../src/config/app.config';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('App Config Integration', () => {
    let module: TestingModule;
    let configService: ConfigService;

    // Store original process.env
    const originalEnv = process.env;

    beforeAll(async () => {
        // Create a testing module with the real app.config loaded
        module = await createTestingModule();
        configService = module.get<ConfigService>(ConfigService);
    });

    afterAll(async () => {
        await module.close();
    });

    afterEach(() => {
        // Reset environment variables after each test
        process.env = originalEnv;
    });

    describe('ConfigService with app.config integration', () => {
        it('should load app config values through ConfigService', () => {
            // Access app config through the config service using the namespace
            const appName = configService.get('app.appName');
            const apiBasePrefix = configService.get('app.apiBasePrefix');
            const apiVersion = configService.get('app.apiVersion');
            const cookies = configService.get('app.cookies');

            // Verify the values match what we expect from default config
            expect(appName).toBeDefined();
            expect(apiBasePrefix).toBeDefined();
            expect(apiVersion).toBeDefined();
            expect(cookies).toEqual(
                expect.objectContaining({
                    httpOnly: true,
                    sameSite: 'strict',
                })
            );
        });

        it('should detect environment mode correctly', () => {
            // Access environment mode flags
            const isProduction = configService.get('app.isProduction');
            const isDevelopment = configService.get('app.isDevelopment');
            const isTest = configService.get('app.isTest');

            // In test environment NODE_ENV should be 'test'
            expect(isProduction).toBe(false);
            expect(isDevelopment).toBe(false);
            expect(isTest).toBe(true);
        });
    });

    describe('parseExpiresIn function in real environment', () => {
        it('should correctly parse JWT_EXPIRES_IN from environment', () => {
            // Set a custom JWT_EXPIRES_IN
            process.env = {
                ...originalEnv,
                JWT_EXPIRES_IN: '2h',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify jwtExpiresIn is calculated correctly using parseExpiresIn
            expect(config.jwtExpiresIn).toBe(2 * 60 * 60 * 1000); // 2 hours in ms
        });

        it('should correctly parse REFRESH_TOKEN_EXPIRES_IN from environment', () => {
            // Set a custom REFRESH_TOKEN_EXPIRES_IN
            process.env = {
                ...originalEnv,
                REFRESH_TOKEN_EXPIRES_IN: '14d',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify refreshTokenExpiresIn is calculated correctly using parseExpiresIn
            expect(config.refreshTokenExpiresIn).toBe(14 * 24 * 60 * 60 * 1000); // 14 days in ms
        });

        it('should correctly parse COOKIE_MAX_AGE from environment', () => {
            // Set a custom COOKIE_MAX_AGE
            process.env = {
                ...originalEnv,
                COOKIE_MAX_AGE: '60s',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify cookie maxAge is calculated correctly using parseExpiresIn
            expect(config.cookies.maxAge).toBe(60 * 1000); // 60 seconds in ms
        });
    });

    describe('URL templates integration', () => {
        it('should correctly replace API_BASE_PREFIX and API_VERSION in URL templates', () => {
            // Set custom URL templates with variables
            process.env = {
                ...originalEnv,
                API_BASE_PREFIX: '/custom-api',
                API_VERSION: 'v3',
                OPEN_API_URL: '${API_BASE_PREFIX}/${API_VERSION}/docs',
                OPEN_API_JSON_URL: '${API_BASE_PREFIX}/${API_VERSION}/docs-json',
                REDOC_URL: '${API_BASE_PREFIX}/${API_VERSION}/redoc',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify the templates are correctly replaced
            expect(config.openApiUrl).toBe('/custom-api/v3/docs');
            expect(config.openApiJsonUrl).toBe('/custom-api/v3/docs-json');
            expect(config.redocUrl).toBe('/custom-api/v3/redoc');
        });
    });

    describe('Cookie configuration in different environments', () => {
        it('should set secure=true in production environment', () => {
            // Mock production environment
            process.env = {
                ...originalEnv,
                NODE_ENV: 'production',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify secure cookie in production
            expect(config.cookies.secure).toBe(true);
        });

        it('should set secure=false in development environment', () => {
            // Mock development environment
            process.env = {
                ...originalEnv,
                NODE_ENV: 'development',
            };

            // Create a fresh appConfig with the updated environment
            const config = appConfig();

            // Verify non-secure cookie in development
            expect(config.cookies.secure).toBe(false);
        });
    });

    describe('Integration with Authentication', () => {
        it('should have cookie settings compatible with auth requirements', () => {
            const config = appConfig();

            // Check that cookie settings meet authentication requirements
            expect(config.cookies.httpOnly).toBe(true); // For security
            expect(config.cookies.path).toBe('/'); // Accessible site-wide
            expect(config.cookies.sameSite).toBe('strict'); // Prevent CSRF

            // JWT and refresh token cookies should have appropriate expirations
            expect(config.cookies.accessTokenMaxAge).toBe(config.jwtExpiresIn);
            expect(config.cookies.refreshTokenMaxAge).toBe(config.refreshTokenExpiresIn);
        });
    });
});
