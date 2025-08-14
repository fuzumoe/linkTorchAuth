import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
    private readonly logger = new Logger(PasswordService.name);
    private readonly saltRounds = 10;

    async hashPassword(password: string): Promise<string> {
        this.logger.debug('Hashing password');
        const salt = await bcrypt.genSalt(this.saltRounds);
        return bcrypt.hash(password, salt);
    }

    async comparePasswords(plainPassword: string, hashedPassword: string | null | undefined): Promise<boolean> {
        if (!hashedPassword) return false;
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    isPasswordHashed(password: string | null | undefined): boolean {
        return Boolean(password && /^\$2[abxy]\$/.test(password));
    }
}
