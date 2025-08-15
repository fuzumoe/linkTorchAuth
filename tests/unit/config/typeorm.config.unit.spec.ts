import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { typeOrmConfig } from '../../../src/config/typeorm.config';
import { DatabaseConfig } from '../../../src/interfaces/database.interface';

describe('TypeOrmConfig', () => {
    let configService: ConfigService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(),
                    },
                },
            ],
        }).compile();

        configService = moduleRef.get<ConfigService>(ConfigService);
    });

    it('should throw an error if database config is missing', () => {
        jest.spyOn(configService, 'get').mockReturnValue(undefined);

        expect(() => typeOrmConfig(configService)).toThrow('Database configuration is missing');
    });

    it('should return valid TypeOrmModuleOptions when config is valid', () => {
        const mockDbConfig: DatabaseConfig = {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            basename: 'linkTorchAuthDb',
            username: 'postgres',
            password: 'postgres',
            database: 'linktorch_auth',
        };

        jest.spyOn(configService, 'get').mockReturnValue(mockDbConfig);

        const result = typeOrmConfig(configService);

        expect(result).toEqual({
            type: mockDbConfig.type,
            host: mockDbConfig.host,
            port: mockDbConfig.port,
            username: mockDbConfig.username,
            password: mockDbConfig.password,
            database: mockDbConfig.database,
            entities: [expect.stringContaining('/dist/**/*.entity.js')],
            migrations: [expect.stringContaining('/dist/migrations/*.js')],
            migrationsTableName: 'migrations',
        });
    });

    it('should use process.cwd() for entities and migrations paths', () => {
        const mockDbConfig: DatabaseConfig = {
            type: 'postgres',
            host: 'localhost',
            port: 5432,
            basename: 'linkTorchAuthDb',
            username: 'postgres',
            password: 'postgres',
            database: 'linktorch_auth',
        };

        jest.spyOn(configService, 'get').mockReturnValue(mockDbConfig);

        // Get the current working directory before mocking
        const originalPath = process.cwd();

        // Mock process.cwd
        process.cwd = jest.fn().mockReturnValue('/test/path');

        try {
            const result = typeOrmConfig(configService);

            expect(result.entities).toEqual(['/test/path/dist/**/*.entity.js']);
            expect(result.migrations).toEqual(['/test/path/dist/migrations/*.js']);
        } finally {
            // Restore original method by creating a new function
            process.cwd = jest.fn().mockReturnValue(originalPath);
        }
    });
});
