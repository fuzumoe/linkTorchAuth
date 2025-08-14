import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../src/entities/user.entity';
import { createTestingModule, cleanupTestUsers, getCommonServices } from '../../fixtures/app.fixtures';

describe('UserSubscriber Integration Test with PostgreSQL', () => {
    let app: TestingModule;
    let userRepository: Repository<User>;

    const createdUserIds: string[] = [];

    beforeAll(async () => {
        app = await createTestingModule();

        const services = getCommonServices(app);
        userRepository = services.userRepository;

        await cleanupTestUsers(userRepository, createdUserIds, '%@test.integration.com%');
    });

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds, '%@test.integration.com%');
        await app.close();
    });

    describe('beforeInsert', () => {
        it('should hash password when a new user is created', async () => {
            const testUser = userRepository.create({
                email: `hash-test-${Date.now()}@test.integration.com`,
                password: 'password123',
                firstName: 'Test',
                lastName: 'User',
            });

            const savedUser = await userRepository.save(testUser);
            createdUserIds.push(savedUser.id);

            expect(savedUser.password).not.toBe('password123');
            expect(savedUser.password).toMatch(/^\$2b\$/);

            expect(savedUser.password).not.toBe('password123');
            expect(savedUser.password).toMatch(/^\$2[abxy]\$/);
        });

        it('should set isActive to true if not provided', async () => {
            const testUser = userRepository.create({
                email: `active-test-${Date.now()}@test.integration.com`,
                password: 'password123',
                firstName: 'Active',
                lastName: 'User',
            });

            const savedUser = await userRepository.save(testUser);
            createdUserIds.push(savedUser.id);

            expect(savedUser.isActive).toBe(true);
        });

        it('should set isActive to true even if provided as false', async () => {
            const testUser = userRepository.create({
                email: `inactive-test-${Date.now()}@test.integration.com`,
                password: 'password123',
                firstName: 'Inactive',
                lastName: 'User',
                isActive: false,
            });

            const savedUser = await userRepository.save(testUser);
            createdUserIds.push(savedUser.id);

            expect(savedUser.isActive).toBe(true);
        });
    });

    describe('beforeUpdate', () => {
        it('should hash password when updating user with new password', async () => {
            const testUser = userRepository.create({
                email: `update-test-${Date.now()}@test.integration.com`,
                password: 'originalPassword',
                firstName: 'Update',
                lastName: 'User',
            });

            const savedUser = await userRepository.save(testUser);
            createdUserIds.push(savedUser.id);
            const originalHash = savedUser.password;

            savedUser.password = 'newPassword';
            const updatedUser = await userRepository.save(savedUser);

            expect(updatedUser.password).not.toBe('newPassword');
            expect(updatedUser.password).not.toBe(originalHash);
            expect(updatedUser.password).toMatch(/^\$2b\$/);

            expect(updatedUser.password).toBeDefined();
            const isPasswordValid = await bcrypt.compare('newPassword', updatedUser.password!);
            expect(isPasswordValid).toBe(true);
        });

        it('should not rehash an already hashed password when updating other fields', async () => {
            const testUser = userRepository.create({
                email: `nohash-test-${Date.now()}@test.integration.com`,
                password: 'securePassword',
                firstName: 'NoHash',
                lastName: 'User',
            });

            const savedUser = await userRepository.save(testUser);
            createdUserIds.push(savedUser.id);
            const originalHash = savedUser.password;

            savedUser.firstName = 'UpdatedName';
            const updatedUser = await userRepository.save(savedUser);

            expect(updatedUser.password).toBe(originalHash);
        });
    });
});
