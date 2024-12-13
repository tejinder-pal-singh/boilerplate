import { Controller, Get, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';
import { RateLimitGuard } from '../shared/rate-limit/rate-limit.guard';

class TestDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}

@ApiTags('Test')
@Controller('test')
export class TestController {
  @Get('error')
  @ApiOperation({ summary: 'Test error handling' })
  testError() {
    throw new BadRequestException('Test error handling');
  }

  @Get('timeout')
  @ApiOperation({ summary: 'Test timeout interceptor' })
  async testTimeout() {
    await new Promise(resolve => setTimeout(resolve, 31000));
    return { message: 'This should timeout' };
  }

  @Post('validation')
  @ApiOperation({ summary: 'Test validation' })
  testValidation(@Body() dto: TestDto) {
    return dto;
  }

  @Get('rate-limit')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Test rate limiting' })
  testRateLimit() {
    return { message: 'Rate limit test' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  healthCheck() {
    return { status: 'ok' };
  }
}
