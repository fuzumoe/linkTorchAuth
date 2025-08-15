import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../../../src/entities/refresh-token.entity';
import { User, UserRole } from '../../../src/entities/user.entity';
import { createTestingModule } from '../../fixtures/app.fixtures';

describe('TypeORM CRUD E2E', () => {
    let app: INestApplication;
    let testingModule: TestingModule;
    let dataSource: DataSource;
    let userRepository: Repository<User>;
    let refreshTokenRepository: Repository<RefreshToken>;

    beforeAll(async () => {
        testingModule = await createTestingModule();
        app = testingModule.createNestApplication();
        await app.init();

        dataSource = testingModule.get<DataSource>(DataSource);
        userRepository = dataSource.getRepository(User);
        refreshTokenRepository = dataSource.getRepository(RefreshToken);

        console.log('Clearing database...');
        try {
            await dataSource.query(`DROP TABLE IF EXISTS refresh_tokens CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS email_verifications CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS password_resets CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
            await dataSource.query(`DROP TABLE IF EXISTS users CASCADE`);

            await dataSource.query(`DROP TYPE IF EXISTS users_role_enum CASCADE`);
            await dataSource.query(`DROP TYPE IF EXISTS audit_logs_action_enum CASCADE`);

            console.log('Database cleared successfully.');
        } catch (error) {
            console.error('Error clearing database:', error.message);
        }

        console.log('Synchronizing database schema...');
        try {
            await dataSource.synchronize(true);
            console.log('Database schema synchronized successfully');
        } catch (error) {
            console.error('Error synchronizing database:', error.message);
            throw error;
        }
    });

    afterAll(async () => {
        console.log('Cleaning up database...');
        try {
            await dataSource.query(`DELETE FROM refresh_tokens`);
            await dataSource.query(`DELETE FROM users`);
            console.log('Database cleanup completed');
        } catch (error) {
            console.error('Error cleaning up database:', error.message);
        }

        await app.close();
    });

    describe('User CRUD operations', () => {
        const testEmail = `test-user-${uuidv4().substring(0, 8)}@test.crud.com`;
        let createdUserId: string;

        it('should create a new user', async () => {
            const user = new User();
            user.email = testEmail;
            user.password = 'hashedPassword123';
            user.firstName = 'Test';
            user.lastName = 'User';
            user.isEmailVerified = false;
            user.isActive = true;
            user.role = UserRole.USER;

            const savedUser = await userRepository.save(user);
            createdUserId = savedUser.id;

            expect(savedUser).toBeDefined();
            expect(savedUser.id).toBeDefined();
            expect(savedUser.email).toBe(testEmail);
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });

        it('should find user by ID', async () => {
            const foundUser = await userRepository.findOne({
                where: { id: createdUserId },
            });

            expect(foundUser).toBeDefined();
            expect(foundUser?.id).toBe(createdUserId);
            expect(foundUser?.email).toBe(testEmail);
        });

        it('should find user by email', async () => {
            const foundUser = await userRepository.findOne({
                where: { email: testEmail },
            });

            expect(foundUser).toBeDefined();
            expect(foundUser?.id).toBe(createdUserId);
            expect(foundUser?.email).toBe(testEmail);
        });

        it('should update user information', async () => {
            const updatedFirstName = 'UpdatedFirst';
            const updatedLastName = 'UpdatedLast';

            await userRepository.update(
                { id: createdUserId },
                {
                    firstName: updatedFirstName,
                    lastName: updatedLastName,
                }
            );

            const updatedUser = await userRepository.findOne({
                where: { id: createdUserId },
            });

            expect(updatedUser).toBeDefined();
            expect(updatedUser?.firstName).toBe(updatedFirstName);
            expect(updatedUser?.lastName).toBe(updatedLastName);
            expect(updatedUser?.email).toBe(testEmail);
        });

        it('should handle partial updates correctly', async () => {
            await userRepository.update({ id: createdUserId }, { isEmailVerified: true });

            const partiallyUpdatedUser = await userRepository.findOne({
                where: { id: createdUserId },
            });

            expect(partiallyUpdatedUser).toBeDefined();
            expect(partiallyUpdatedUser?.isEmailVerified).toBe(true);
            expect(partiallyUpdatedUser?.firstName).toBe('UpdatedFirst');
            expect(partiallyUpdatedUser?.lastName).toBe('UpdatedLast');
        });

        it('should delete user', async () => {
            const tempUser = new User();
            tempUser.email = `temp-user-${uuidv4().substring(0, 8)}@test.crud.com`;
            tempUser.password = 'tempPassword123';
            tempUser.isActive = true;
            tempUser.role = UserRole.USER;

            const savedTempUser = await userRepository.save(tempUser);
            const tempUserId = savedTempUser.id;

            let userExists = await userRepository.findOne({
                where: { id: tempUserId },
            });
            expect(userExists).toBeDefined();

            await userRepository.delete({ id: tempUserId });

            userExists = await userRepository.findOne({
                where: { id: tempUserId },
            });
            expect(userExists).toBeNull();
        });
    });

    describe('RefreshToken CRUD and relationships', () => {
        let testUser: User;
        let createdTokenId: string;

        beforeAll(async () => {
            const user = new User();
            user.email = `token-test-user-${uuidv4().substring(0, 8)}@test.crud.com`;
            user.password = 'hashedPassword123';
            user.isActive = true;
            user.role = UserRole.USER;

            testUser = await userRepository.save(user);
        });

        afterAll(async () => {
            if (testUser?.id) {
                await userRepository.delete({ id: testUser.id });
            }
        });

        it('should create a refresh token linked to user', async () => {
            const token = new RefreshToken();
            token.token = `token-${uuidv4()}`;
            token.userId = testUser.id;
            token.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            token.deviceInfo = 'Test Device';
            token.ipAddress = '127.0.0.1';
            token.isRevoked = false;

            const savedToken = await refreshTokenRepository.save(token);
            createdTokenId = savedToken.id;

            expect(savedToken).toBeDefined();
            expect(savedToken.id).toBeDefined();
            expect(savedToken.userId).toBe(testUser.id);
            expect(savedToken.token).toBe(token.token);
            expect(savedToken.createdAt).toBeDefined();
        });

        it('should find refresh token by ID', async () => {
            const foundToken = await refreshTokenRepository.findOne({
                where: { id: createdTokenId },
            });

            expect(foundToken).toBeDefined();
            expect(foundToken?.id).toBe(createdTokenId);
            expect(foundToken?.userId).toBe(testUser.id);
        });

        it('should find refresh token by token string', async () => {
            const tokenRecord = await refreshTokenRepository.findOne({
                where: { id: createdTokenId },
            });
            const tokenString = tokenRecord?.token;

            const foundToken = await refreshTokenRepository.findOne({
                where: { token: tokenString },
            });

            expect(foundToken).toBeDefined();
            expect(foundToken?.id).toBe(createdTokenId);
            expect(foundToken?.userId).toBe(testUser.id);
        });

        it('should find all tokens for a user', async () => {
            const token2 = new RefreshToken();
            token2.token = `token-${uuidv4()}`;
            token2.userId = testUser.id;
            token2.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            token2.deviceInfo = 'Test Device 2';
            token2.ipAddress = '127.0.0.2';
            token2.isRevoked = false;

            await refreshTokenRepository.save(token2);

            const userTokens = await refreshTokenRepository.find({
                where: { userId: testUser.id },
            });

            expect(userTokens.length).toBeGreaterThanOrEqual(2);
            expect(userTokens.some((t) => t.id === createdTokenId)).toBe(true);
        });

        it('should update refresh token', async () => {
            await refreshTokenRepository.update({ id: createdTokenId }, { isRevoked: true });

            const updatedToken = await refreshTokenRepository.findOne({
                where: { id: createdTokenId },
            });

            expect(updatedToken).toBeDefined();
            expect(updatedToken?.isRevoked).toBe(true);
        });

        it('should delete all tokens when user is deleted', async () => {
            const tempUser = new User();
            tempUser.email = `cascade-test-user-${uuidv4().substring(0, 8)}@test.crud.com`;
            tempUser.password = 'tempPassword123';
            tempUser.isActive = true;
            tempUser.role = UserRole.USER;

            const savedTempUser = await userRepository.save(tempUser);

            const token1 = new RefreshToken();
            token1.token = `cascade-token-1-${uuidv4()}`;
            token1.userId = savedTempUser.id;
            token1.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            token1.isRevoked = false;

            const token2 = new RefreshToken();
            token2.token = `cascade-token-2-${uuidv4()}`;
            token2.userId = savedTempUser.id;
            token2.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            token2.isRevoked = false;

            await refreshTokenRepository.save([token1, token2]);

            const tokensBeforeDelete = await refreshTokenRepository.find({
                where: { userId: savedTempUser.id },
            });
            expect(tokensBeforeDelete.length).toBe(2);

            await userRepository.delete({ id: savedTempUser.id });

            const tokensAfterDelete = await refreshTokenRepository.find({
                where: { userId: savedTempUser.id },
            });
            expect(tokensAfterDelete.length).toBe(0);
        });
    });

    describe('Complex queries and operations', () => {
        let testUsers: User[] = [];

        beforeAll(async () => {
            const userPromises: Promise<User>[] = [];
            for (let i = 0; i < 5; i++) {
                const user = new User();
                user.email = `complex-user-${i}-${uuidv4().substring(0, 8)}@test.crud.com`;
                user.password = 'hashedPassword123';
                user.firstName = `FirstName${i}`;
                user.lastName = `LastName${i}`;
                user.isActive = i % 2 === 0;
                user.isEmailVerified = i % 3 === 0;
                user.role = i === 0 ? UserRole.ADMIN : UserRole.USER;

                userPromises.push(userRepository.save(user));
            }

            testUsers = await Promise.all(userPromises);
        });

        afterAll(async () => {
            if (testUsers.length > 0) {
                const userIds = testUsers.map((user) => user.id);
                await userRepository.delete(userIds);
            }
        });

        it('should perform pagination and sorting', async () => {
            const [users, count] = await userRepository.findAndCount({
                skip: 1,
                take: 2,
                order: {
                    firstName: 'ASC',
                },
            });

            expect(users).toBeDefined();
            expect(users.length).toBe(2);
            expect(count).toBeGreaterThanOrEqual(5);

            if (users.length >= 2) {
                const firstName1 = users[0].firstName || '';
                const firstName2 = users[1].firstName || '';
                expect(firstName1.localeCompare(firstName2)).toBeLessThanOrEqual(0);
            }
        });

        it('should filter users by multiple criteria', async () => {
            const filteredUsers = await userRepository.find({
                where: {
                    isActive: true,
                    isEmailVerified: false,
                },
            });

            expect(filteredUsers).toBeDefined();

            filteredUsers.forEach((user) => {
                expect(user.isActive).toBe(true);
                expect(user.isEmailVerified).toBe(false);
            });
        });

        it('should perform partial text search', async () => {
            const searchTerm = 'complex';

            const searchResults = await userRepository
                .createQueryBuilder('user')
                .where('user.email LIKE :searchTerm', { searchTerm: `%${searchTerm}%` })
                .getMany();

            expect(searchResults).toBeDefined();
            expect(searchResults.length).toBeGreaterThanOrEqual(testUsers.length);

            searchResults.forEach((user) => {
                expect(user.email.toLowerCase()).toContain(searchTerm);
            });
        });

        it('should find users with specific role', async () => {
            const adminUsers = await userRepository.find({
                where: { role: UserRole.ADMIN },
            });

            expect(adminUsers).toBeDefined();
            expect(adminUsers.length).toBeGreaterThanOrEqual(1);

            adminUsers.forEach((user) => {
                expect(user.role).toBe(UserRole.ADMIN);
            });
        });

        it('should support complex update operations', async () => {
            await userRepository.update({ isEmailVerified: false }, { isActive: false });

            const stillActiveUnverifiedUsers = await userRepository.find({
                where: {
                    isEmailVerified: false,
                    isActive: true,
                },
            });

            expect(stillActiveUnverifiedUsers.length).toBe(0);
        });
    });
});
