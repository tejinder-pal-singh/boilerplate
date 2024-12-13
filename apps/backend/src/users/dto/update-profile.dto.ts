import { 
  IsString, 
  IsOptional, 
  IsUrl, 
  MaxLength, 
  Matches,
  IsPhoneNumber
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsSecureUrl } from '../../shared/validators/custom.validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MaxLength(50, { message: 'First name cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z\s\-']+$/, { 
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes' 
  })
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MaxLength(50, { message: 'Last name cannot be longer than 50 characters' })
  @Matches(/^[a-zA-Z\s\-']+$/, { 
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes' 
  })
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiPropertyOptional({
    description: 'User phone number in E.164 format',
    example: '+1234567890'
  })
  @IsOptional()
  @IsPhoneNumber(null, { message: 'Please provide a valid phone number' })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'User avatar URL',
    example: 'https://example.com/avatar.jpg'
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid URL' })
  @IsSecureUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'Software engineer passionate about building great products',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Bio must be a string' })
  @MaxLength(500, { message: 'Bio cannot be longer than 500 characters' })
  @Transform(({ value }) => value?.trim())
  bio?: string;
}
