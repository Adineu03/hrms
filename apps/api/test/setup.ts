import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from monorepo root (two levels up from apps/api/test/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
// Also try apps/api/.env as fallback
dotenv.config({ path: path.resolve(__dirname, '../.env') });
