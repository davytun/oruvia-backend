import { BadRequestException } from '@nestjs/common';
import { IsEmail, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { createValidationPipe } from './validation.pipe.js';

class AddressDto {
  @IsString()
  city!: string;
}

class SampleDto {
  @IsEmail()
  email!: string;

  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;
}

const metadata = { type: 'body' as const, metatype: SampleDto };

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();

  it('transforms valid input into a DTO instance', async () => {
    const result = await pipe.transform(
      { email: 'a@b.co', address: { city: 'Lagos' } },
      metadata,
    );

    expect(result).toBeInstanceOf(SampleDto);
  });

  it('rejects with VALIDATION_FAILED and per-field details, including nested fields', async () => {
    const error = await pipe
      .transform({ email: 'nope', address: { city: 1 } }, metadata)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getResponse()).toMatchObject({
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: [
        { field: 'email', messages: ['email must be an email'] },
        { field: 'address.city', messages: ['city must be a string'] },
      ],
    });
  });

  it('rejects unexpected properties', async () => {
    const error = await pipe
      .transform(
        { email: 'a@b.co', address: { city: 'Lagos' }, isAdmin: true },
        metadata,
      )
      .catch((e: unknown) => e);

    expect((error as BadRequestException).getResponse()).toMatchObject({
      details: [{ field: 'isAdmin', messages: ['property isAdmin should not exist'] }],
    });
  });

  it('never echoes submitted values in the details', async () => {
    const error = await pipe
      .transform({ email: 'super-secret-value', address: { city: 'x' } }, metadata)
      .catch((e: unknown) => e);

    expect(JSON.stringify((error as BadRequestException).getResponse())).not.toContain(
      'super-secret-value',
    );
  });
});
