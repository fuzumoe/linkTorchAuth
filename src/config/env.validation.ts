import Joi from 'joi';

export const EnvValidationSchema = Joi.object({
    APP_NAME: Joi.string().default('LinkTorch Auth'),
    APP_DESCRIPTION: Joi.string().default('The LinkTorch authentication and authorization API'),
    APP_PORT: Joi.number().min(3000).default(3000),
    API_BASE_PREFIX: Joi.string().default('/api'),
    API_VERSION: Joi.string().default('v1'),
    OPEN_API_URL: Joi.string().optional(),
    OPEN_API_JSON_URL: Joi.string().optional(),
    REDOC_URL: Joi.string().optional(),
    DATABASE_TYPE: Joi.string().valid('postgres', 'mysql', 'sqlite').required(),
    DATABASE_HOST: Joi.string().default('localhost'),
    DATABASE_PORT: Joi.number().default(5432),
    DATABASE_BASENAME: Joi.string().optional(),
    DATABASE_USERNAME: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_NAME: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('1d'),
});
