import databaseConfig from '../../../src/config/database.config';

describe('Database Configuration', () => {
    const originalEnv = process.env;

    afterEach(() => {
        process.env = originalEnv;
    });

    it('should use default values when environment variables are not set', () => {
        process.env = {};

        const config = databaseConfig();

        expect(config).toEqual({
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            basename: undefined,
            username: undefined,
            password: undefined,
            database: undefined,
        });
    });

    it('should use environment variables when provided', () => {
        process.env = {
            DATABASE_TYPE: 'mysql',
            DATABASE_HOST: 'test-host',
            DATABASE_PORT: '3306',
            DATABASE_BASENAME: 'test-basename',
            DATABASE_USERNAME: 'test-user',
            DATABASE_PASSWORD: 'test-password',
            DATABASE_NAME: 'test-db',
        };

        const config = databaseConfig();

        expect(config).toEqual({
            type: 'mysql',
            host: 'test-host',
            port: 3306,
            basename: 'test-basename',
            username: 'test-user',
            password: 'test-password',
            database: 'test-db',
        });
    });

    it('should correctly parse DATABASE_PORT as an integer', () => {
        process.env = {
            DATABASE_PORT: '1234',
        };

        let config = databaseConfig();
        expect(config.port).toBe(1234);
        expect(typeof config.port).toBe('number');

        process.env = {
            DATABASE_PORT: 'not-a-number',
        };

        config = databaseConfig();
        expect(config.port).toBe(NaN);
    });

    it('should handle partial environment configuration', () => {
        process.env = {
            DATABASE_TYPE: 'sqlite',
            DATABASE_NAME: 'partial-db',
        };

        const config = databaseConfig();

        expect(config).toEqual({
            type: 'sqlite',
            host: 'localhost',
            port: 5432,
            basename: undefined,
            username: undefined,
            password: undefined,
            database: 'partial-db',
        });
    });

    it('should handle empty string values', () => {
        process.env = {
            DATABASE_TYPE: '',
            DATABASE_HOST: '',
            DATABASE_PORT: '',
        };

        const config = databaseConfig();

        expect(config.type).toBe('postgres');
        expect(config.host).toBe('localhost');
        expect(config.port).toBeNaN();
    });
});
