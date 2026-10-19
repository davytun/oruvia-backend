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
import { CurrentSeeker } from './decorators/current-seeker.decorator.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { LoginSeekerDto } from './dto/login-seeker.dto.js';
import { RegisterSeekerDto } from './dto/register-seeker.dto.js';
import { ResendVerificationCodeDto } from './dto/resend-verification-code.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { SeekerUser } from './entities/seeker-user.entity.js';
import { SeekerJwtAuthGuard } from './guards/seeker-jwt-auth.guard.js';
import type { SeekerProfile } from './interfaces/seeker-profile.interface.js';
import { SeekersService } from './seekers.service.js';

@ApiTags('Seekers Authentication')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@Controller('seekers')
export class SeekersController {
  constructor(private readonly seekersService: SeekersService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new seeker account',
    description:
      'Creates an unverified seeker account, generates a salted HMAC-SHA256 verification code, and dispatches a welcome verification email.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Seeker account registered successfully; verification email dispatched.',
  })
  @ApiConflictResponse({
    description:
      'An account with this email address already exists (EMAIL_ALREADY_REGISTERED).',
  })
  async register(@Body() dto: RegisterSeekerDto): Promise<SeekerProfile> {
    return this.seekersService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify seeker email address',
    description:
      'Validates the 6-digit email verification code. On success, marks the seeker account as verified.',
  })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid code, expired code, or maximum attempt limit exceeded.',
  })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
  ): Promise<{ message: string; seeker: SeekerProfile }> {
    return this.seekersService.verifyEmail(dto);
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
    @Body() dto: ResendVerificationCodeDto,
  ): Promise<{ message: string }> {
    return this.seekersService.resendVerificationCode(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Seeker login',
    description:
      'Authenticates seeker credentials and returns a signed stateless JWT access token containing the seeker ID, email, and current tokenVersion.',
  })
  @ApiOkResponse({
    description:
      'Login successful, returns JWT access token and seeker safe profile.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiForbiddenResponse({
    description:
      'Account email has not been verified yet (EMAIL_NOT_VERIFIED).',
  })
  async login(
    @Body() dto: LoginSeekerDto,
  ): Promise<{ accessToken: string; seeker: SeekerProfile }> {
    return this.seekersService.login(dto);
  }

  @UseGuards(SeekerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password (authenticated)',
    description:
      'Updates the authenticated seeker password and increments tokenVersion to instantly revoke all active JWT tokens across all devices.',
  })
  @ApiOkResponse({
    description: 'Password changed successfully; old sessions invalidated.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async changePassword(
    @CurrentSeeker('id') seekerId: string,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.seekersService.changePassword(seekerId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset code',
    description:
      'Dispatches a 6-digit password reset code to the seeker email if the account exists. Returns a generic response to prevent email existence enumeration.',
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
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    return this.seekersService.forgotPassword(dto);
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
    @Body() dto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    return this.seekersService.resetPassword(dto);
  }

  @UseGuards(SeekerJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({
    summary: 'Get current seeker profile',
    description:
      'Returns the authenticated seeker safe profile (id, fullName, email, isEmailVerified, emailVerifiedAt, createdAt, updatedAt). Never exposes password hashes or token versions.',
  })
  @ApiOkResponse({ description: 'Seeker profile returned successfully.' })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async getProfile(
    @CurrentSeeker() seeker: SeekerUser,
  ): Promise<SeekerProfile> {
    return this.seekersService.toProfile(seeker);
  }
}
