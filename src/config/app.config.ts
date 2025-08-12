import { registerAs } from '@nestjs/config';

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
        cookies: {
            secure: nodeEnv === 'production',
            accessTokenMaxAge: 24 * 60 * 60 * 1000,
            refreshTokenMaxAge: 30 * 24 * 60 * 60 * 1000,
            sameSite: 'strict' as const,
            path: '/',
            httpOnly: true,
        },
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
