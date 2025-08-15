import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { CurrentUser } from '../decorators/user.decorator';
import { PaginatedResponseDto } from '../dtos/pagination.dto';
import { SuccessResponseDto } from '../dtos/process.dto';
import { RegisterDto, SearchUserDto, UpdateUserDto, UserResponseDto } from '../dtos/user.dto';
import { User, UserRole } from '../entities/user.entity';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@ApiTags('users')
@Controller('users')
export class UserController {
    constructor(
        private userService: UserService,
        private authService: AuthService
    ) {}

    @Post()
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async register(@CurrentUser() currentUser: User, @Body() registerDto: RegisterDto): Promise<UserResponseDto> {
        const userCount = await this.userService.countUsers();

        if (userCount > 0 && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators can create new users');
        }

        const existingUser = await this.userService.findByEmail(registerDto.email);
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        if (userCount === 0) {
            registerDto.role = UserRole.ADMIN;
        } else if (!registerDto.role) {
            registerDto.role = UserRole.USER;
        }

        const user = await this.userService.create(registerDto);

        await this.authService.createEmailVerificationToken(user.email);
        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
            excludeExtraneousValues: true,
        });

        return userResponse;
    }

    @Get()
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async findAll(
        @CurrentUser() currentUser: User,
        @Query() searchParams: SearchUserDto
    ): Promise<PaginatedResponseDto<UserResponseDto>> {
        if (currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators can access the users list');
        }

        const page = searchParams.page || 1;
        const limit = searchParams.limit || 10;

        const [users, total] = await this.userService.findUsers(searchParams);

        const sanitizedUsers = users.map((user) => {
            const userResponse: UserResponseDto = plainToInstance(UserResponseDto, user, {
                excludeExtraneousValues: true,
            });
            return userResponse;
        });

        const pageCount = Math.ceil(total / limit);
        return {
            items: sanitizedUsers,
            total,
            page,
            pageCount,
            limit,
        };
    }

    @Patch(':id')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async updateUser(
        @CurrentUser() currentUser: User,
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto
    ): Promise<UserResponseDto> {
        const targetUser = await this.userService.findById(id);
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException('You can only update your own profile');
        }

        if (currentUser.id !== id && currentUser.role === UserRole.ADMIN) {
            delete updateUserDto.email;
        }

        const updatedUser = await this.userService.update(id, updateUserDto);

        if (!updatedUser) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }

        const userResponse: UserResponseDto = plainToInstance(UserResponseDto, updatedUser, {
            excludeExtraneousValues: true,
        });
        return userResponse;
    }

    @Delete(':id')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    @ApiBearerAuth()
    @ApiBasicAuth()
    async deleteUser(@CurrentUser() currentUser: User, @Param('id') id: string): Promise<SuccessResponseDto> {
        if (currentUser.role !== UserRole.ADMIN) {
            throw new ForbiddenException('Only administrators can delete users');
        }

        const targetUser = await this.userService.findById(id);
        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        if (currentUser.id === id) {
            throw new BadRequestException('You cannot delete your own account');
        }

        const success = await this.userService.delete(id);

        return { success };
    }

    @Get('me')
    @UseGuards(AuthGuard(['jwt', 'basic']))
    getProfile(@CurrentUser() user: UserResponseDto) {
        return user;
    }
}
