import { INestApplication, Controller, Get } from '@nestjs/common';
import supertest from 'supertest';
import { DeviceInfo, DeviceInfoObj } from '../../../src/decorators/device-info.decorator';
import { createTestAppWithControllers } from '../../fixtures/app.fixtures';
import { Server } from 'http';

@Controller('test-device-info')
class TestDeviceInfoController {
    @Get('string')
    getDeviceInfoAsString(@DeviceInfo() deviceInfo: string): { deviceInfo: string } {
        return { deviceInfo };
    }

    @Get('object')
    getDeviceInfoAsObject(@DeviceInfoObj() deviceInfoObj: { userAgent?: string; ipAddress: string }): {
        deviceInfoObj: { userAgent?: string; ipAddress: string };
    } {
        return { deviceInfoObj };
    }
}

describe('DeviceInfo Decorators Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestAppWithControllers([TestDeviceInfoController]);
    });

    afterAll(async () => {
        await app.close();
    });

    describe('DeviceInfo Decorator', () => {
        it('should return device info string with user agent and IP address', async () => {
            const userAgent = 'Integration-Test-Agent';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer)
                .get('/test-device-info/string')
                .set('User-Agent', userAgent)
                .expect(200);

            expect(response.body.deviceInfo).toBeDefined();
            expect(response.body.deviceInfo).toContain(userAgent);
            expect(response.body.deviceInfo).toMatch(/\(.*\)$/);
        });

        it('should handle requests without a user agent', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer)
                .get('/test-device-info/string')
                .set('User-Agent', '')
                .expect(200);

            expect(response.body.deviceInfo).toBeDefined();

            expect(response.body.deviceInfo).toBeTruthy();
        });

        it('should include x-forwarded-for in device info when present', async () => {
            const userAgent = 'Integration-Test-Agent';
            const forwardedIp = '203.0.113.195';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer)
                .get('/test-device-info/string')
                .set('User-Agent', userAgent)
                .set('X-Forwarded-For', forwardedIp)
                .expect(200);

            expect(response.body.deviceInfo).toBeDefined();
            expect(response.body.deviceInfo).toContain(userAgent);
            expect(response.body.deviceInfo).toContain(userAgent);
        });
    });

    describe('DeviceInfoObj Decorator', () => {
        it('should return device info object with user agent and IP address', async () => {
            const userAgent = 'Integration-Test-Agent';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer)
                .get('/test-device-info/object')
                .set('User-Agent', userAgent)
                .expect(200);

            expect(response.body.deviceInfoObj).toBeDefined();
            expect(response.body.deviceInfoObj.userAgent).toEqual(userAgent);
            expect(response.body.deviceInfoObj.ipAddress).toBeTruthy();
        });

        it('should return object with undefined userAgent when not provided', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer)
                .get('/test-device-info/object')
                .set('User-Agent', '')
                .expect(200);

            expect(response.body.deviceInfoObj).toBeDefined();
            expect(response.body.deviceInfoObj.userAgent).toBeFalsy();
            expect(response.body.deviceInfoObj.ipAddress).toBeTruthy();
        });

        it('should include x-forwarded-for in device info object when present', async () => {
            const userAgent = 'Integration-Test-Agent';
            const forwardedIp = '203.0.113.195';
            const httpServer = app.getHttpServer() as Server;

            const response = await supertest(httpServer)
                .get('/test-device-info/object')
                .set('User-Agent', userAgent)
                .set('X-Forwarded-For', forwardedIp)
                .expect(200);

            expect(response.body.deviceInfoObj).toBeDefined();
            expect(response.body.deviceInfoObj.userAgent).toEqual(userAgent);
            expect(response.body.deviceInfoObj.ipAddress).toBeTruthy();
        });
    });
});
