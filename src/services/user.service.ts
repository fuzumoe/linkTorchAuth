import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';
import { SearchUserDto } from '@auth/dtos/user.dto';

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly passwordService: PasswordService
    ) {}

    async findByEmail(email: string): Promise<User | null> {
        this.logger.log(`Finding user by email: ${email}`);
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            this.logger.log(`No user found with email: ${email}`);
        } else {
            this.logger.log(`User found with email: ${email}`);
        }
        return user;
    }

    async findById(id: string): Promise<User | null> {
        this.logger.log(`Finding user by ID: ${id}`);
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) {
            this.logger.log(`No user found with ID: ${id}`);
        } else {
            this.logger.log(`User found with ID: ${id}`);
        }
        return user;
    }

    async create(userData: Partial<User>): Promise<User> {
        this.logger.log(`Creating new user with email: ${userData.email}`);
        const data: Partial<User> = { ...userData };

        if (data.password) {
            this.logger.log('Hashing password for new user');
            data.password = await this.passwordService.hashPassword(data.password);
        } else {
            this.logger.log('No password provided for new user');
            data.password = undefined;
        }

        const user = this.userRepository.create(data);
        const savedUser = await this.userRepository.save(user);
        this.logger.log(`User created successfully with ID: ${savedUser.id}`);
        return savedUser;
    }

    async update(id: string, userData: Partial<User>): Promise<User | null> {
        this.logger.log(`Updating user with ID: ${id}`);
        this.logger.log(
            `Update data: ${JSON.stringify(userData, (key: string, value: string) => (key === 'password' ? '[REDACTED]' : value))}`
        );

        const data: Partial<User> = { ...userData };

        if (data.password && !this.passwordService.isPasswordHashed(data.password)) {
            this.logger.log('Hashing password for user update');
            data.password = await this.passwordService.hashPassword(data.password);
        }

        const result = await this.userRepository.update(id, data);
        if (result.affected === 0) {
            this.logger.warn(`Update failed: User with ID ${id} not found`);
        } else {
            this.logger.log(`User updated successfully: ${id}`);
        }

        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        this.logger.log(`Deleting user with ID: ${id}`);
        const result = await this.userRepository.delete(id);
        const success = result.affected !== null && result.affected !== undefined && result.affected > 0;

        if (success) {
            this.logger.log(`User deleted successfully: ${id}`);
        } else {
            this.logger.warn(`Delete failed: User with ID ${id} not found`);
        }

        return success;
    }

    async countUsers(): Promise<number> {
        this.logger.log('Counting all users');
        const count = await this.userRepository.count();
        this.logger.log(`Total user count: ${count}`);
        return count;
    }

    async findUsers(searchParams: SearchUserDto): Promise<[User[], number]> {
        this.logger.log('Searching users with criteria');
        this.logger.log(`Search params: ${JSON.stringify(searchParams)}`);

        const {
            page = 1,
            limit = 100,
            email,
            firstName,
            lastName,
            isActive,
            isEmailVerified,
            role,
            sortBy = 'createdAt',
            sortDirection = 'DESC',
        }: SearchUserDto = searchParams;

        const pageNum: number = typeof page === 'number' ? page : 1;
        const limitNum: number = typeof limit === 'number' ? limit : 100;
        const skip: number = (pageNum - 1) * limitNum;

        const queryBuilder = this.userRepository.createQueryBuilder('user');

        if (typeof email === 'string') {
            const emailPattern: string = `%${email}%`;
            queryBuilder.andWhere('user.email LIKE :email', { email: emailPattern });
        }

        if (typeof firstName === 'string') {
            const firstNamePattern: string = `%${firstName}%`;
            queryBuilder.andWhere('user.firstName LIKE :firstName', { firstName: firstNamePattern });
        }

        if (typeof lastName === 'string') {
            const lastNamePattern: string = `%${lastName}%`;
            queryBuilder.andWhere('user.lastName LIKE :lastName', { lastName: lastNamePattern });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', { isActive });
        }

        if (isEmailVerified !== undefined) {
            queryBuilder.andWhere('user.isEmailVerified = :isEmailVerified', { isEmailVerified });
        }

        if (typeof role === 'string') {
            queryBuilder.andWhere('user.role = :role', { role });
        }
        const validSortBy: string = sortBy && typeof sortBy === 'string' ? sortBy : 'createdAt';
        const validSortDirection: 'ASC' | 'DESC' = sortDirection === 'ASC' ? 'ASC' : 'DESC';

        queryBuilder.orderBy(`user.${validSortBy}`, validSortDirection);

        const validSkip = typeof skip === 'number' ? skip : 0;
        const validLimit = typeof limit === 'number' ? limit : 10;

        queryBuilder.skip(validSkip);
        queryBuilder.take(validLimit);

        this.logger.log(
            `Executing query with skip: ${validSkip}, limit: ${validLimit}, sortBy: ${validSortBy}, sortDirection: ${validSortDirection}`
        );
        const [users, count] = await queryBuilder.getManyAndCount();
        this.logger.log(`Found ${count} users, returning ${users.length} for page ${pageNum}`);

        return [users, count];
    }
}
