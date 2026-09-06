const jsonHeaders = { 'content-type': 'application/json' }

async function request(path, options) {
  // ponytail: 8s cap so a sleeping free-tier backend degrades to the local fallback instead of hanging the UI
  const res = await fetch(path, { ...options, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`${options?.method ?? 'GET'} ${path} -> ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

export const getSettings = () => request('/api/settings')
export const putSettings = (value) =>
  request('/api/settings', { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(value) })
export const getMatches = (limit = 10) => request(`/api/matches?limit=${limit}`)
export const postMatch = (entry) =>
  request('/api/matches', { method: 'POST', headers: jsonHeaders, body: JSON.stringify(entry) })
export const getDecks = () => request('/api/decks')
export const putDeck = (name, deck) =>
  request(`/api/decks/${encodeURIComponent(name)}`, { method: 'PUT', headers: jsonHeaders, body: JSON.stringify(deck) })
export const deleteDeck = (name) =>
  request(`/api/decks/${encodeURIComponent(name)}`, { method: 'DELETE' })
