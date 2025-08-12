import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EnvModule } from './env/env.module';
import { DatabaseModule } from './database/database.module';

@Module({
    imports: [EnvModule, DatabaseModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
