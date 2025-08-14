import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PasswordService {
    private readonly logger = new Logger(PasswordService.name);
    private readonly saltRounds = 10;

    async hashPassword(password: string): Promise<string> {
        this.logger.log('Hashing password');
        const salt = await bcrypt.genSalt(this.saltRounds);
        const hashedPassword = await bcrypt.hash(password, salt);
        this.logger.log('Password hashed successfully');
        return hashedPassword;
    }

    async comparePasswords(plainPassword: string, hashedPassword: string | null | undefined): Promise<boolean> {
        this.logger.log('Comparing passwords');
        if (!hashedPassword) {
            this.logger.log('Cannot compare: No hashed password provided');
            return false;
        }
        const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
        this.logger.log(`Password comparison result: ${isMatch ? 'matched' : 'does not match'}`);
        return isMatch;
    }

    isPasswordHashed(password: string | null | undefined): boolean {
        return Boolean(password && /^\$2[abxy]\$/.test(password));
    }
}
