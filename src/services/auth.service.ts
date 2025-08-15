import { BadRequestException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService, ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import appConfig from '../config/app.config';
import { SuccessResponseDto } from '../dtos/process.dto';
import { UserResponseDto } from '../dtos/user.dto';
import { EmailVerification } from '../entities/email-verification.entity';
import { PasswordReset } from '../entities/password-reset.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { User } from '../entities/user.entity';
import { PasswordService } from './password.service';
import { UserService } from './user.service';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly userService: UserService,
        private readonly passwordService: PasswordService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(appConfig.KEY) private readonly appCfg: ConfigType<typeof appConfig>,
        @InjectRepository(RefreshToken)
        private readonly refreshTokenRepository: Repository<RefreshToken>,
        @InjectRepository(PasswordReset)
        private readonly passwordResetRepository: Repository<PasswordReset>,
        @InjectRepository(EmailVerification)
        private readonly emailVerificationRepository: Repository<EmailVerification>
    ) {}

    async validateCredentials(email: string, password: string): Promise<User | null> {
        this.logger.log(`Validating credentials for user: ${email}`);

        const user = await this.userService.findByEmail(email);
        if (!user) {
            this.logger.log(`Authentication failed: user not found - ${email}`);
            return null;
        }

        const isPasswordValid = await this.passwordService.comparePasswords(password, user.password);

        if (isPasswordValid) {
            this.logger.log(`User authenticated successfully: ${email}`);
        } else {
            this.logger.log(`Authentication failed: invalid password - ${email}`);
        }

        return isPasswordValid ? user : null;
    }

    async login(user: User, ipAddress: string, deviceInfo: string, response: Response) {
        this.logger.log(`User login: ${user.email} from IP ${ipAddress} using ${deviceInfo}`);

        this.logger.log(`Updating last login time for user: ${user.id}`);
        await this.userService.update(user.id, {
            lastLoginAt: new Date(),
        });

        const payload = { sub: user.id };
        const jwtExpiresIn: string = this.configService.get('jwt.expiresIn') || '1h';
        this.logger.log(`Generating JWT token with expiration: ${jwtExpiresIn}`);

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: jwtExpiresIn,
        });

        if (response) {
            this.logger.log('Setting Authorization header and access_token cookie');
            response.setHeader('Authorization', `Bearer ${accessToken}`);

            const jwtExpiresIn: number = this.appCfg.jwtExpiresIn;

            this.logger.log(`Setting access_token cookie with expiration: ${jwtExpiresIn}ms`);
            response.cookie('access_token', accessToken, this.appCfg.cookies);
        } else {
            this.logger.log('No response object provided, skipping header and cookie setup');
        }

        return {
            accessToken,
            user: this.sanitizeUser(user),
        };
    }

    async createRefreshToken(
        userId: string,
        deviceInfo?: string,
        ipAddress?: string,
        response?: Response
    ): Promise<string> {
        this.logger.log(`Creating refresh token for user: ${userId}`);

        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        this.logger.log(`Refresh token will expire on: ${expiresAt.toISOString()}`);

        const refreshToken = this.refreshTokenRepository.create({
            userId,
            token,
            expiresAt,
            deviceInfo,
            ipAddress,
        });

        try {
            await this.refreshTokenRepository.save(refreshToken);
            this.logger.log(`Refresh token saved successfully for user: ${userId}`);
        } catch (error) {
            this.logger.error(
                `Failed to save refresh token for user: ${userId}`,
                error instanceof Error ? error.stack : String(error)
            );
            throw error;
        }

        if (response) {
            response.cookie('refresh_token', token, this.appCfg.cookies);
        }

        return token;
    }

    async validateRefreshToken(token: string): Promise<User | null> {
        const refreshToken = await this.refreshTokenRepository.findOne({
            where: {
                token,
                isRevoked: false,
            },
            relations: ['user'],
        });

        if (!refreshToken) return null;

        if (new Date() > refreshToken.expiresAt) {
            await this.refreshTokenRepository.update(refreshToken.id, { isRevoked: true });
            return null;
        }

        return refreshToken.user;
    }

    async revokeRefreshToken(token: string): Promise<SuccessResponseDto> {
        const result = await this.refreshTokenRepository.update({ token }, { isRevoked: true });

        return {
            success: result.affected !== null && result.affected !== undefined && result.affected > 0,
        };
    }

    async revokeAllUserRefreshTokens(userId: string): Promise<void> {
        await this.refreshTokenRepository.update({ userId }, { isRevoked: true });
    }

    async logout(
        userId: string,
        refreshToken?: string,
        response?: Response,
        revokeAll: boolean = false
    ): Promise<SuccessResponseDto> {
        this.logger.log(`Logging out user: ${userId}, revokeAll: ${revokeAll}`);

        try {
            if (refreshToken) {
                await this.revokeRefreshToken(refreshToken);
                this.logger.log(`Revoked refresh token for user: ${userId}`);
            }

            if (revokeAll) {
                await this.revokeAllUserRefreshTokens(userId);
                this.logger.log(`Revoked all refresh tokens for user: ${userId}`);
            }

            if (response) {
                response.clearCookie('access_token', this.appCfg.cookies);
                response.clearCookie('refresh_token', this.appCfg.cookies);
                response.clearCookie('authenticated', this.appCfg.cookies);

                this.logger.log('Cleared authentication cookies');
            }

            return { success: true };
        } catch (error) {
            this.logger.error(`Failed to logout user: ${userId}`, error instanceof Error ? error.stack : String(error));
            return { success: false };
        }
    }

    async createPasswordResetToken(email: string): Promise<string> {
        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new BadRequestException('User with this email does not exist');
        }

        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const passwordReset = this.passwordResetRepository.create({
            email,
            token,
            expiresAt,
        });

        await this.passwordResetRepository.save(passwordReset);
        return token;
    }

    async validatePasswordResetToken(token: string): Promise<string | null> {
        const passwordReset = await this.passwordResetRepository.findOne({
            where: {
                token,
                isUsed: false,
            },
        });

        if (!passwordReset) return null;

        if (new Date() > passwordReset.expiresAt) {
            return null;
        }

        return passwordReset.email;
    }

    async resetPassword(token: string, newPassword: string): Promise<SuccessResponseDto> {
        const email = await this.validatePasswordResetToken(token);
        if (!email) {
            throw new UnauthorizedException('Invalid or expired password reset token');
        }

        const user = await this.userService.findByEmail(email);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        await this.userService.update(user.id, { password: newPassword });

        await this.passwordResetRepository.update({ token }, { isUsed: true });

        await this.revokeAllUserRefreshTokens(user.id);

        return { success: true, message: 'Password reset successfully' };
    }

    async createEmailVerificationToken(email: string): Promise<string> {
        const token = uuidv4();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 48);

        const emailVerification = this.emailVerificationRepository.create({
            email,
            token,
            expiresAt,
        });

        await this.emailVerificationRepository.save(emailVerification);
        return token;
    }

    async verifyEmail(token: string): Promise<SuccessResponseDto> {
        const verification = await this.emailVerificationRepository.findOne({
            where: {
                token,
                isUsed: false,
            },
        });

        if (!verification) {
            throw new UnauthorizedException('Invalid or expired verification token');
        }

        if (new Date() > verification.expiresAt) {
            throw new UnauthorizedException('Expired verification token');
        }

        const user = await this.userService.findByEmail(verification.email);
        if (!user) {
            throw new BadRequestException('User not found');
        }

        await this.userService.update(user.id, { isEmailVerified: true });

        await this.emailVerificationRepository.update({ token }, { isUsed: true });

        return { success: true, message: 'Email verified successfully' };
    }

    private sanitizeUser(user: User): Partial<UserResponseDto> {
        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        return userResponse;
    }
}
