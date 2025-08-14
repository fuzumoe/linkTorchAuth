import { DataSource, EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from 'typeorm';
import { User } from '../entities/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { PasswordService } from '../services/password.service';

@Injectable()
@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
    private readonly logger = new Logger(UserSubscriber.name);

    constructor(
        dataSource: DataSource,
        private passwordService: PasswordService
    ) {
        dataSource.subscribers.push(this);
    }

    listenTo() {
        return User;
    }

    async beforeInsert(event: InsertEvent<User>): Promise<void> {
        await this.hashPassword(event.entity);

        if (!event.entity.isActive) {
            event.entity.isActive = true;
        }

        this.logger.log(`Processing new user creation: ${event.entity.email}`);
    }

    async beforeUpdate(event: UpdateEvent<User>): Promise<void> {
        if (event.entity && event.entity.password && event.entity instanceof User) {
            await this.hashPassword(event.entity);
        }

        // Track the update
        // Since User.id is a string, we need to ensure it's typed correctly
        const userId: string = event.entity && typeof event.entity.id === 'string' ? event.entity.id : 'unknown';
        this.logger.log(`Updating user: ${userId}`);
    }
    private async hashPassword(user: User): Promise<void> {
        if (user && user.password && !this.passwordService.isPasswordHashed(user.password)) {
            this.logger.debug('Hashing user password');
            user.password = await this.passwordService.hashPassword(user.password);
            this.logger.debug('Password hashed successfully');
        }
    }
}
