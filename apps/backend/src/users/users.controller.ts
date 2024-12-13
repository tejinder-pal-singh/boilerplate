import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UpdateUserDto, UpdatePasswordDto } from './dto';

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns the current user profile', type: User })
  getCurrentUser(@Req() req: { user: User }): Promise<User> {
    return this.usersService.findById(req.user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: User })
  updateCurrentUser(
    @Req() req: { user: User },
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(req.user.id, updateUserDto);
  }

  @Put('me/password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user password' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  async updateCurrentUserPassword(
    @Req() req: { user: User },
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ message: string }> {
    await this.usersService.updatePassword(req.user.id, updatePasswordDto);
    return { message: 'Password updated successfully' };
  }

  @Post('me/mfa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disable MFA for current user' })
  @ApiResponse({ status: 200, description: 'MFA disabled successfully' })
  async disableMfa(@Req() req: { user: User }): Promise<{ message: string }> {
    await this.usersService.disableMfa(req.user.id);
    return { message: 'MFA disabled successfully' };
  }

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns all users', type: [User] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<{ users: User[]; total: number }> {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.usersService.findAll(skip, limit),
      this.usersService.count(),
    ]);
    return { users, total };
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Returns the user', type: User })
  findOne(@Param('id') id: string): Promise<User> {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'User updated successfully', type: User })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID (admin only)' })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.delete(id);
  }

  @Post(':id/invalidate-sessions')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Invalidate all user sessions (admin only)' })
  @ApiResponse({ status: 200, description: 'All user sessions invalidated' })
  async invalidateUserSessions(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.usersService.invalidateAllRefreshTokens(id);
    return { message: 'All user sessions have been invalidated' };
  }
}
