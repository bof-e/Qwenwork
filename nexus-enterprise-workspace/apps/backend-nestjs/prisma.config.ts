import { defineConfig } from '@prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  // Configuration for CLI operations (migrations, db push, etc.)
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
