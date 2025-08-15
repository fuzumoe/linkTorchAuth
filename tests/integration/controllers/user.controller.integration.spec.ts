import { TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserController } from '../../../src/controllers/user.controller';
import { RegisterDto, UpdateUserDto } from '../../../src/dtos/user.dto';
import { User, UserRole } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { UserService } from '../../../src/services/user.service';
import { cleanupTestUsers, createTestingModule, createTestUser, getCommonServices } from '../../fixtures/app.fixtures';

describe('UserController Integration', () => {
    let testingModule: TestingModule;
    let userController: UserController;
    let authService: AuthService;
    let userService: UserService;
    let userRepository: Repository<User>;
    let testUser: User;
    let adminUser: User;

    const testPassword = 'TestPassword123!';
    let testEmail: string;
    let adminEmail: string;

    beforeAll(async () => {
        testingModule = await createTestingModule();

        const services = getCommonServices(testingModule);
        userRepository = services.userRepository;
        authService = services.authService;
        userService = services.userService;

        userController = new UserController(userService, authService);
    });

    const createdUserIds: string[] = [];

    afterAll(async () => {
        await cleanupTestUsers(userRepository, createdUserIds);
    });

    beforeEach(async () => {
        testEmail = `test-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        testUser = await createTestUser(testingModule, userRepository, createdUserIds, testEmail, testPassword);

        adminEmail = `admin-user-${uuidv4().substring(0, 8)}@test.integration.com`;
        adminUser = await createTestUser(testingModule, userRepository, createdUserIds, adminEmail, testPassword);

        adminUser.role = UserRole.ADMIN;
        await userRepository.save(adminUser);
    });

    describe('register', () => {
        it('should allow admin to create a new user', async () => {
            const newUserEmail = `new-user-${uuidv4().substring(0, 8)}@test.integration.com`;
            const registerDto: RegisterDto = {
                email: newUserEmail,
                password: 'NewPassword123!',
                firstName: 'New',
                lastName: 'User',
                role: UserRole.USER,
            };

            const result = await userController.register(adminUser, registerDto);

            expect(result).toBeDefined();
            expect(result.email).toBe(newUserEmail);
            expect(result.firstName).toBe('New');
            expect(result.lastName).toBe('User');

            const createdUser = await userRepository.findOne({ where: { email: newUserEmail } });
            expect(createdUser).toBeDefined();
            if (createdUser) {
                createdUserIds.push(createdUser.id);
            }
        });

        it('should deny regular user from creating a new user', async () => {
            const newUserEmail = `blocked-user-${uuidv4().substring(0, 8)}@test.integration.com`;
            const registerDto: RegisterDto = {
                email: newUserEmail,
                password: 'NewPassword123!',
                firstName: 'Blocked',
                lastName: 'User',
                role: UserRole.USER,
            };

            await expect(userController.register(testUser, registerDto)).rejects.toThrow(
                'Only administrators can create new users'
            );
        });

        it('should reject registration with existing email', async () => {
            const registerDto: RegisterDto = {
                email: testEmail,
                password: 'NewPassword123!',
                firstName: 'Duplicate',
                lastName: 'User',
                role: UserRole.USER,
            };

            await expect(userController.register(adminUser, registerDto)).rejects.toThrow(
                'User with this email already exists'
            );
        });
    });

    describe('findAll', () => {
        it('should allow admin to get a list of users', async () => {
            const result = await userController.findAll(adminUser, { page: 1, limit: 10 });

            expect(result).toBeDefined();
            expect(result.items).toBeInstanceOf(Array);
            expect(result.total).toBeGreaterThanOrEqual(2);
            expect(result.page).toBe(1);
        });

        it('should deny regular user from getting list of users', async () => {
            await expect(userController.findAll(testUser, { page: 1, limit: 10 })).rejects.toThrow(
                'Only administrators can access the users list'
            );
        });
    });

    describe('updateUser', () => {
        it('should allow user to update their own profile', async () => {
            const updateDto: UpdateUserDto = {
                firstName: 'Updated',
                lastName: 'Name',
            };

            const result = await userController.updateUser(testUser, testUser.id, updateDto);

            expect(result).toBeDefined();
            expect(result.firstName).toBe('Updated');
            expect(result.lastName).toBe('Name');

            const updatedUser = await userRepository.findOne({ where: { id: testUser.id } });
            expect(updatedUser).not.toBeNull();
            if (updatedUser) {
                expect(updatedUser.firstName).toBe('Updated');
                expect(updatedUser.lastName).toBe('Name');
            }
        });

        it('should allow admin to update any user profile', async () => {
            const updateDto: UpdateUserDto = {
                firstName: 'Admin',
                lastName: 'Updated',
            };

            const result = await userController.updateUser(adminUser, testUser.id, updateDto);

            expect(result).toBeDefined();
            expect(result.firstName).toBe('Admin');
            expect(result.lastName).toBe('Updated');
        });

        it('should deny user from updating other user profiles', async () => {
            const anotherUserEmail = `another-user-${uuidv4().substring(0, 8)}@test.integration.com`;
            const anotherUser = await createTestUser(
                testingModule,
                userRepository,
                createdUserIds,
                anotherUserEmail,
                testPassword
            );

            const updateDto: UpdateUserDto = {
                firstName: 'Unauthorized',
                lastName: 'Update',
            };

            await expect(userController.updateUser(testUser, anotherUser.id, updateDto)).rejects.toThrow(
                'You can only update your own profile'
            );
        });

        it('should return not found for non-existent user', async () => {
            const nonExistentId = uuidv4();
            const updateDto: UpdateUserDto = {
                firstName: 'Not',
                lastName: 'Found',
            };

            await expect(userController.updateUser(adminUser, nonExistentId, updateDto)).rejects.toThrow(
                'User not found'
            );
        });
    });

    describe('deleteUser', () => {
        it('should allow admin to delete a user', async () => {
            const userToDeleteEmail = `delete-user-${uuidv4().substring(0, 8)}@test.integration.com`;
            const userToDelete = await createTestUser(
                testingModule,
                userRepository,
                createdUserIds,
                userToDeleteEmail,
                testPassword
            );

            const result = await userController.deleteUser(adminUser, userToDelete.id);

            expect(result).toBeDefined();
            expect(result.success).toBe(true);

            const deletedUser = await userRepository.findOne({ where: { id: userToDelete.id } });
            expect(deletedUser).toBeNull();

            const index = createdUserIds.indexOf(userToDelete.id);
            if (index > -1) {
                createdUserIds.splice(index, 1);
            }
        });

        it('should deny regular user from deleting users', async () => {
            await expect(userController.deleteUser(testUser, adminUser.id)).rejects.toThrow(
                'Only administrators can delete users'
            );
        });

        it('should prevent admin from deleting their own account', async () => {
            await expect(userController.deleteUser(adminUser, adminUser.id)).rejects.toThrow(
                'You cannot delete your own account'
            );
        });

        it('should return not found for non-existent user', async () => {
            const nonExistentId = uuidv4();
            await expect(userController.deleteUser(adminUser, nonExistentId)).rejects.toThrow('User not found');
        });
    });

    describe('getProfile', () => {
        it('should return the current user profile', () => {
            const result = userController.getProfile(testUser);

            expect(result).toBe(testUser);
        });
    });
});
