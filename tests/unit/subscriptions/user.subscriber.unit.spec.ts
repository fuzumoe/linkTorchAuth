import { Test, TestingModule } from '@nestjs/testing';
import { UserSubscriber } from '../../../src/subscribers/user.subscriber';
import { DataSource, EntityMetadata, InsertEvent, QueryRunner, UpdateEvent } from 'typeorm';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';
import { User } from '../../../src/entities/user.entity';
import { Logger } from '@nestjs/common';
import { PasswordService } from '../../../src/services/password.service';
import { EntityManager } from 'typeorm';
import { ColumnMetadata } from 'typeorm/metadata/ColumnMetadata';
import { RelationMetadata } from 'typeorm/metadata/RelationMetadata';
const mockPasswordService = {
    hashPassword: jest.fn().mockResolvedValue('hashed_password'),
    isPasswordHashed: jest
        .fn()
        .mockImplementation((pwd: string | undefined): boolean => Boolean(pwd && pwd.startsWith('$2'))),
    comparePasswords: jest.fn().mockResolvedValue(true),
};

describe('UserSubscriber', () => {
    let userSubscriber: UserSubscriber;
    let mockDataSource: Partial<DataSource>;
    let loggerSpy: jest.SpyInstance;

    // Helper functions to create properly typed mock objects
    function createMockEntityManager(): EntityManager {
        return {} as EntityManager;
    }

    function createMockQueryRunner(): QueryRunner {
        return {} as QueryRunner;
    }

    function createMockEntityMetadata(): EntityMetadata {
        return {} as EntityMetadata;
    }

    function createMockInsertEvent<T>(entity: T): InsertEvent<T> {
        return {
            entity,
            connection: mockDataSource as DataSource,
            manager: createMockEntityManager(),
            queryRunner: createMockQueryRunner(),
            metadata: createMockEntityMetadata(),
        };
    }

    function createMockUpdateEvent<T>(entity: T | undefined): UpdateEvent<T> {
        return {
            entity: entity as unknown as ObjectLiteral | undefined,
            connection: mockDataSource as DataSource,
            manager: createMockEntityManager(),
            queryRunner: createMockQueryRunner(),
            metadata: createMockEntityMetadata(),
            databaseEntity: {} as T,
            updatedColumns: [] as ColumnMetadata[],
            updatedRelations: [] as RelationMetadata[],
        };
    }

    beforeEach(async () => {
        mockDataSource = {
            subscribers: [],
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserSubscriber,
                {
                    provide: DataSource,
                    useValue: mockDataSource,
                },
                {
                    provide: PasswordService,
                    useValue: mockPasswordService,
                },
            ],
        }).compile();

        userSubscriber = module.get<UserSubscriber>(UserSubscriber);

        loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(userSubscriber).toBeDefined();
    });

    it('should register itself with DataSource', () => {
        expect(mockDataSource.subscribers).toContain(userSubscriber);
    });

    it('should listen to User entity', () => {
        expect(userSubscriber.listenTo()).toBe(User);
    });

    describe('beforeInsert', () => {
        it('should hash password for new users', async () => {
            const user = new User();
            user.email = 'test@example.com';
            user.password = 'plainPassword';
            user.isActive = false;

            const mockEvent = createMockInsertEvent(user);

            await userSubscriber.beforeInsert(mockEvent);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith('plainPassword');
            expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('plainPassword');
            expect(user.password).toBe('hashed_password');
            expect(user.isActive).toBe(true);
            expect(loggerSpy).toHaveBeenCalledWith(`Processing new user creation: ${user.email}`);
        });

        it('should not hash password if already hashed', async () => {
            const user = new User();
            user.email = 'test@example.com';
            user.password = '$2b$10$hashedPasswordAlready';

            const mockEvent = createMockInsertEvent(user);

            await userSubscriber.beforeInsert(mockEvent);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith('$2b$10$hashedPasswordAlready');
            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(user.password).toBe('$2b$10$hashedPasswordAlready');
        });
    });

    describe('beforeUpdate', () => {
        it('should hash password when updating with plain password', async () => {
            const user = new User();
            user.id = 'user-123';
            user.password = 'newPlainPassword';

            const mockEvent: UpdateEvent<User> = createMockUpdateEvent(user);
            await userSubscriber.beforeUpdate(mockEvent);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith('newPlainPassword');
            expect(mockPasswordService.hashPassword).toHaveBeenCalledWith('newPlainPassword');
            expect(user.password).toBe('hashed_password');
            expect(loggerSpy).toHaveBeenCalledWith(`Updating user: user-123`);
        });

        it('should not hash password if already hashed', async () => {
            const user = new User();
            user.id = 'user-123';
            user.password = '$2b$10$hashedPasswordAlready';

            const mockEvent = createMockUpdateEvent(user);

            await userSubscriber.beforeUpdate(mockEvent);

            expect(mockPasswordService.isPasswordHashed).toHaveBeenCalledWith('$2b$10$hashedPasswordAlready');
            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(user.password).toBe('$2b$10$hashedPasswordAlready');
        });

        it('should handle update events without password changes', async () => {
            const user = new User();
            user.id = 'user-123';
            user.email = 'updated@example.com';

            const mockEvent = createMockUpdateEvent(user);

            await userSubscriber.beforeUpdate(mockEvent);

            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(loggerSpy).toHaveBeenCalledWith(`Updating user: user-123`);
        });

        it('should handle entity being null or undefined', async () => {
            // Create the event with an explicit cast to ensure type compatibility
            const mockEvent = createMockUpdateEvent<User>(undefined);

            await userSubscriber.beforeUpdate(mockEvent);

            expect(mockPasswordService.hashPassword).not.toHaveBeenCalled();
            expect(loggerSpy).toHaveBeenCalledWith('Updating user: unknown');
        });
    });
});
