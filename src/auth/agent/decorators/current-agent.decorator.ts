import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AgentUser } from '../entities/agent-user.entity.js';

export const CurrentAgent = createParamDecorator(
  (data: keyof AgentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const user = request.user as AgentUser | undefined;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
