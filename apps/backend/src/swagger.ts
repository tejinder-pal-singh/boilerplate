import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';
import { version } from '../../package.json';

export function setupSwagger(app: INestApplication) {
  const options = new DocumentBuilder()
    .setTitle('Enterprise Boilerplate API')
    .setDescription('API documentation for Enterprise Boilerplate')
    .setVersion(version)
    .addBearerAuth()
    .addApiKey()
    .addServer('http://localhost:4000', 'Local environment')
    .addServer('https://staging-api.example.com', 'Staging environment')
    .addServer('https://api.example.com', 'Production environment')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, options);
  
  // Add security requirements
  document.security = [
    {
      bearer: [],
    },
  ];

  // Enable API explorer
  SwaggerModule.setup('api', app, document, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
  });
}
