import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// Sentry wiring placeholder (Phase 0 requirement / TRD §1)
if (process.env.SENTRY_DSN) {
  console.log('[Monitoring] Initializing Sentry APM with DSN');
  // Sentry.init({ dsn: process.env.SENTRY_DSN });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`☕ Chai Partner API is running on http://localhost:${port}/api`);
}

bootstrap();
