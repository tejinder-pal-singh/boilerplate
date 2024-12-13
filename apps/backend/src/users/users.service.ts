import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../shared/redis/redis.service';
import { User, AuthProvider } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto } from './dto';
import { 
  ServiceResult, 
  FindAllOptions, 
  CreateOptions, 
  UpdateOptions, 
  DeleteOptions 
} from '../shared/types/service.types';
import { ErrorCode } from '../shared/types/error.types';
import { LoggerService } from '../shared/services/logger.service';
import { MetricsService } from '../shared/services/metrics.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly metrics: MetricsService
  ) {}

  async findAll(options?: FindAllOptions<User>): Promise<ServiceResult<User[]>> {
    try {
      const [users, total] = await this.userRepository.findAndCount({
        where: options?.where,
        relations: options?.relations,
        select: options?.select,
        skip: options?.pagination?.page ? (options.pagination.page - 1) * (options.pagination.limit || 10) : 0,
        take: options?.pagination?.limit || 10,
        order: options?.pagination?.sortBy ? { 
          [options.pagination.sortBy]: options.pagination.sortOrder || 'ASC' 
        } : undefined
      });

      const meta = {
        page: options?.pagination?.page || 1,
        limit: options?.pagination?.limit || 10,
        total,
        totalPages: Math.ceil(total / (options?.pagination?.limit || 10)),
        hasNextPage: (options?.pagination?.page || 1) < Math.ceil(total / (options?.pagination?.limit || 10)),
        hasPreviousPage: (options?.pagination?.page || 1) > 1
      };

      this.metrics.increment('users.list.success');
      return { data: users, meta };
    } catch (error) {
      this.logger.error('Error finding users', { error, context: 'UsersService.findAll' });
      this.metrics.increment('users.list.error');
      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    try {
      // Try to get from cache first
      const cachedUser = await this.redisService.get(`user:${id}`);
      if (cachedUser) {
        return JSON.parse(cachedUser);
      }

      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        this.metrics.increment('users.find.notFound');
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'User not found'
        });
      }

      // Cache the user data
      await this.cacheUser(user);

      this.metrics.increment('users.find.success');
      return user;
    } catch (error) {
      this.logger.error('Error finding user', { error, context: 'UsersService.findById', userId: id });
      this.metrics.increment('users.find.error');
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return this.userRepository.findOne({ where: { email } });
    } catch (error) {
      this.logger.error('Error finding user by email', { error, context: 'UsersService.findByEmail', email });
      this.metrics.increment('users.findByEmail.error');
      throw error;
    }
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    try {
      return this.userRepository.findOne({
        where: { passwordResetToken: token },
      });
    } catch (error) {
      this.logger.error('Error finding user by password reset token', { error, context: 'UsersService.findByPasswordResetToken', token });
      this.metrics.increment('users.findByPasswordResetToken.error');
      throw error;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const existingUser = await this.findByEmail(createUserDto.email);
      if (existingUser) {
        this.metrics.increment('users.create.conflict');
        throw new ConflictException({
          code: ErrorCode.ALREADY_EXISTS,
          message: 'User with this email already exists'
        });
      }

      const user = this.userRepository.create(createUserDto);
      const savedUser = await this.userRepository.save(user);

      // Cache user data
      await this.cacheUser(savedUser);

      this.logger.info('User created successfully', { 
        userId: savedUser.id, 
        context: 'UsersService.create' 
      });
      this.metrics.increment('users.create.success');

      return savedUser;
    } catch (error) {
      this.logger.error('Error creating user', { 
        error, 
        context: 'UsersService.create',
        data: createUserDto 
      });
      this.metrics.increment('users.create.error');
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findById(id);

      // If email is being updated, check for uniqueness
      if (updateUserDto.email && updateUserDto.email !== user.email) {
        const existingUser = await this.findByEmail(updateUserDto.email);
        if (existingUser) {
          this.metrics.increment('users.update.conflict');
          throw new ConflictException({
            code: ErrorCode.ALREADY_EXISTS,
            message: 'User with this email already exists'
          });
        }
      }

      Object.assign(user, updateUserDto);
      const savedUser = await this.userRepository.save(user);

      // Update cache
      await this.cacheUser(savedUser);

      this.logger.info('User updated successfully', { 
        userId: id, 
        context: 'UsersService.update' 
      });
      this.metrics.increment('users.update.success');

      return savedUser;
    } catch (error) {
      this.logger.error('Error updating user', { 
        error, 
        context: 'UsersService.update',
        userId: id 
      });
      this.metrics.increment('users.update.error');
      throw error;
    }
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    try {
      const user = await this.findById(id);

      if (updatePasswordDto.currentPassword) {
        const isValid = await user.validatePassword(
          updatePasswordDto.currentPassword,
        );
        if (!isValid) {
          this.metrics.increment('users.updatePassword.invalid');
          throw new BadRequestException({
            code: ErrorCode.INVALID_PASSWORD,
            message: 'Current password is incorrect'
          });
        }
      }

      user.password = updatePasswordDto.newPassword;
      user.passwordResetToken = null;
      user.passwordResetExpires = null;

      await this.userRepository.save(user);
      await this.invalidateUserSessions(id);
    } catch (error) {
      this.logger.error('Error updating user password', { 
        error, 
        context: 'UsersService.updatePassword',
        userId: id 
      });
      this.metrics.increment('users.updatePassword.error');
      throw error;
    }
  }

  async setPasswordReset(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    try {
      await this.userRepository.update(id, {
        passwordResetToken: token,
        passwordResetExpires: expires,
      });

      // Invalidate cache
      await this.redisService.del(`user:${id}`);
    } catch (error) {
      this.logger.error('Error setting user password reset', { 
        error, 
        context: 'UsersService.setPasswordReset',
        userId: id 
      });
      this.metrics.increment('users.setPasswordReset.error');
      throw error;
    }
  }

  async verifyEmail(token: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { emailVerificationToken: token },
      });

      if (!user) {
        this.metrics.increment('users.verifyEmail.invalid');
        throw new BadRequestException({
          code: ErrorCode.INVALID_TOKEN,
          message: 'Invalid verification token'
        });
      }

      user.isEmailVerified = true;
      user.emailVerificationToken = null;

      await this.userRepository.save(user);
      await this.cacheUser(user);
    } catch (error) {
      this.logger.error('Error verifying user email', { 
        error, 
        context: 'UsersService.verifyEmail',
        token 
      });
      this.metrics.increment('users.verifyEmail.error');
      throw error;
    }
  }

  async enableMfa(id: string, secret: string): Promise<void> {
    try {
      await this.userRepository.update(id, {
        mfaSecret: secret,
        isMfaEnabled: true,
      });

      // Invalidate cache
      await this.redisService.del(`user:${id}`);
    } catch (error) {
      this.logger.error('Error enabling user MFA', { 
        error, 
        context: 'UsersService.enableMfa',
        userId: id 
      });
      this.metrics.increment('users.enableMfa.error');
      throw error;
    }
  }

  async disableMfa(id: string): Promise<void> {
    try {
      await this.userRepository.update(id, {
        mfaSecret: null,
        isMfaEnabled: false,
      });

      // Invalidate cache
      await this.redisService.del(`user:${id}`);
    } catch (error) {
      this.logger.error('Error disabling user MFA', { 
        error, 
        context: 'UsersService.disableMfa',
        userId: id 
      });
      this.metrics.increment('users.disableMfa.error');
      throw error;
    }
  }

  async addRefreshToken(id: string, token: string): Promise<void> {
    try {
      const user = await this.findById(id);
      
      if (!user.refreshTokens) {
        user.refreshTokens = [];
      }

      // Keep only the last 5 refresh tokens
      if (user.refreshTokens.length >= 5) {
        user.refreshTokens = user.refreshTokens.slice(-4);
      }

      user.refreshTokens.push(token);
      await this.userRepository.save(user);
      await this.cacheUser(user);
    } catch (error) {
      this.logger.error('Error adding user refresh token', { 
        error, 
        context: 'UsersService.addRefreshToken',
        userId: id 
      });
      this.metrics.increment('users.addRefreshToken.error');
      throw error;
    }
  }

  async removeRefreshToken(id: string, token: string): Promise<void> {
    try {
      const user = await this.findById(id);
      
      if (user.refreshTokens) {
        user.refreshTokens = user.refreshTokens.filter(t => t !== token);
        await this.userRepository.save(user);
        await this.cacheUser(user);
      }
    } catch (error) {
      this.logger.error('Error removing user refresh token', { 
        error, 
        context: 'UsersService.removeRefreshToken',
        userId: id 
      });
      this.metrics.increment('users.removeRefreshToken.error');
      throw error;
    }
  }

  async invalidateAllRefreshTokens(id: string): Promise<void> {
    try {
      await this.userRepository.update(id, { refreshTokens: [] });
      await this.redisService.del(`user:${id}`);
    } catch (error) {
      this.logger.error('Error invalidating user refresh tokens', { 
        error, 
        context: 'UsersService.invalidateAllRefreshTokens',
        userId: id 
      });
      this.metrics.increment('users.invalidateAllRefreshTokens.error');
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const user = await this.findById(id);
      await this.userRepository.remove(user);
      await this.redisService.del(`user:${id}`);
    } catch (error) {
      this.logger.error('Error deleting user', { 
        error, 
        context: 'UsersService.delete',
        userId: id 
      });
      this.metrics.increment('users.delete.error');
      throw error;
    }
  }

  private async cacheUser(user: User): Promise<void> {
    await this.redisService.set(
      `user:${user.id}`,
      JSON.stringify(user),
      3600, // Cache for 1 hour
    );
  }

  private async invalidateUserSessions(id: string): Promise<void> {
    // Clear refresh tokens
    await this.invalidateAllRefreshTokens(id);
    
    // Clear user cache
    await this.redisService.del(`user:${id}`);
  }
}
