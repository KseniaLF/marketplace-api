import "reflect-metadata";
import path from "node:path";

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ConfigService } from "@nestjs/config";
import { Env } from "./config/env.schema.js";
import OpenApiValidator from "express-openapi-validator";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    OpenApiValidator.middleware({
      apiSpec: path.join(process.cwd(), "openapi/openapi.yaml"),
      validateRequests: true,
      validateResponses: true,
    }),
  );

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get("PORT", { infer: true });

  await app.listen(port);
}

bootstrap();
