import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { PinoLoggerService } from '../../shared/services/logger.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private logger: PinoLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const client: Socket = context.switchToWs().getClient<Socket>();
      const authToken = this.extractTokenFromHeader(client);

      if (!authToken) {
        throw new WsException('Unauthorized');
      }

      const payload = await this.jwtService.verifyAsync(authToken);
      client.data.user = payload;

      return true;
    } catch (err) {
      this.logger.error('WebSocket authentication failed', err);
      throw new WsException('Unauthorized');
    }
  }

  private extractTokenFromHeader(client: Socket): string | undefined {
    const [type, token] = client.handshake.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
