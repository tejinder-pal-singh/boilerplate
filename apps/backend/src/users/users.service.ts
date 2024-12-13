import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedisService } from '../shared/redis/redis.service';
import { User } from './entities/user.entity';
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const user = this.userRepository.create(createUserDto);
    await this.userRepository.save(user);

    // Cache user data
    await this.cacheUser(user);

    return user;
  }

  async findById(id: string): Promise<User> {
    // Try to get from cache first
    const cachedUser = await this.redisService.get(`user:${id}`);
    if (cachedUser) {
      return JSON.parse(cachedUser);
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cache the user data
    await this.cacheUser(user);

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByPasswordResetToken(token: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { passwordResetToken: token },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);

    // If email is being updated, check for uniqueness
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.findByEmail(updateUserDto.email);
      if (existingUser) {
        throw new ConflictException('Email already exists');
      }
    }

    Object.assign(user, updateUserDto);
    await this.userRepository.save(user);

    // Update cache
    await this.cacheUser(user);

    return user;
  }

  async updatePassword(
    id: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.findById(id);

    if (updatePasswordDto.currentPassword) {
      const isValid = await user.validatePassword(
        updatePasswordDto.currentPassword,
      );
      if (!isValid) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    user.password = updatePasswordDto.newPassword;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;

    await this.userRepository.save(user);
    await this.invalidateUserSessions(id);
  }

  async setPasswordReset(
    id: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.userRepository.update(id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });

    // Invalidate cache
    await this.redisService.del(`user:${id}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;

    await this.userRepository.save(user);
    await this.cacheUser(user);
  }

  async enableMfa(id: string, secret: string): Promise<void> {
    await this.userRepository.update(id, {
      mfaSecret: secret,
      isMfaEnabled: true,
    });

    // Invalidate cache
    await this.redisService.del(`user:${id}`);
  }

  async disableMfa(id: string): Promise<void> {
    await this.userRepository.update(id, {
      mfaSecret: null,
      isMfaEnabled: false,
    });

    // Invalidate cache
    await this.redisService.del(`user:${id}`);
  }

  async addRefreshToken(id: string, token: string): Promise<void> {
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
  }

  async removeRefreshToken(id: string, token: string): Promise<void> {
    const user = await this.findById(id);
    
    if (user.refreshTokens) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== token);
      await this.userRepository.save(user);
      await this.cacheUser(user);
    }
  }

  async invalidateAllRefreshTokens(id: string): Promise<void> {
    await this.userRepository.update(id, { refreshTokens: [] });
    await this.redisService.del(`user:${id}`);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
    await this.redisService.del(`user:${id}`);
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
