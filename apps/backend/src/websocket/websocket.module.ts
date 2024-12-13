import { Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { CacheModule } from '../shared/cache/cache.module';

@Module({
  imports: [CacheModule],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule {}
