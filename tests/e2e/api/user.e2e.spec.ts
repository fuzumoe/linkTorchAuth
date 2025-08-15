import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../../../src/entities/user.entity';
import {
    cleanupTestUsers,
    createTestUser,
    createTestingModule,
    getCommonServices,
    safeRequest,
} from '../../fixtures/app.fixtures';

describe('UserController E2E', () => {
    let testingModule: TestingModule;
    let app: INestApplication;
    let userRepository: Repository<User>;
    let testUser: User;
    let adminUser: User;
    let accessToken: string;
    let adminAccessToken: string;

    const testPassword = 'TestPassword123!';
    let testEmail: string;
    let adminEmail: string;

    beforeAll(async () => {
        testingModule = await createTestingModule();
        app = testingModule.createNestApplication();

        await app.init();

        const services = getCommonServices(testingModule);
        userRepository = services.userRepository;
    });

    const createdUserIds: string[] = [];

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds);
        await app.close();
    });

    beforeEach(async () => {
        testEmail = `test-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        testUser = await createTestUser(testingModule, userRepository, createdUserIds, testEmail, testPassword);

        adminEmail = `admin-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        adminUser = await createTestUser(testingModule, userRepository, createdUserIds, adminEmail, testPassword);

        await userRepository.update({ id: adminUser.id }, { role: UserRole.ADMIN });
        const updatedAdminUser = await userRepository.findOneBy({ id: adminUser.id });
        if (updatedAdminUser) {
            adminUser = updatedAdminUser;
        }

        const userLoginResponse = await safeRequest(app).post('/auth/login').send({
            email: testEmail,
            password: testPassword,
        });

        const adminLoginResponse = await safeRequest(app).post('/auth/login').send({
            email: adminEmail,
            password: testPassword,
        });

        accessToken = userLoginResponse.body.accessToken as unknown as string;
        adminAccessToken = adminLoginResponse.body.accessToken as unknown as string;
    });

    describe('POST /users - Register a new user', () => {
        it('should allow admin to create a new user', async () => {
            const newUserEmail = `new-user-${uuidv4().substring(0, 8)}@test.integration.com`;

            const response = await safeRequest(app)
                .post('/users')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({
                    email: newUserEmail,
                    password: testPassword,
                    firstName: 'New',
                    lastName: 'User',
                    role: UserRole.USER,
                })
                .expect(201);

            expect(response.body.email).toBe(newUserEmail);
            expect(response.body.firstName).toBe('New');
            expect(response.body.lastName).toBe('User');
            expect(response.body.role).toBe(UserRole.USER);

            const createdUser = await userRepository.findOneBy({ email: newUserEmail });
            expect(createdUser).not.toBeNull();
            if (createdUser) {
                createdUserIds.push(createdUser.id);
            }
        });

        it('should not allow regular user to create a new user', async () => {
            const newUserEmail = `new-user-${uuidv4().substring(0, 8)}@test.integration.com`;

            await safeRequest(app)
                .post('/users')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    email: newUserEmail,
                    password: testPassword,
                    firstName: 'New',
                    lastName: 'User',
                })
                .expect(403);

            const createdUser = await userRepository.findOneBy({ email: newUserEmail });
            expect(createdUser).toBeNull();
        });

        it('should reject duplicate email addresses', async () => {
            await safeRequest(app)
                .post('/users')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({
                    email: testEmail,
                    password: testPassword,
                    firstName: 'Duplicate',
                    lastName: 'User',
                })
                .expect(400);
        });
    });

    describe('GET /users - Get all users', () => {
        it('should allow admin to list all users', async () => {
            const response = await safeRequest(app)
                .get('/users')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200);

            expect(response.body).toHaveProperty('items');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('pageCount');
            expect(response.body).toHaveProperty('limit');
            expect(Array.isArray(response.body.items)).toBe(true);
            expect(response.body.items.length).toBeGreaterThan(0);
        });

        it('should not allow regular user to list all users', async () => {
            await safeRequest(app).get('/users').set('Authorization', `Bearer ${accessToken}`).expect(403);
        });

        it('should support pagination and search parameters', async () => {
            for (let i = 0; i < 5; i++) {
                const email = `pagination-user-${i}-${uuidv4().substring(0, 8)}@test.integration.com`;
                await createTestUser(testingModule, userRepository, createdUserIds, email, testPassword);
            }

            const response = await safeRequest(app)
                .get('/users')
                .query({ page: 1, limit: 3 })
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200);

            expect(response.body.items.length).toEqual(10);
            expect(response.body.page).toBe('1');
            expect(response.body.limit).toBe('3');

            const searchResponse = await safeRequest(app)
                .get('/users')
                .query({ email: 'pagination-user' })
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200);

            expect(
                searchResponse.body.items.every((user: { email: string | string[] }) =>
                    user.email.includes('pagination-user')
                )
            ).toBe(true);
        });
    });

    describe('PATCH /users/:id - Update a user', () => {
        it('should allow user to update their own profile', async () => {
            const response = await safeRequest(app)
                .patch(`/users/${testUser.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: 'Updated',
                    lastName: 'Name',
                })
                .expect(200);

            expect(response.body.firstName).toBe('Updated');
            expect(response.body.lastName).toBe('Name');
            expect(response.body.id).toBe(testUser.id);

            const updatedUser = await userRepository.findOneBy({ id: testUser.id });
            expect(updatedUser).not.toBeNull();
            if (updatedUser) {
                expect(updatedUser.firstName).toBe('Updated');
                expect(updatedUser.lastName).toBe('Name');
            }
        });

        it('should allow admin to update any user profile', async () => {
            const response = await safeRequest(app)
                .patch(`/users/${testUser.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({
                    firstName: 'Admin',
                    lastName: 'Updated',
                    role: UserRole.ADMIN,
                })
                .expect(200);

            expect(response.body.firstName).toBe('Admin');
            expect(response.body.lastName).toBe('Updated');
            expect(response.body.role).toBe(UserRole.ADMIN);

            const updatedUser = await userRepository.findOneBy({ id: testUser.id });
            expect(updatedUser).not.toBeNull();
            if (updatedUser) {
                expect(updatedUser.firstName).toBe('Admin');
                expect(updatedUser.lastName).toBe('Updated');
                expect(updatedUser.role).toBe(UserRole.ADMIN);
            }
        });

        it('should not allow regular user to update other users', async () => {
            await safeRequest(app)
                .patch(`/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                    firstName: 'Hacked',
                    lastName: 'Name',
                })
                .expect(403);

            const unchangedUser = await userRepository.findOneBy({ id: adminUser.id });
            expect(unchangedUser).not.toBeNull();
            if (unchangedUser) {
                expect(unchangedUser.firstName).not.toBe('Hacked');
            }
        });

        it('should return 404 for non-existent user', async () => {
            const nonExistentId = '00000000-0000-4000-a000-000000000000';

            await safeRequest(app)
                .patch(`/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({
                    firstName: 'Not',
                    lastName: 'Found',
                })
                .expect(404);
        });
    });

    describe('DELETE /users/:id - Delete a user', () => {
        it('should allow admin to delete a user', async () => {
            const userToDelete = await createTestUser(
                testingModule,
                userRepository,
                createdUserIds,
                `delete-user-${uuidv4().substring(0, 8)}@test.integration.com`,
                testPassword
            );

            const response = await safeRequest(app)
                .delete(`/users/${userToDelete.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);

            const deletedUser = await userRepository.findOneBy({ id: userToDelete.id });
            expect(deletedUser).toBeNull();

            const index = createdUserIds.indexOf(userToDelete.id);
            if (index > -1) {
                createdUserIds.splice(index, 1);
            }
        });

        it('should not allow admin to delete their own account', async () => {
            await safeRequest(app)
                .delete(`/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(400);

            const adminStillExists = await userRepository.findOneBy({ id: adminUser.id });
            expect(adminStillExists).not.toBeNull();
        });

        it('should not allow regular user to delete any user', async () => {
            const userToNotDelete = await createTestUser(
                testingModule,
                userRepository,
                createdUserIds,
                `nodelete-user-${uuidv4().substring(0, 8)}@test.integration.com`,
                testPassword
            );

            await safeRequest(app)
                .delete(`/users/${userToNotDelete.id}`)
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(403);

            const userStillExists = await userRepository.findOneBy({ id: userToNotDelete.id });
            expect(userStillExists).not.toBeNull();
        });

        it('should return 404 for non-existent user', async () => {
            const nonExistentId = '00000000-0000-4000-a000-000000000000';

            await safeRequest(app)
                .delete(`/users/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(404);
        });
    });

    describe('GET /users/me - Get current user profile', () => {
        it('should return the current user profile', async () => {
            const response = await safeRequest(app)
                .get('/users/me')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            expect(response.body.id).toBe(testUser.id);
            expect(response.body.email).toBe(testUser.email);
            expect(response.body.firstName).toBe(testUser.firstName);
            expect(response.body.lastName).toBe(testUser.lastName);
        });

        it('should return 401 for unauthenticated request', async () => {
            await safeRequest(app).get('/users/me').expect(401);
        });
    });
});
