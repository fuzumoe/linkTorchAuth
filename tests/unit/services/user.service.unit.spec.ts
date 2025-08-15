import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserService } from '../../../src/services/user.service';
import { PasswordService } from '../../../src/services/password.service';
import { User } from '../../../src/entities/user.entity';
import { SearchUserDto } from '@auth/dtos/user.dto';

describe('UserService', () => {
    let userService: UserService;

    let mockQueryBuilder;

    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    const mockPasswordService = {
        hashPassword: jest.fn(),
        comparePasswords: jest.fn(),
        isPasswordHashed: jest.fn(),
    };

    beforeEach(async () => {
        // Create a fresh mock query builder for each test
        mockQueryBuilder = {
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn(),
        };

        mockUserRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: PasswordService,
                    useValue: mockPasswordService,
                },
            ],
        }).compile();

        userService = module.get<UserService>(UserService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(userService).toBeDefined();
    });

    describe('findByEmail', () => {
        it('should return a user if found', async () => {
            const mockUser = { id: '1', email: 'test@example.com' };
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await userService.findByEmail('test@example.com');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await userService.findByEmail('nonexistent@example.com');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email: 'nonexistent@example.com' },
            });
            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return a user if found', async () => {
            const mockUser = { id: '1', email: 'test@example.com' };
            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await userService.findById('1');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: '1' },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null if user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await userService.findById('999');

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: '999' },
            });
            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should hash password and create a new user', async () => {
            const userData = {
                email: 'new@example.com',
                password: 'plainPassword',
                firstName: 'New',
                lastName: 'User',
            };
            const hashedPassword = 'hashedPassword';
            const mockCreatedUser = {
                id: '2',
                ...userData,
                password: hashedPassword,
            };

            mockPasswordService.hashPassword.mockResolvedValue(hashedPassword);
            mockUserRepository.create.mockReturnValue(mockCreatedUser);
            mockUserRepository.save.mockResolvedValue(mockCreatedUser);

            const result = await userService.create(userData);

            expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('plainPassword');
            expect(mockUserRepository.create).toHaveBeenCalledWith({
                ...userData,
                password: hashedPassword,
            });
            expect(mockUserRepository.save).toHaveBeenCalledWith(mockCreatedUser);
            expect(result).toEqual(mockCreatedUser);
        });

        it('should create user without hashing when no password provided', async () => {
            const userData = {
                email: 'no-password@example.com',
                firstName: 'No',
                lastName: 'Password',
            };
            const mockCreatedUser = {
                id: '3',
                ...userData,
            };

            mockUserRepository.create.mockReturnValue(mockCreatedUser);
            mockUserRepository.save.mockResolvedValue(mockCreatedUser);

            const result = await userService.create(userData);

            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
            expect(mockUserRepository.save).toHaveBeenCalledWith(mockCreatedUser);
            expect(result).toEqual(mockCreatedUser);
        });
    });

    describe('update', () => {
        it('should hash password and update user if password is not hashed', async () => {
            const userId = '1';
            const updateData = { password: 'newPassword', firstName: 'Updated' };
            const hashedPassword = 'newHashedPassword';
            const mockUpdatedUser = {
                id: userId,
                email: 'test@example.com',
                firstName: 'Updated',
                password: hashedPassword,
            };

            mockPasswordService.isPasswordHashed.mockReturnValue(false);
            mockPasswordService.hashPassword.mockResolvedValue(hashedPassword);
            mockUserRepository.update.mockResolvedValue({ affected: 1 });
            mockUserRepository.findOne.mockResolvedValue(mockUpdatedUser);

            const result = await userService.update(userId, updateData);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith('newPassword');
            expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('newPassword');
            expect(mockUserRepository.update).toHaveBeenCalledWith(userId, {
                ...updateData,
                password: hashedPassword,
            });
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
            expect(result).toEqual(mockUpdatedUser);
        });

        it('should not hash password if it is already hashed', async () => {
            const userId = '1';
            const hashedPassword = '$2b$10$abcdefghijklmnopqrstuv';
            const updateData = { password: hashedPassword, lastName: 'Updated' };
            const mockUpdatedUser = {
                id: userId,
                email: 'test@example.com',
                lastName: 'Updated',
                password: hashedPassword,
            };

            mockPasswordService.isPasswordHashed.mockReturnValue(true);
            mockUserRepository.update.mockResolvedValue({ affected: 1 });
            mockUserRepository.findOne.mockResolvedValue(mockUpdatedUser);

            const result = await userService.update(userId, updateData);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith(hashedPassword);
            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
            expect(result).toEqual(mockUpdatedUser);
        });

        it('should update user without password manipulation if no password provided', async () => {
            const userId = '1';
            const updateData = { firstName: 'UpdatedFirstName' };
            const mockUpdatedUser = {
                id: userId,
                email: 'test@example.com',
                firstName: 'UpdatedFirstName',
            };

            mockUserRepository.update.mockResolvedValue({ affected: 1 });
            mockUserRepository.findOne.mockResolvedValue(mockUpdatedUser);

            const result = await userService.update(userId, updateData);

            expect(mockPasswordService.isPasswordHashed).not.toHaveBeenCalled();
            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
            expect(result).toEqual(mockUpdatedUser);
        });

        it('should return null if user not found after update', async () => {
            const userId = '999';
            const updateData = { firstName: 'NonExistent' };

            mockUserRepository.update.mockResolvedValue({ affected: 0 });
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await userService.update(userId, updateData);

            expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
            expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { id: userId } });
            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should return true when user is successfully deleted', async () => {
            mockUserRepository.delete.mockResolvedValue({ affected: 1 });

            const result = await userService.delete('1');

            expect(mockUserRepository.delete).toHaveBeenCalledWith('1');
            expect(result).toBe(true);
        });

        it('should return false when user is not found', async () => {
            mockUserRepository.delete.mockResolvedValue({ affected: 0 });

            const result = await userService.delete('999');

            expect(mockUserRepository.delete).toHaveBeenCalledWith('999');
            expect(result).toBe(false);
        });
    });

    describe('countUsers', () => {
        it('should return the number of users', async () => {
            mockUserRepository.count.mockResolvedValue(10);

            const result = await userService.countUsers();

            expect(mockUserRepository.count).toHaveBeenCalled();
            expect(result).toBe(10);
        });
    });

    describe('findUsers', () => {
        it('should return users with default pagination', async () => {
            const mockUsers = [
                { id: '1', email: 'user1@example.com' },
                { id: '2', email: 'user2@example.com' },
            ];
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 2]);

            const result = await userService.findUsers({
                page: 0,
                limit: 0,
            });

            expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
            // Add a type assertion to ensure the argument is treated as a number
            const skipCallArgument = (mockQueryBuilder.skip as jest.Mock).mock.calls[0][0] as number;
            expect(Math.abs(skipCallArgument)).toBe(0);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(0);
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.createdAt', 'DESC');
            expect(result).toEqual([mockUsers, 2]);
        });

        it('should apply all search filters correctly', async () => {
            const mockUsers = [{ id: '1', email: 'filtered@example.com' }];
            mockQueryBuilder.getManyAndCount.mockResolvedValue([mockUsers, 1]);

            const searchParams: SearchUserDto = {
                page: 2,
                limit: 5,
                email: 'filtered',
                firstName: 'Test',
                lastName: 'User',
                isActive: true,
                isEmailVerified: true,
                role: 'admin',
                sortBy: 'email',
                sortDirection: 'ASC',
            };

            const result = await userService.findUsers(searchParams);

            expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.email LIKE :email', { email: '%filtered%' });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.firstName LIKE :firstName', {
                firstName: '%Test%',
            });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.lastName LIKE :lastName', {
                lastName: '%User%',
            });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', { isActive: true });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.isEmailVerified = :isEmailVerified', {
                isEmailVerified: true,
            });
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('user.role = :role', { role: 'admin' });
            expect(mockQueryBuilder.skip).toHaveBeenCalledWith(5);
            expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
            expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('user.email', 'ASC');
            expect(result).toEqual([mockUsers, 1]);
        });
    });
});
