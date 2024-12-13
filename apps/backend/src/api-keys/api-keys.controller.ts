import { Controller, Post, Body, UseGuards, Request, Delete, Param, Put, Get, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKeyResponseDto } from './dto/api-key-response.dto';
import { ApiKeyTransformInterceptor } from './interceptors/api-key-transform.interceptor';
import { Scopes } from './decorators/scopes.decorator';

@ApiTags('api-keys')
@Controller('api-keys')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ApiKeyTransformInterceptor)
@ApiBearerAuth()
@ApiHeader({
  name: 'Authorization',
  description: 'Bearer JWT token',
  required: true,
})
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ 
    status: 201, 
    description: 'API key created successfully',
    type: Object,
    schema: {
      properties: {
        apiKey: {
          type: 'string',
          description: 'The generated API key (only shown once)',
          example: '1234567890abcdef'
        },
        id: {
          type: 'string',
          description: 'The unique identifier of the API key',
          example: '123e4567-e89b-12d3-a456-426614174000'
        }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createApiKey(
    @Request() req,
    @Body() createApiKeyDto: CreateApiKeyDto,
  ): Promise<{ apiKey: string; id: string }> {
    return this.apiKeysService.createApiKey(req.user.id, createApiKeyDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for the authenticated user' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of API keys', 
    type: [ApiKeyResponseDto] 
  })
  async listApiKeys(@Request() req): Promise<ApiKeyResponseDto[]> {
    return this.apiKeysService.listApiKeys(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200, description: 'API key revoked successfully' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async revokeApiKey(
    @Request() req,
    @Param('id') id: string,
  ): Promise<void> {
    return this.apiKeysService.revokeApiKey(id, req.user.id);
  }

  @Put(':id/rotate')
  @ApiOperation({ summary: 'Rotate an API key' })
  @ApiResponse({ 
    status: 200, 
    description: 'API key rotated successfully',
    schema: {
      properties: {
        apiKey: {
          type: 'string',
          description: 'The new API key (only shown once)',
          example: '1234567890abcdef'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async rotateApiKey(
    @Request() req,
    @Param('id') id: string,
  ): Promise<{ apiKey: string }> {
    return this.apiKeysService.rotateApiKey(id, req.user.id);
  }
}
