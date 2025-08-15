import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuccessResponseDto {
    @ApiProperty({ description: 'Indicates if the operation was successful' })
    success: boolean;

    @ApiPropertyOptional({ description: 'Additional message or information', required: false })
    message?: string;
}
