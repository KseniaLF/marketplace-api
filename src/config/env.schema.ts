import { z } from "zod";

export const envSchema = z.object({
  DB_URL: z.url({ protocol: /^postgres$/ }),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DB_PASSWORD_FILE: z
    .string()
    .trim()
    .min(1, "DB_PASSWORD_FILE must not be empty")
    .default("secrets/db_password"),
});

export type Env = z.infer<typeof envSchema>;

export function validate(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const lines = parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`
        Invalid configuration:
        \n${lines}\n
        Compare the environment with .env.example.
    `);
  }
  return parsed.data;
}
