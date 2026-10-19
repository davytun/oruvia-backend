import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangeLandlordPasswordDto {
  @ApiProperty({
    description: 'Existing account password',
    example: 'OldPassword123!',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({
    description: 'New account password (minimum 8 characters, maximum 128)',
    example: 'NewSecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
