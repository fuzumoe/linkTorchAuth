import { registerAs } from '@nestjs/config';

export function parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    switch (unit) {
        case 's':
            return value * 1000; // seconds to ms
        case 'm':
            return value * 60 * 1000; // minutes to ms
        case 'h':
            return value * 60 * 60 * 1000; // hours to ms
        case 'd':
            return value * 24 * 60 * 60 * 1000; // days to ms
        default:
            return 3600 * 1000; // default: 1 hour
    }
}

export default registerAs('app', () => {
    const apiBasePrefix = process.env.API_BASE_PREFIX || '/api';
    const apiVersion = process.env.API_VERSION || 'v1';
    const nodeEnv = process.env.NODE_ENV || 'development';

    return {
        port: parseInt(process.env.APP_PORT || '3000', 10),
        appName: process.env.APP_NAME || 'LinkTorch Auth',
        appDescription: process.env.APP_DESCRIPTION || 'The LinkTorch authentication and authorization API',
        apiBasePrefix,
        apiVersion,
        nodeEnv,
        isProduction: nodeEnv === 'production',
        isDevelopment: nodeEnv === 'development',
        isTest: nodeEnv === 'test',
        jwtSecret: process.env.JWT_SECRET || 'some-secrete',
        jwtExpiresIn: parseExpiresIn(process.env.JWT_EXPIRES_IN || '1d'),
        refreshTokenExpiresIn: parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'),
        cookies: {
            secure: nodeEnv === 'production',
            accessTokenMaxAge: parseExpiresIn(process.env.JWT_EXPIRES_IN || '1d'),
            refreshTokenMaxAge: parseExpiresIn(process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'),
            sameSite: 'strict' as CookieSameSitePolicy,
            path: '/',
            httpOnly: true,
            maxAge: parseExpiresIn(process.env.COOKIE_MAX_AGE || '30d'),
        } as CookieOptions,
        openApiUrl: process.env.OPEN_API_URL?.replace('${API_BASE_PREFIX}', apiBasePrefix).replace(
            '${API_VERSION}',
            apiVersion
        ),
        openApiJsonUrl: process.env.OPEN_API_JSON_URL?.replace('${API_BASE_PREFIX}', apiBasePrefix).replace(
            '${API_VERSION}',
            apiVersion
        ),
        redocUrl: process.env.REDOC_URL?.replace('${API_BASE_PREFIX}', apiBasePrefix).replace(
            '${API_VERSION}',
            apiVersion
        ),
    };
});
