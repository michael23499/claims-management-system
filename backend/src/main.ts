import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  OpenAPIObject,
  SwaggerModule,
} from '@nestjs/swagger';
import { parse } from 'yaml';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Allow the Angular dev server (and other clients) to call the API.
  app.enableCors();

  // Serve uploaded images at /uploads/<file>.
  app.useStaticAssets(resolve(process.env.UPLOAD_DIR ?? 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger UI renders the hand-written openapi.yaml (the SDD source of truth);
  // falls back to a code-generated doc if the file isn't reachable.
  try {
    const contract = parse(
      readFileSync(resolve(__dirname, '../../openapi.yaml'), 'utf8'),
    ) as OpenAPIObject;
    SwaggerModule.setup('api', app, contract);
  } catch {
    const config = new DocumentBuilder()
      .setTitle('Claims Management System API')
      .setVersion('1.0.0')
      .build();
    SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
