import type { Config } from 'drizzle-kit'

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'better-sqlite3',
  dbCredentials: {
    url: './dota2shuffle.db',
  },
} satisfies Config
