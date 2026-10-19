import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterAgentDto {
  @ApiProperty({
    description: 'Full legal or professional name',
    example: 'Sarah Agent',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  fullName!: string;

  @ApiProperty({
    description: 'Agent email address (automatically normalized to lowercase)',
    example: 'agent@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'Account password (minimum 8 characters, maximum 128)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
