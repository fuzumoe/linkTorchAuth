import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    token: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, (user) => user.refreshTokens, {
        onDelete: 'CASCADE',
    })
    user: User;

    @Column({ type: 'timestamp' })
    expiresAt: Date;

    @Column({ default: false })
    isRevoked: boolean;

    @Column({ nullable: true })
    deviceInfo?: string;

    @Column({ nullable: true })
    ipAddress?: string;

    @CreateDateColumn()
    createdAt: Date;
}
