import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/models/index.ts',
  out: './src/database/migrations',
  dialect: 'sqlite',
})

