import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is missing');
    }

    try {
      const validatedKey = await this.apiKeysService.validateApiKey(apiKey);
      
      // Check required scopes
      const requiredScopes = this.reflector.getAllAndOverride<string[]>(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (requiredScopes && requiredScopes.length > 0) {
        const hasRequiredScopes = requiredScopes.every(scope => 
          validatedKey.scopes.includes(scope)
        );

        if (!hasRequiredScopes) {
          throw new UnauthorizedException('Insufficient scopes');
        }
      }

      // Attach user and API key to request
      request.user = validatedKey.user;
      request.apiKey = validatedKey;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }

  private extractApiKey(request: any): string | undefined {
    const authHeader = request.headers['x-api-key'] || request.headers['authorization'];
    
    if (!authHeader) {
      return undefined;
    }

    // Handle both formats: "x-api-key: key" and "Authorization: Bearer key"
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return authHeader;
  }
}
