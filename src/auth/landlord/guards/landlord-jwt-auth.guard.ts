import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LandlordJwtAuthGuard extends AuthGuard('landlord-jwt') {
  override handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: any,
    status?: any,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: info?.message ?? 'Unauthorized access',
        })
      );
    }
    return user;
  }
}
