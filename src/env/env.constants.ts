import Joi from 'joi';

export const ENV_VALIDATION_SCHEMA = Joi.object({
    APP_PORT: Joi.number().min(3000).default(3000),
    DATABASE_TYPE: Joi.string().valid('postgres', 'mysql', 'sqlite').required(),
    DATABASE_HOST: Joi.string().default('localhost'),
    DATABASE_PORT: Joi.number().default(5432),
    DATABASE_USERNAME: Joi.string().required(),
    DATABASE_PASSWORD: Joi.string().required(),
    DATABASE_DATABASE: Joi.string().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRATION: Joi.string().default('1d'),
});
