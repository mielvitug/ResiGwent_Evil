import express from 'express'
import { pool, initDb } from './db.js'

await initDb()

export const app = express()
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS decks FROM decks')
    res.json({ ok: true, decks: rows[0].decks })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.get('/api/settings', async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'default'")
    res.json(rows[0]?.value ?? null)
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.put('/api/settings', async (req, res) => {
  try {
    const value = req.body ?? {}
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('default', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(value)]
    )
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.post('/api/matches', async (req, res) => {
  try {
    const { deck_id = null, faction, opponent, difficulty, rounds, outcome } = req.body ?? {}
    if (!faction || !opponent || !difficulty || !rounds || !outcome) {
      return res.status(400).json({ ok: false, error: 'faction, opponent, difficulty, rounds, outcome are required' })
    }
    const { rows } = await pool.query(
      `INSERT INTO matches (deck_id, faction, opponent, difficulty, rounds, outcome)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, deck_id, faction, opponent, difficulty, rounds, outcome, played_at`,
      [deck_id, faction, opponent, difficulty, rounds, outcome]
    )
    res.status(201).json(rows[0])
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.get('/api/matches', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 10) || 10, 100)
    const { rows } = await pool.query(
      `SELECT m.id, m.deck_id, d.name AS deck_name, m.faction, m.opponent,
              m.difficulty, m.rounds, m.outcome, m.played_at
       FROM matches m
       LEFT JOIN decks d ON d.id = m.deck_id
       ORDER BY m.played_at DESC
       LIMIT $1`,
      [limit]
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.get('/api/decks', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, faction_id, leader_id, card_ids, difficulty, updated_at
       FROM decks ORDER BY updated_at DESC`
    )
    res.json(rows)
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.put('/api/decks/:name', async (req, res) => {
  try {
    const { faction_id, leader_id, card_ids, difficulty } = req.body ?? {}
    if (!faction_id || !leader_id || !Array.isArray(card_ids) || !difficulty) {
      return res.status(400).json({ ok: false, error: 'faction_id, leader_id, card_ids[], difficulty are required' })
    }
    const { rows } = await pool.query(
      `INSERT INTO decks (name, faction_id, leader_id, card_ids, difficulty, updated_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (name) DO UPDATE SET faction_id = EXCLUDED.faction_id, leader_id = EXCLUDED.leader_id,
         card_ids = EXCLUDED.card_ids, difficulty = EXCLUDED.difficulty, updated_at = now()
       RETURNING id, name, faction_id, leader_id, card_ids, difficulty, updated_at`,
      [req.params.name, faction_id, leader_id, JSON.stringify(card_ids), difficulty]
    )
    res.json(rows[0])
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.delete('/api/decks/:name', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM decks WHERE name = $1', [req.params.name])
    if (rowCount === 0) return res.status(404).json({ ok: false, error: 'deck not found' })
    res.status(204).end()
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})

app.get('/api/stats', async (req, res) => {
  try {
    const { rows: byFaction } = await pool.query(
      `SELECT faction,
              COUNT(*) AS played,
              COUNT(*) FILTER (WHERE outcome = 'win') AS wins
       FROM matches GROUP BY faction ORDER BY played DESC`
    )
    const { rows: byDeck } = await pool.query(
      `SELECT d.name AS deck,
              COUNT(m.id) AS played,
              COUNT(*) FILTER (WHERE m.outcome = 'win') AS wins
       FROM decks d LEFT JOIN matches m ON m.deck_id = d.id
       GROUP BY d.name ORDER BY played DESC`
    )
    res.json({ byFaction, byDeck })
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err?.message ?? err) })
  }
})