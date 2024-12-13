import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('Enterprise API')
    .setDescription(`
      # Enterprise API Documentation
      
      ## Authentication
      This API uses JWT-based authentication. You need to:
      1. Obtain an access token via /auth/login or /auth/register
      2. Include the token in the Authorization header as "Bearer {token}"
      
      ## API Keys
      For service-to-service communication, you can use API keys:
      1. Generate an API key via /api-keys/create
      2. Include the key in the X-API-Key header
      
      ## Rate Limiting
      - API endpoints are rate-limited
      - Default limit: 100 requests per minute
      - Limits are applied per IP address and API key
      
      ## Caching
      - Responses may be cached
      - Check Cache-Control headers for cache status
      - Use ETags for conditional requests
      
      ## WebSocket
      Real-time features are available through WebSocket connections:
      - Connect to ws://[host]/socket.io
      - Authentication required via JWT token
      - Supports presence detection and real-time messaging
      
      ## Vector Search
      Vector search capabilities are available for semantic search:
      - Upload vectors via /vectors/upsert
      - Query similar vectors via /vectors/query
      
      ## Error Handling
      All errors follow the format:
      {
        "statusCode": number,
        "message": string,
        "error": string
      }
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('api-keys', 'API key management')
    .addTag('vectors', 'Vector database operations')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}
