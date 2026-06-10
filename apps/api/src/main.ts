import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use(require('express').json({ limit: '5mb' })); // Allow large payloads for screenshot images
  app.enableCors({
    origin: config.get('WEB_URL', 'http://localhost:3000'),
    credentials: true,
  });

  // Railway (and most PaaS) inject PORT; fall back to API_PORT for local dev.
  const port = config.get('PORT') || config.get('API_PORT', 3001);
  await app.listen(port, '0.0.0.0');
  console.log(`HRMS API running on port ${port}`);
}
bootstrap();
