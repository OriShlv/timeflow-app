import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(3000),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z.url(),
    REDIS_URL: z.url(),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("15m"),
    OPS_ENABLED: z.coerce.boolean().default(false),
    OPS_DEV_ONLY: z.coerce.boolean().default(true),
    OPS_ADMIN_EMAILS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("Invalid environment variables", parsed.error.format());
    process.exit(1);
}

export const env = parsed.data;
