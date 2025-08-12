import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export enum AuditAction {
    LOGIN = 'login',
    LOGOUT = 'logout',
    REGISTER = 'register',
    PASSWORD_CHANGE = 'password_change',
    EMAIL_VERIFY = 'email_verify',
    PASSWORD_RESET = 'password_reset',
    ACCOUNT_LOCK = 'account_lock',
    ACCOUNT_UNLOCK = 'account_unlock',
}

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    userId?: string;

    @Column({ type: 'enum', enum: AuditAction })
    action: AuditAction;

    @Column({ nullable: true })
    ipAddress?: string;

    @Column({ nullable: true })
    userAgent?: string;

    @Column({ type: 'json', nullable: true })
    metadata?: any;

    @Column({ default: true })
    success: boolean;

    @Column({ nullable: true })
    errorMessage?: string;

    @CreateDateColumn()
    createdAt: Date;
}
