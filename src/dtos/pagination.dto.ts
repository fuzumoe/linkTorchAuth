import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
    @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
    page: number = 1;

    @ApiPropertyOptional({ description: 'Number of items per page', default: 10, minimum: 1, maximum: 100 })
    limit: number = 10;
}

export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items for the current page', isArray: true })
    items: T[];

    @ApiProperty({ description: 'Total number of items' })
    total: number;

    @ApiProperty({ description: 'Current page number' })
    page: number;

    @ApiProperty({ description: 'Total number of pages' })
    pageCount: number;

    @ApiProperty({ description: 'Number of items per page' })
    limit: number;
}
