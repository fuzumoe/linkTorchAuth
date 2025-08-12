import { DatabaseConfig } from '@auth/interfaces/database.interface';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
    const dbConfig = configService.get<DatabaseConfig>('database');

    if (!dbConfig) {
        throw new Error('Database configuration is missing');
    }

    return {
        type: dbConfig.type,
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [process.cwd() + '/dist/**/*.entity.js'],
        migrations: [process.cwd() + '/dist/migrations/*.js'],
        migrationsTableName: 'migrations',
    } as TypeOrmModuleOptions;
};
