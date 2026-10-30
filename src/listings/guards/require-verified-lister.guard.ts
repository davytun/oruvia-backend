import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { ListerVerificationStatus } from '../../auth/kyc/kyc.constants.js';

interface ListerRequestUser {
  verificationStatus?: ListerVerificationStatus;
}

@Injectable()
export class RequireVerifiedListerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as ListerRequestUser | undefined;

    if (!user) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized access',
      });
    }

    if (user.verificationStatus !== 'approved') {
      throw new ForbiddenException({
        code: 'KYC_NOT_APPROVED',
        message: 'A verified identity is required to publish a listing',
        verificationStatus: user.verificationStatus ?? 'unverified',
      });
    }

    return true;
  }
}
