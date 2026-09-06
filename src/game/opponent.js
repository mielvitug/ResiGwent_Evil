import { cards, factions, leaders } from '../data/catalog.js'
import { getCardView, getLeaderView } from '../data/catalogQueries.js'

const AI_DECK_SIZE = 18

function opposingFactionId(playerFactionId) {
  return playerFactionId === 'counterforce' ? 'bioterrorism' : 'counterforce'
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function chooseOpponentLeader(factionId) {
  const selectable = leaders.filter((leader) => leader.factionId === factionId && leader.isSelectable)
  return pickRandom(selectable)
}

function pickRandomCards(factionId, count) {
  const factionCards = cards.filter((card) => card.factionId === factionId)
  const shuffled = [...factionCards].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count).map(getCardView)
}

export function createOpponentLoadout(playerFactionId) {
  const faction = factions.find((faction) => faction.id === opposingFactionId(playerFactionId)) ?? factions[0]
  const leader = chooseOpponentLeader(faction.id)

  return {
    faction,
    leader: getLeaderView(leader),
    cards: pickRandomCards(faction.id, AI_DECK_SIZE),
  }
}
