import { getMatches, postMatch } from '../api/client.js'

const STORAGE_KEY = 'resigwent-evil-match-log'
const MAX_ENTRIES = 10

export function loadMatchLog() {
  if (typeof window === 'undefined') return []

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((entry) => entry && typeof entry === 'object').slice(0, MAX_ENTRIES) : []
  } catch {
    return []
  }
}

function writeMatchLog(log) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage unavailable; the operation log stays session-scoped.
  }
}

export function recordMatch(entry) {
  if (typeof window === 'undefined') return

  writeMatchLog([{ ...entry, at: new Date().toISOString() }, ...loadMatchLog()].slice(0, MAX_ENTRIES))
  postMatch(entry).catch(() => {})
}

function toEntry(row) {
  return {
    faction: row.faction,
    opponent: row.opponent,
    difficulty: row.difficulty,
    rounds: row.rounds,
    outcome: row.outcome,
    at: row.played_at,
  }
}

// Restore-only: fills an empty device from the server; a live local log always wins.
export async function pullMatchLog() {
  if (typeof window === 'undefined') return null
  if (loadMatchLog().length > 0) return null
  const rows = await getMatches(MAX_ENTRIES)
  if (!rows.length) return null
  const restored = rows.map(toEntry)
  writeMatchLog(restored)
  return restored
}
