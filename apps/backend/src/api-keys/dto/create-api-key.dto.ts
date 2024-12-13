import { IsString, IsArray, IsOptional, IsNotEmpty, Length, ArrayMinSize, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    description: 'A descriptive name for the API key',
    example: 'Development API Key',
    minLength: 3,
    maxLength: 255
  })
  @IsString()
  @IsNotEmpty()
  @Length(3, 255)
  name: string;

  @ApiProperty({
    description: 'List of scopes/permissions for the API key',
    example: ['read:users', 'write:posts'],
    required: false
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @IsOptional()
  scopes?: string[] = ['read'];

  @ApiProperty({
    description: 'Expiration date for the API key. If not provided, defaults to 1 year from creation.',
    example: '2024-12-13T00:00:00Z',
    required: false
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
