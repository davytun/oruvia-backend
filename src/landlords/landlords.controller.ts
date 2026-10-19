import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentLandlord } from './decorators/current-landlord.decorator.js';
import { ChangeLandlordPasswordDto } from './dto/change-password.dto.js';
import { ForgotLandlordPasswordDto } from './dto/forgot-password.dto.js';
import { LoginLandlordDto } from './dto/login-landlord.dto.js';
import { RegisterLandlordDto } from './dto/register-landlord.dto.js';
import { ResendLandlordVerificationCodeDto } from './dto/resend-verification-code.dto.js';
import { ResetLandlordPasswordDto } from './dto/reset-password.dto.js';
import { VerifyLandlordEmailDto } from './dto/verify-email.dto.js';
import { LandlordUser } from './entities/landlord-user.entity.js';
import { LandlordJwtAuthGuard } from './guards/landlord-jwt-auth.guard.js';
import type { LandlordProfile } from './interfaces/landlord-profile.interface.js';
import { LandlordsService } from './landlords.service.js';

@ApiTags('Landlords Authentication')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@Controller('landlords')
export class LandlordsController {
  constructor(private readonly landlordsService: LandlordsService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new landlord account',
    description:
      'Creates an unverified landlord account, generates a salted HMAC-SHA256 verification code, and dispatches a welcome verification email.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Landlord account registered successfully; verification email dispatched.',
  })
  @ApiConflictResponse({
    description:
      'An account with this email address already exists (EMAIL_ALREADY_REGISTERED).',
  })
  async register(@Body() dto: RegisterLandlordDto): Promise<LandlordProfile> {
    return this.landlordsService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify landlord email address',
    description:
      'Validates the 6-digit email verification code. On success, marks the landlord account as verified.',
  })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid code, expired code, or maximum attempt limit exceeded.',
  })
  async verifyEmail(
    @Body() dto: VerifyLandlordEmailDto,
  ): Promise<{ message: string; landlord: LandlordProfile }> {
    return this.landlordsService.verifyEmail(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-verification-code')
  @ApiOperation({
    summary: 'Resend email verification code',
    description:
      'Generates and dispatches a new verification code if an unverified account exists. Always returns a generic success message to prevent email enumeration.',
  })
  @ApiOkResponse({
    description:
      'Generic confirmation message returned without disclosing account existence.',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Cooldown active (must wait 60 seconds before requesting another code).',
  })
  async resendVerificationCode(
    @Body() dto: ResendLandlordVerificationCodeDto,
  ): Promise<{ message: string }> {
    return this.landlordsService.resendVerificationCode(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Landlord login',
    description:
      'Authenticates landlord credentials and returns a signed stateless JWT access token containing the landlord ID, email, and current tokenVersion.',
  })
  @ApiOkResponse({
    description:
      'Login successful, returns JWT access token and landlord safe profile.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiForbiddenResponse({
    description:
      'Account email has not been verified yet (EMAIL_NOT_VERIFIED).',
  })
  async login(
    @Body() dto: LoginLandlordDto,
  ): Promise<{ accessToken: string; landlord: LandlordProfile }> {
    return this.landlordsService.login(dto);
  }

  @UseGuards(LandlordJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password (authenticated)',
    description:
      'Updates the authenticated landlord password and increments tokenVersion to instantly revoke all active JWT tokens across all devices.',
  })
  @ApiOkResponse({
    description: 'Password changed successfully; old sessions invalidated.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async changePassword(
    @CurrentLandlord('id') landlordId: string,
    @Body() dto: ChangeLandlordPasswordDto,
  ): Promise<{ message: string }> {
    return this.landlordsService.changePassword(landlordId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset code',
    description:
      'Dispatches a 6-digit password reset code to the landlord email if the account exists. Returns a generic response to prevent email existence enumeration.',
  })
  @ApiOkResponse({
    description:
      'Generic confirmation message returned without disclosing account existence.',
  })
  @ApiTooManyRequestsResponse({
    description:
      'Cooldown active (must wait 60 seconds before requesting another code).',
  })
  async forgotPassword(
    @Body() dto: ForgotLandlordPasswordDto,
  ): Promise<{ message: string }> {
    return this.landlordsService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with verification code',
    description:
      'Validates the 6-digit reset code, sets the new password, and increments tokenVersion to invalidate any previously issued tokens.',
  })
  @ApiOkResponse({ description: 'Password reset successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid code, expired code, or maximum attempt limit exceeded.',
  })
  async resetPassword(
    @Body() dto: ResetLandlordPasswordDto,
  ): Promise<{ message: string }> {
    return this.landlordsService.resetPassword(dto);
  }

  @UseGuards(LandlordJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({
    summary: 'Get current landlord profile',
    description:
      'Returns the authenticated landlord safe profile (id, fullName, email, isEmailVerified, emailVerifiedAt, createdAt, updatedAt). Never exposes password hashes or token versions.',
  })
  @ApiOkResponse({ description: 'Landlord profile returned successfully.' })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async getProfile(
    @CurrentLandlord() landlord: LandlordUser,
  ): Promise<LandlordProfile> {
    return this.landlordsService.toProfile(landlord);
  }
}
