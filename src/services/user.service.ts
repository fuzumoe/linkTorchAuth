import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';

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
        // Avoid mutating caller's object
        const data: Partial<User> = { ...userData };

        if (data.password) {
            data.password = await this.passwordService.hashPassword(data.password);
        } else {
            // Keep undefined when not provided so the optional column remains unset
            data.password = undefined;
        }

        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async update(id: string, userData: Partial<User>): Promise<User | null> {
        // Avoid mutating caller's object
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

    async findUsers(searchParams: any): Promise<[User[], number]> {
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
        } = searchParams;

        const skip = (page - 1) * limit;

        const queryBuilder = this.userRepository.createQueryBuilder('user');

        if (email) {
            queryBuilder.andWhere('user.email LIKE :email', { email: `%${email}%` });
        }

        if (firstName) {
            queryBuilder.andWhere('user.firstName LIKE :firstName', { firstName: `%${firstName}%` });
        }

        if (lastName) {
            queryBuilder.andWhere('user.lastName LIKE :lastName', { lastName: `%${lastName}%` });
        }

        if (isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', { isActive });
        }

        if (isEmailVerified !== undefined) {
            queryBuilder.andWhere('user.isEmailVerified = :isEmailVerified', { isEmailVerified });
        }

        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }

        queryBuilder.orderBy(`user.${sortBy}`, sortDirection);

        queryBuilder.skip(skip);
        queryBuilder.take(limit);

        return queryBuilder.getManyAndCount();
    }
}
