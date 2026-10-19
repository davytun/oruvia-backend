import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { SeekerUser } from '../entities/seeker-user.entity.js';

export const CurrentSeeker = createParamDecorator(
  (data: keyof SeekerUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as SeekerUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
