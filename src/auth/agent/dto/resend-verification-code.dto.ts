import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, MaxLength } from 'class-validator';

export class ResendAgentVerificationCodeDto {
  @ApiProperty({
    description: 'Registered agent email address',
    example: 'agent@example.com',
    maxLength: 255,
  })
  @IsEmail()
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;
}
