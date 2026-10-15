import "reflect-metadata";
import path from "node:path";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@nestjs/config";
import { Env } from "./config/env.schema.js";

import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get("PORT", { infer: true });

  await app.listen(port);
}

bootstrap();
