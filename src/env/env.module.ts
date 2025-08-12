import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ENV_VALIDATION_SCHEMA } from './env.constants';
import databaseConfig from '../config/database.config';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            expandVariables: true,
            validationSchema: ENV_VALIDATION_SCHEMA,
            load: [databaseConfig],
        }),
    ],
    exports: [ConfigModule],
})
export class EnvModule {}
