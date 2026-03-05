import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({
    origin: config.get('WEB_URL', 'http://localhost:3000'),
    credentials: true,
  });

  const port = config.get('API_PORT', 3001);
  await app.listen(port);
  console.log(`HRMS API running on http://localhost:${port}`);
}
bootstrap();
