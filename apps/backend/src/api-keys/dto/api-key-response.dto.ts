import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class ApiKeyResponseDto {
  @Expose()
  @ApiProperty({
    description: 'The unique identifier of the API key',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @Expose()
  @ApiProperty({
    description: 'The name of the API key',
    example: 'Development API Key'
  })
  name: string;

  @Expose()
  @ApiProperty({
    description: 'The scopes assigned to the API key',
    example: ['read:users', 'write:posts']
  })
  scopes: string[];

  @Expose()
  @ApiProperty({
    description: 'The expiration date of the API key',
    example: '2024-12-13T00:00:00Z'
  })
  expiresAt: Date;

  @Expose()
  @ApiProperty({
    description: 'Whether the API key has been revoked',
    example: false
  })
  revoked: boolean;

  @Expose()
  @ApiProperty({
    description: 'When the API key was created',
    example: '2023-12-13T00:00:00Z'
  })
  createdAt: Date;

  constructor(partial: Partial<ApiKeyResponseDto>) {
    Object.assign(this, partial);
  }
}
