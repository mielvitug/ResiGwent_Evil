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

export function recordMatch(entry) {
  if (typeof window === 'undefined') return

  try {
    const log = [{ ...entry, at: new Date().toISOString() }, ...loadMatchLog()].slice(0, MAX_ENTRIES)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log))
  } catch {
    // Storage unavailable; the operation log stays session-scoped.
  }
}
