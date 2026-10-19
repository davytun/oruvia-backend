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
import { CurrentAgent } from './decorators/current-agent.decorator.js';
import { ChangeAgentPasswordDto } from './dto/change-password.dto.js';
import { ForgotAgentPasswordDto } from './dto/forgot-password.dto.js';
import { LoginAgentDto } from './dto/login-agent.dto.js';
import { RegisterAgentDto } from './dto/register-agent.dto.js';
import { ResendAgentVerificationCodeDto } from './dto/resend-verification-code.dto.js';
import { ResetAgentPasswordDto } from './dto/reset-password.dto.js';
import { VerifyAgentEmailDto } from './dto/verify-email.dto.js';
import { AgentUser } from './entities/agent-user.entity.js';
import { AgentJwtAuthGuard } from './guards/agent-jwt-auth.guard.js';
import type { AgentProfile } from './interfaces/agent-profile.interface.js';
import { AgentsService } from './agents.service.js';

@ApiTags('Agents Authentication')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new agent account',
    description:
      'Creates an unverified agent account, generates a salted HMAC-SHA256 verification code, and dispatches a welcome verification email.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Agent account registered successfully; verification email dispatched.',
  })
  @ApiConflictResponse({
    description:
      'An account with this email address already exists (EMAIL_ALREADY_REGISTERED).',
  })
  async register(@Body() dto: RegisterAgentDto): Promise<AgentProfile> {
    return this.agentsService.register(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify agent email address',
    description:
      'Validates the 6-digit email verification code. On success, marks the agent account as verified.',
  })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiResponse({
    status: 400,
    description:
      'Invalid code, expired code, or maximum attempt limit exceeded.',
  })
  async verifyEmail(
    @Body() dto: VerifyAgentEmailDto,
  ): Promise<{ message: string; agent: AgentProfile }> {
    return this.agentsService.verifyEmail(dto);
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
    @Body() dto: ResendAgentVerificationCodeDto,
  ): Promise<{ message: string }> {
    return this.agentsService.resendVerificationCode(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Agent login',
    description:
      'Authenticates agent credentials and returns a signed stateless JWT access token containing the agent ID, email, and current tokenVersion.',
  })
  @ApiOkResponse({
    description:
      'Login successful, returns JWT access token and agent safe profile.',
  })
  @ApiUnauthorizedResponse({ description: 'Invalid email or password.' })
  @ApiForbiddenResponse({
    description:
      'Account email has not been verified yet (EMAIL_NOT_VERIFIED).',
  })
  async login(
    @Body() dto: LoginAgentDto,
  ): Promise<{ accessToken: string; agent: AgentProfile }> {
    return this.agentsService.login(dto);
  }

  @UseGuards(AgentJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password (authenticated)',
    description:
      'Updates the authenticated agent password and increments tokenVersion to instantly revoke all active JWT tokens across all devices.',
  })
  @ApiOkResponse({
    description: 'Password changed successfully; old sessions invalidated.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async changePassword(
    @CurrentAgent('id') agentId: string,
    @Body() dto: ChangeAgentPasswordDto,
  ): Promise<{ message: string }> {
    return this.agentsService.changePassword(agentId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset code',
    description:
      'Dispatches a 6-digit password reset code to the agent email if the account exists. Returns a generic response to prevent email existence enumeration.',
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
    @Body() dto: ForgotAgentPasswordDto,
  ): Promise<{ message: string }> {
    return this.agentsService.forgotPassword(dto);
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
    @Body() dto: ResetAgentPasswordDto,
  ): Promise<{ message: string }> {
    return this.agentsService.resetPassword(dto);
  }

  @UseGuards(AgentJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({
    summary: 'Get current agent profile',
    description:
      'Returns the authenticated agent safe profile (id, fullName, email, isEmailVerified, emailVerifiedAt, createdAt, updatedAt). Never exposes password hashes or token versions.',
  })
  @ApiOkResponse({ description: 'Agent profile returned successfully.' })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid, or expired JWT token.',
  })
  async getProfile(
    @CurrentAgent() agent: AgentUser,
  ): Promise<AgentProfile> {
    return this.agentsService.toProfile(agent);
  }
}
