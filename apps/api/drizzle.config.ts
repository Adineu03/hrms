import * as path from 'path';
import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load .env from monorepo root so DATABASE_URL is available when running drizzle-kit
config({ path: path.resolve(__dirname, '../../.env') });
config(); // fallback to local .env

export default defineConfig({
  schema: './src/infrastructure/database/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
