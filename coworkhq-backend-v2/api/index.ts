import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let cachedApp: any;

async function bootstrapServer() {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule);

    app.setGlobalPrefix('api/v1');

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    app.enableCors({
      origin: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type,Authorization,Accept',
      credentials: true,
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    await app.init();
    cachedApp = app.getHttpAdapter().getInstance();
  }
  return cachedApp;
}

export default async function (req: any, res: any) {
  try {
    const app = await bootstrapServer();
    return app(req, res);
  } catch (error: any) {
    console.error('Serverless Crash:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error?.message || String(error) });
  }
}
