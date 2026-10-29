import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { ApiErrorDetail } from '../interfaces/api-response.interface.js';

export const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED';

export function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ApiErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const own = error.constraints
      ? [{ field, messages: Object.values(error.constraints) }]
      : [];
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        code: VALIDATION_FAILED_CODE,
        message: 'Validation failed',
        details: flattenValidationErrors(errors),
      }),
  });
}
