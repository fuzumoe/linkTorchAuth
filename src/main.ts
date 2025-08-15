import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './interfaces/app.interface';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const appConfig = configService.get<AppConfig>('app');

    // Get configuration values
    const port = appConfig?.port || 3000;
    const apiBasePrefix = appConfig?.apiBasePrefix || '/api';
    const apiVersion = appConfig?.apiVersion || 'v1';
    const appName = appConfig?.appName || 'LinkTorch Auth';
    const appDescription = appConfig?.appDescription || 'The LinkTorch authentication and authorization API';

    // Set global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        })
    );

    // Set API prefix
    app.setGlobalPrefix(apiBasePrefix);

    // Configure Swagger
    const config = new DocumentBuilder()
        .setTitle(appName)
        .setDescription(appDescription)
        .setVersion(apiVersion)
        .addBearerAuth()
        .addBasicAuth()
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiBasePrefix}/${apiVersion}/docs`, app, document);

    await app.listen(port);
    console.log(`Application running on port ${port}`);
    console.log(`Swagger documentation available at: http://localhost:${port}${apiBasePrefix}/${apiVersion}/docs`);
}
void bootstrap();
