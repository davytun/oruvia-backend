import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginSeekerDto {
  @ApiProperty({
    description: 'Registered seeker email address',
    example: 'seeker@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'Account password',
    example: 'SecurePassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
