import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';
import { SearchUserDto } from '@auth/dtos/user.dto';

// Define interface for user search parameters

@Injectable()
export class UserService {
    private readonly logger = new Logger(UserService.name);

    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly passwordService: PasswordService
    ) {}

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async create(userData: Partial<User>): Promise<User> {
        const data: Partial<User> = { ...userData };

        if (data.password) {
            data.password = await this.passwordService.hashPassword(data.password);
        } else {
            data.password = undefined;
        }

        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async update(id: string, userData: Partial<User>): Promise<User | null> {
        const data: Partial<User> = { ...userData };

        if (data.password && !this.passwordService.isPasswordHashed(data.password)) {
            data.password = await this.passwordService.hashPassword(data.password);
        }

        await this.userRepository.update(id, data);
        return this.findById(id);
    }

    async delete(id: string): Promise<boolean> {
        const result = await this.userRepository.delete(id);
        return result.affected !== null && result.affected !== undefined && result.affected > 0;
    }

    async countUsers(): Promise<number> {
        return this.userRepository.count();
    }

    async findUsers(searchParams: SearchUserDto): Promise<[User[], number]> {
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

        return queryBuilder.getManyAndCount();
    }
}
