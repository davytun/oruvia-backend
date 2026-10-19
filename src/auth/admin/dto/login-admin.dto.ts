import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@oruvia.com',
  })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'Admin account password',
    example: 'SecureAdminPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
