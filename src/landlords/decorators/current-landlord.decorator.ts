import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { LandlordUser } from '../entities/landlord-user.entity.js';

export const CurrentLandlord = createParamDecorator(
  (data: keyof LandlordUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as LandlordUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
