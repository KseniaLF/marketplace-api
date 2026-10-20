import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";
import { Env } from "../config/env.schema";
import { readFile } from "node:fs/promises";

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly config: ConfigService<Env, true>) {
    const dbUrl = new URL(this.config.get("DB_URL", { infer: true }));
    const passwordFile = this.config.get("DB_PASSWORD_FILE", { infer: true });

    this.pool = new Pool({
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 5432),
      user: decodeURIComponent(dbUrl.username),
      database: decodeURIComponent(dbUrl.pathname.slice(1)),

      password: async () => {
        const password = await readFile(passwordFile, "utf8");
        return password.trim();
      },
    });

    this.pool.on("error", (error) => {
      console.error("Unexpected error on idle PostgreSQL client", error);
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async query(text: string, params?: unknown[]) {
    const start = Date.now();
    const res = await this.pool.query(text, params);
    const duration = Date.now() - start;

    console.log("executed query", { text, duration, rows: res.rowCount });
    return res;
  }
}
