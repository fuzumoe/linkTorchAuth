import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Define the database config interface to match the structure from database.config.ts
interface DatabaseConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
}

export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
    const dbConfig = configService.get<DatabaseConfig>('database');

    if (!dbConfig) {
        throw new Error('Database configuration is missing');
    }

    return {
        type: 'postgres',
        host: dbConfig.host,
        port: dbConfig.port,
        username: dbConfig.username,
        password: dbConfig.password,
        database: dbConfig.database,
        entities: [process.cwd() + '/dist/**/*.entity.js'],
        migrations: [process.cwd() + '/dist/migrations/*.js'],
        migrationsTableName: 'migrations',
    };
};
