import { Pool } from 'pg'

try { process.loadEnvFile() } catch { /* no .env — real env vars (Vercel) take over */ }

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL is missing — add it to .env')

export const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      key  TEXT PRIMARY KEY,
      value JSONB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decks (
      id         SERIAL PRIMARY KEY,
      name       TEXT UNIQUE NOT NULL,
      faction_id TEXT NOT NULL,
      leader_id  TEXT NOT NULL,
      card_ids   JSONB NOT NULL,
      difficulty TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS matches (
      id         SERIAL PRIMARY KEY,
      deck_id    INTEGER REFERENCES decks(id) ON DELETE SET NULL,
      faction    TEXT NOT NULL,
      opponent   TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      rounds     TEXT NOT NULL,
      outcome    TEXT NOT NULL,
      played_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
  console.log('[db] tables ready')
}