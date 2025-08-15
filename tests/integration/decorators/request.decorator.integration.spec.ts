import { INestApplication, Controller, Get } from '@nestjs/common';
import supertest from 'supertest';
import { IpAddress, RequestHeader, QueryParam } from '../../../src/decorators/request.decorator';
import { createTestAppWithControllers } from '../../fixtures/app.fixtures';
import { Server } from 'http';

@Controller('test-request')
class TestRequestController {
    @Get('ip-address')
    getIpAddress(@IpAddress() ipAddress: string): { ipAddress: string } {
        return { ipAddress };
    }

    @Get('header')
    getHeader(@RequestHeader('x-test-header') header: string): { header: string } {
        return { header };
    }

    @Get('query')
    getQueryParam(@QueryParam('testParam') param: string): { param: string } {
        return { param };
    }

    @Get('all-query')
    getAllQueryParams(@QueryParam() params: unknown): { params: unknown } {
        return { params };
    }
}

describe('Request Decorators Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestAppWithControllers([TestRequestController]);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('IpAddress Decorator', () => {
        it('should return the IP address of the request', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-request/ip-address').expect(200);

            expect(response.body.ipAddress).toBeDefined();
            expect(typeof response.body.ipAddress).toBe('string');
            // The IP in supertest is typically '::ffff:127.0.0.1' or similar
            expect(response.body.ipAddress).toContain('127.0.0.1');
        });
    });

    describe('RequestHeader Decorator', () => {
        it('should return the specified request header', async () => {
            const headerValue = 'test-header-value';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer)
                .get('/test-request/header')
                .set('X-Test-Header', headerValue)
                .expect(200);

            expect(response.body.header).toBe(headerValue);
        });

        it('should return undefined if the header does not exist', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-request/header').expect(200);

            expect(response.body.header).toBeUndefined();
        });
    });

    describe('QueryParam Decorator', () => {
        it('should return a specific query parameter', async () => {
            const paramValue = 'test-param-value';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer).get(`/test-request/query?testParam=${paramValue}`).expect(200);

            expect(response.body.param).toBe(paramValue);
        });

        it('should return undefined if the query parameter does not exist', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-request/query').expect(200);

            expect(response.body.param).toBeUndefined();
        });

        it('should return all query parameters when no specific parameter is requested', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer)
                .get('/test-request/all-query?param1=value1&param2=value2')
                .expect(200);

            expect(response.body.params).toEqual({
                param1: 'value1',
                param2: 'value2',
            });
        });
    });
});
