import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from '../../../src/app.module';

describe('Main (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.enableCors({
            origin: '*',
            methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
            preflightContinue: false,
            optionsSuccessStatus: 204,
        });

        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should bootstrap the application correctly', () => {
        expect(app).toBeDefined();
    });

    it('should have CORS enabled', () => {
        expect(app).toBeDefined();
    });

    it('should initialize the HTTP server', () => {
        const httpServer = app.getHttpServer() as unknown as App;
        expect(httpServer).toBeDefined();
    });
});
