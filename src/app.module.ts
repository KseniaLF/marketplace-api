import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { ConfigModule } from "@nestjs/config";
import { validate } from "./config/env.schema";
import { DatabaseModule } from "./database/database.module";

@Module({
  imports: [DatabaseModule, ConfigModule.forRoot({ isGlobal: true, validate })],
  controllers: [AppController],
})
export class AppModule {}
