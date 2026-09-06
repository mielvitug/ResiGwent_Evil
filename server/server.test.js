import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { pool } from './db.js'

// Dynamic import: app.js runs initDb() at load, which throws when PG is
// unreachable. Catching it here (instead of a static import) is what lets
// the suite *skip* instead of crashing on machines without a database.
let app = null
let reachable = true
try {
  ;({ app } = await import('./app.js'))
  await pool.query('SELECT 1')
} catch {
  reachable = false
}
const maybe = reachable ? {} : { skip: 'PostgreSQL unreachable (no DATABASE_URL?)' }

let server = null
let base = ''
let originalSettings = null

before(async () => {
  if (!reachable) return
  const { rows } = await pool.query("SELECT value FROM settings WHERE key = 'default'")
  originalSettings = rows[0]?.value ?? null
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  base = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  if (!reachable) return
  await pool.query("DELETE FROM matches WHERE faction = '__test'")
  await pool.query("DELETE FROM decks WHERE name LIKE '__test-%'")
  if (originalSettings === null) {
    await pool.query("DELETE FROM settings WHERE key = 'default'")
  } else {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
      ['default', JSON.stringify(originalSettings)]
    )
  }
  await new Promise((resolve) => server.close(resolve))
  await pool.end()
})

async function api(path, options) {
  const res = await fetch(base + path, options)
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { status: res.status, body }
}

const put = (path, data) =>
  api(path, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
const post = (path, data) =>
  api(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })

test('health reports ok', maybe, async () => {
  const { status, body } = await api('/api/health')
  assert.equal(status, 200)
  assert.equal(body.ok, true)
})

test('settings round-trip', maybe, async () => {
  assert.equal((await put('/api/settings', { __test: 1 })).status, 204)
  assert.deepEqual((await api('/api/settings')).body, { __test: 1 })
})

test('matches POST validates, creates, and lists', maybe, async () => {
  assert.equal((await post('/api/matches', { faction: '__test' })).status, 400)
  const created = await post('/api/matches', {
    faction: '__test',
    opponent: '__test-foe',
    difficulty: 'normal',
    rounds: '2-0',
    outcome: 'win',
  })
  assert.equal(created.status, 201)
  assert.ok(created.body.id)
  const listed = await api('/api/matches?limit=5')
  assert.ok(listed.body.some((m) => m.id === created.body.id))
})

test('decks PUT/GET/DELETE cycle with 404 on double delete', maybe, async () => {
  const saved = await put('/api/decks/__test-starter', {
    faction_id: '__test',
    leader_id: '__test',
    card_ids: ['a'],
    difficulty: 'normal',
  })
  assert.equal(saved.status, 200)
  assert.equal(saved.body.name, '__test-starter')
  assert.ok((await api('/api/decks')).body.some((d) => d.name === '__test-starter'))
  assert.equal((await api('/api/decks/__test-starter', { method: 'DELETE' })).status, 204)
  assert.ok(!(await api('/api/decks')).body.some((d) => d.name === '__test-starter'))
  assert.equal((await api('/api/decks/__test-starter', { method: 'DELETE' })).status, 404)
})

test('stats returns faction and deck buckets', maybe, async () => {
  const { status, body } = await api('/api/stats')
  assert.equal(status, 200)
  assert.ok(Array.isArray(body.byFaction))
  assert.ok(Array.isArray(body.byDeck))
  // COUNT arrives as a string from pg — compare numerically.
  assert.ok(body.byFaction.some((r) => r.faction === '__test' && Number(r.played) >= 1))
})
