import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AdminUser } from '../entities/admin-user.entity.js';

export const CurrentAdmin = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AdminUser;
  },
);
