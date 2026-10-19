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
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentAdmin } from './decorators/current-admin.decorator.js';
import { ChangeAdminPasswordDto } from './dto/change-password.dto.js';
import { ForgotAdminPasswordDto } from './dto/forgot-password.dto.js';
import { LoginAdminDto } from './dto/login-admin.dto.js';
import { ResetAdminPasswordDto } from './dto/reset-password.dto.js';
import { AdminUser } from './entities/admin-user.entity.js';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard.js';
import type { AdminProfile } from './interfaces/admin-profile.interface.js';
import { AdminsService } from './admins.service.js';

@ApiTags('Admin Authentication')
@Throttle({ auth: { limit: 10, ttl: 60000 } })
@Controller('admin/auth')
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({
    summary: 'Authenticate admin',
    description:
      'Authenticates an active admin with email and password, verifies status, and returns a signed JWT access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin authenticated successfully. Returns JWT access token.',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid email or password (INVALID_CREDENTIALS).',
  })
  @ApiForbiddenResponse({
    description: 'Admin account is inactive or suspended (ADMIN_ACCOUNT_INACTIVE).',
  })
  async login(
    @Body() dto: LoginAdminDto,
  ): Promise<{ accessToken: string; admin: AdminProfile }> {
    return this.adminsService.login(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset code',
    description:
      'Requests a 6-digit password recovery code. Returns a generic non-enumerating message regardless of account existence.',
  })
  @ApiResponse({
    status: 200,
    description: 'Generic success message returned to prevent account enumeration.',
  })
  async forgotPassword(
    @Body() dto: ForgotAdminPasswordDto,
  ): Promise<{ message: string }> {
    return this.adminsService.forgotPassword(dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset password with recovery code',
    description:
      'Verifies recovery code and sets a new password. Increments tokenVersion to invalidate all existing sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully. Active sessions revoked.',
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired code, or maximum attempts exceeded.',
  })
  async resetPassword(
    @Body() dto: ResetAdminPasswordDto,
  ): Promise<{ message: string }> {
    return this.adminsService.resetPassword(dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  @ApiOperation({
    summary: 'Change password (authenticated)',
    description:
      'Validates current password, updates to new password, and increments tokenVersion to revoke all active sessions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully. Active sessions revoked.',
  })
  @ApiBadRequestResponse({
    description:
      'Current password invalid or new password identical to current.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async changePassword(
    @CurrentAdmin() admin: AdminUser,
    @Body() dto: ChangeAdminPasswordDto,
  ): Promise<{ message: string }> {
    return this.adminsService.changePassword(admin.id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @Get('me')
  @ApiOperation({
    summary: 'Get current admin profile',
    description:
      'Retrieves the authenticated admin user profile. Omits passwordHash and tokenVersion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin profile returned successfully.',
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, expired, revoked, or non-admin Bearer token.',
  })
  async getProfile(@CurrentAdmin() admin: AdminUser): Promise<AdminProfile> {
    return this.adminsService.toProfile(admin);
  }
}
