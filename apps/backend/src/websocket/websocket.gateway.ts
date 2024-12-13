import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WsJwtGuard } from './guards/ws-jwt.guard';
import { PinoLoggerService } from '../shared/services/logger.service';
import { CacheService } from '../shared/cache/cache.service';

@WebSocketGateway({
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private logger: PinoLoggerService,
    private cacheService: CacheService,
  ) {}

  @UseGuards(WsJwtGuard)
  async handleConnection(client: Socket) {
    try {
      const userId = client.data.user.sub;
      this.addUserSocket(userId, client.id);
      await this.updateUserPresence(userId, true);
      
      this.logger.info(`Client connected: ${client.id}, User: ${userId}`);
    } catch (error) {
      this.logger.error('WebSocket connection error', error);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    try {
      const userId = client.data?.user?.sub;
      if (userId) {
        this.removeUserSocket(userId, client.id);
        if (!this.hasActiveSockets(userId)) {
          await this.updateUserPresence(userId, false);
        }
      }
      this.logger.info(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error('WebSocket disconnection error', error);
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: any,
  ) {
    try {
      const userId = client.data.user.sub;
      // Handle the message and broadcast to relevant users
      this.server.emit('message', {
        userId,
        message: payload,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error('Message handling error', error);
    }
  }

  private addUserSocket(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  private hasActiveSockets(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  private async updateUserPresence(userId: string, isOnline: boolean) {
    await this.cacheService.set(`presence:${userId}`, isOnline);
    this.server.emit('presence', { userId, isOnline });
  }

  public async sendToUser(userId: string, event: string, data: any) {
    const userSockets = this.userSockets.get(userId);
    if (userSockets) {
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  public async broadcastToAll(event: string, data: any) {
    this.server.emit(event, data);
  }
}
