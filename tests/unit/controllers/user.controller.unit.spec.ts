import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { UserController } from '../../../src/controllers/user.controller';
import { RegisterDto, SearchUserDto, UpdateUserDto, UserResponseDto } from '../../../src/dtos/user.dto';
import { User, UserRole } from '../../../src/entities/user.entity';
import { AuthService } from '../../../src/services/auth.service';
import { UserService } from '../../../src/services/user.service';

describe('UserController', () => {
    let controller: UserController;

    const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isEmailVerified: false,
        isActive: true,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
    };

    const mockAdminUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        isEmailVerified: true,
        isActive: true,
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
        refreshTokens: [],
    };

    const mockUserResponseDto = plainToInstance(UserResponseDto, mockUser, {
        excludeExtraneousValues: true,
    });

    const mockUserService = {
        create: jest.fn(),
        findByEmail: jest.fn(),
        findById: jest.fn(),
        findUsers: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        countUsers: jest.fn(),
    };

    const mockAuthService = {
        createEmailVerificationToken: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UserController],
            providers: [
                { provide: UserService, useValue: mockUserService },
                { provide: AuthService, useValue: mockAuthService },
            ],
        }).compile();

        controller = module.get<UserController>(UserController);

        // Reset mock calls
        jest.clearAllMocks();
    });

    describe('register', () => {
        const registerDto: RegisterDto = {
            email: 'new@example.com',
            password: 'Password123!',
            firstName: 'New',
            lastName: 'User',
        };

        it('should create a user with USER role when users already exist', async () => {
            mockUserService.countUsers.mockResolvedValue(1);
            mockUserService.findByEmail.mockResolvedValue(null);
            mockUserService.create.mockResolvedValue({ ...mockUser, email: registerDto.email });

            await controller.register(mockAdminUser, registerDto);

            expect(mockUserService.create).toHaveBeenCalledWith({
                ...registerDto,
                role: UserRole.USER,
            });
            expect(mockAuthService.createEmailVerificationToken).toHaveBeenCalledWith(registerDto.email);
        });

        it('should create a user with ADMIN role when no users exist', async () => {
            mockUserService.countUsers.mockResolvedValue(0);
            mockUserService.findByEmail.mockResolvedValue(null);
            mockUserService.create.mockResolvedValue({ ...mockUser, email: registerDto.email, role: UserRole.ADMIN });

            await controller.register(mockUser, registerDto);

            expect(mockUserService.create).toHaveBeenCalledWith({
                ...registerDto,
                role: UserRole.ADMIN,
            });
        });

        it('should throw BadRequestException when user already exists', async () => {
            mockUserService.countUsers.mockResolvedValue(1);
            mockUserService.findByEmail.mockResolvedValue(mockUser);

            await expect(controller.register(mockAdminUser, registerDto)).rejects.toThrow(BadRequestException);
        });

        it('should throw ForbiddenException when non-admin tries to create user', async () => {
            mockUserService.countUsers.mockResolvedValue(5);

            await expect(controller.register(mockUser, registerDto)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('findAll', () => {
        it('should return paginated users list for admin', async () => {
            const mockUsers = [mockUser, { ...mockUser, id: '123e4567-e89b-12d3-a456-426614174002' }];
            const searchParams: SearchUserDto = { page: 1, limit: 10 };

            mockUserService.findUsers.mockResolvedValue([mockUsers, 2]);

            const result = await controller.findAll(mockAdminUser, searchParams);

            // Check the structure of the result
            expect(result).toHaveProperty('items');
            expect(Array.isArray(result.items)).toBe(true);
            expect(result.total).toBe(2);
            expect(result.page).toBe(1);
            expect(result.pageCount).toBe(1);
            expect(result.limit).toBe(10);
            expect(mockUserService.findUsers).toHaveBeenCalledWith(searchParams);
        });

        it('should throw ForbiddenException when non-admin tries to list users', async () => {
            const searchParams: SearchUserDto = { page: 1, limit: 10 };

            await expect(controller.findAll(mockUser, searchParams)).rejects.toThrow(ForbiddenException);
        });
    });

    describe('updateUser', () => {
        const updateDto: UpdateUserDto = {
            firstName: 'Updated',
            lastName: 'Name',
        };

        it('should allow users to update their own profile', async () => {
            mockUserService.findById.mockResolvedValue(mockUser);
            mockUserService.update.mockResolvedValue({ ...mockUser, ...updateDto });

            await controller.updateUser(mockUser, mockUser.id, updateDto);

            expect(mockUserService.update).toHaveBeenCalledWith(mockUser.id, updateDto);
        });

        it('should allow admin to update other users', async () => {
            mockUserService.findById.mockResolvedValue(mockUser);
            mockUserService.update.mockResolvedValue({ ...mockUser, ...updateDto });

            await controller.updateUser(mockAdminUser, mockUser.id, updateDto);

            expect(mockUserService.update).toHaveBeenCalledWith(
                mockUser.id,
                expect.objectContaining({
                    firstName: 'Updated',
                    lastName: 'Name',
                })
            );
        });

        it('should throw NotFoundException when user does not exist', async () => {
            mockUserService.findById.mockResolvedValue(null);

            await expect(controller.updateUser(mockUser, 'non-existent-id', updateDto)).rejects.toThrow(
                NotFoundException
            );
        });

        it('should throw ForbiddenException when non-admin tries to update another user', async () => {
            mockUserService.findById.mockResolvedValue(mockAdminUser);

            await expect(controller.updateUser(mockUser, mockAdminUser.id, updateDto)).rejects.toThrow(
                ForbiddenException
            );
        });

        it('should throw NotFoundException when update returns null', async () => {
            mockUserService.findById.mockResolvedValue(mockUser);
            mockUserService.update.mockResolvedValue(null);

            await expect(controller.updateUser(mockUser, mockUser.id, updateDto)).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteUser', () => {
        it('should allow admin to delete other users', async () => {
            mockUserService.findById.mockResolvedValue(mockUser);
            mockUserService.delete.mockResolvedValue(true);

            const result = await controller.deleteUser(mockAdminUser, mockUser.id);

            expect(result).toEqual({ success: true });
            expect(mockUserService.delete).toHaveBeenCalledWith(mockUser.id);
        });

        it('should throw ForbiddenException when non-admin tries to delete a user', async () => {
            await expect(controller.deleteUser(mockUser, mockAdminUser.id)).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException when user does not exist', async () => {
            mockUserService.findById.mockResolvedValue(null);

            await expect(controller.deleteUser(mockAdminUser, 'non-existent-id')).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when admin tries to delete own account', async () => {
            mockUserService.findById.mockResolvedValue(mockAdminUser);

            await expect(controller.deleteUser(mockAdminUser, mockAdminUser.id)).rejects.toThrow(BadRequestException);
        });
    });

    describe('getProfile', () => {
        it('should return the current user profile', () => {
            const result = controller.getProfile(mockUserResponseDto);

            expect(result).toBe(mockUserResponseDto);
        });
    });
});
