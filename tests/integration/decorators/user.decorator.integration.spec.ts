import { INestApplication, Controller, Get, UseGuards } from '@nestjs/common';
import supertest from 'supertest';
import { CurrentUser, UserProperty } from '../../../src/decorators/user.decorator';
import { createTestAppWithControllers } from '../../fixtures/app.fixtures';
import { AuthGuard } from '@nestjs/passport';
import { User, UserRole } from '../../../src/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import { Server } from 'http';

// Mock AuthGuard that will attach a user to the request
class MockAuthGuard {
    // Using ExecutionContext type from @nestjs/common would be better,
    // but for simplicity in tests we use unknown and type assertion
    canActivate(context: unknown): boolean {
        type ContextType = { switchToHttp: () => { getRequest: () => { user?: unknown } } };
        const req = (context as ContextType).switchToHttp().getRequest();

        req.user = {
            id: 'test-user-id',
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: UserRole.USER,
            isActive: true,
            isEmailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return true;
    }
}

// Mock JWT service
class MockJwtService {
    // We don't use the payload in this test, but we keep the parameter
    // to match the interface
    sign(): string {
        return 'mock-jwt-token';
    }
}

@Controller('test-user')
@UseGuards(MockAuthGuard)
class TestUserController {
    @Get('current-user')
    getCurrentUser(@CurrentUser() user: Partial<User>): { user: Partial<User> } {
        return { user };
    }

    @Get('user-id')
    getUserId(@UserProperty('id') userId: string): { userId: string } {
        return { userId };
    }

    @Get('user-email')
    getUserEmail(@UserProperty('email') email: string): { email: string } {
        return { email };
    }

    @Get('user-name')
    getUserName(
        @UserProperty('firstName') firstName: string,
        @UserProperty('lastName') lastName: string
    ): { firstName: string; lastName: string } {
        return { firstName, lastName };
    }
}

describe('User Decorators Integration Tests', () => {
    let app: INestApplication;

    beforeAll(async () => {
        app = await createTestAppWithControllers(
            [TestUserController],
            [
                {
                    provide: AuthGuard('jwt'),
                    useClass: MockAuthGuard,
                },
                {
                    provide: JwtService,
                    useClass: MockJwtService,
                },
            ]
        );
    });

    afterAll(async () => {
        await app.close();
    });

    describe('CurrentUser Decorator', () => {
        it('should return the full user object from the request', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-user/current-user').expect(200);

            expect(response.body.user).toBeDefined();
            expect(response.body.user.id).toBe('test-user-id');
            expect(response.body.user.email).toBe('test@example.com');
            expect(response.body.user.firstName).toBe('Test');
            expect(response.body.user.lastName).toBe('User');
            expect(response.body.user.role).toBe(UserRole.USER);
            expect(response.body.user.isActive).toBe(true);
        });
    });

    describe('UserProperty Decorator', () => {
        it('should return specific user ID property', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-user/user-id').expect(200);

            expect(response.body.userId).toBe('test-user-id');
        });

        it('should return specific user email property', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-user/user-email').expect(200);

            expect(response.body.email).toBe('test@example.com');
        });

        it('should return specific user name properties', async () => {
            const httpServer = app.getHttpServer() as Server;
            const response = await supertest(httpServer).get('/test-user/user-name').expect(200);

            expect(response.body.firstName).toBe('Test');
            expect(response.body.lastName).toBe('User');
        });
    });
});
