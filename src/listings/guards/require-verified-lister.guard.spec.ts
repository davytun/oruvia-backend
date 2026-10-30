import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { RequireVerifiedListerGuard } from './require-verified-lister.guard.js';

const contextFor = (user?: Partial<Request['user']>): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ user }) as Request,
    }),
  }) as unknown as ExecutionContext;

describe('RequireVerifiedListerGuard', () => {
  const guard = new RequireVerifiedListerGuard();

  it('allows an approved lister', () => {
    expect(
      guard.canActivate(contextFor({ verificationStatus: 'approved' } as any)),
    ).toBe(true);
  });

  it.each(['pending', 'rejected', 'unverified'] as const)(
    'blocks a %s lister with KYC_NOT_APPROVED and embeds the status',
    (status) => {
      const error = captureError(guard, contextFor({ verificationStatus: status } as any));

      expect(error).toBeInstanceOf(ForbiddenException);
      expect(error.getResponse()).toMatchObject({
        code: 'KYC_NOT_APPROVED',
        verificationStatus: status,
      });
    },
  );

  it('treats a missing status as unverified', () => {
    const error = captureError(guard, contextFor({} as any));
    expect(error.getResponse()).toMatchObject({
      code: 'KYC_NOT_APPROVED',
      verificationStatus: 'unverified',
    });
  });

  it('rejects a request without a user', () => {
    const error = captureError(guard, contextFor(undefined));
    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(error.getResponse()).toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

function captureError(guard: RequireVerifiedListerGuard, ctx: ExecutionContext) {
  try {
    guard.canActivate(ctx);
  } catch (error) {
    return error as { getResponse: () => Record<string, unknown> };
  }
  throw new Error('Expected canActivate to throw');
}
