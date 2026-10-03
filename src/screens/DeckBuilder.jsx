import { useEffect, useMemo, useState } from 'react'
import CardGrid from '../components/cards/CardGrid'
import DeckPanel from '../components/deck/DeckPanel'
import LeaderSelectPanel from '../components/deck/LeaderSelectPanel'
import FilterControl from '../components/filters/FilterControl'
import SearchBar from '../components/filters/SearchBar'
import ScreenShell from '../components/layout/ScreenShell'
import { cards, factions, leaders, entries, organizations } from '../data/catalog.js'
import { filterCards, getCardView, getFilterOptions, getLeaderView } from '../data/catalogQueries.js'
import { rowOptions } from '../data/rows.js'
import { DIFFICULTY_ORDER } from '../game/difficulty.js'
import { getDecks, putDeck } from '../api/client.js'

const MIN_DECK_SIZE = 3
const MAX_DECK_SIZE = 25
const STORAGE_KEY = 'resigwent-evil-loadout'
const SERVER_DECK_NAME = 'default'
const DIFFICULTY_IDS = new Set(DIFFICULTY_ORDER)

function getDefaultLeaderId(factionId) {
  return leaders.find((leader) => leader.factionId === factionId && leader.isDefault && leader.isSelectable)?.id
    ?? leaders.find((leader) => leader.factionId === factionId && leader.isSelectable)?.id
}

function getStarterDeckIds(factionId) {
  return cards.filter((card) => card.factionId === factionId).slice(0, MIN_DECK_SIZE).map((card) => card.id)
}

function validateLoadout(saved) {
  const factionId = factions.some((faction) => faction.id === saved?.factionId) ? saved.factionId : factions[0].id
  const validDeckIds = Array.isArray(saved?.deckIds)
    ? [...new Set(saved.deckIds)].filter((id) => cards.some((card) => card.id === id && card.factionId === factionId)).slice(0, MAX_DECK_SIZE)
    : []
  const factionLeaders = leaders.filter((leader) => leader.factionId === factionId)
  const validLeaderId = factionLeaders.some((leader) => leader.id === saved?.leaderId && leader.isSelectable)
    ? saved.leaderId
    : factionLeaders.find((leader) => leader.isDefault && leader.isSelectable)?.id
  const difficulty = DIFFICULTY_IDS.has(saved?.difficulty) ? saved.difficulty : 'veteran'

  return { factionId, deckIds: validDeckIds, leaderId: validLeaderId, difficulty }
}

function getSavedLoadout() {
  if (typeof window === 'undefined') return null

  try {
    return validateLoadout(JSON.parse(window.localStorage.getItem(STORAGE_KEY)))
  } catch {
    return null
  }
}

// Fresh-device signal, read before the autosave effect below writes the key.
function hasLocalLoadout() {
  if (typeof window === 'undefined') return true

  try {
    return window.localStorage.getItem(STORAGE_KEY) != null
  } catch {
    return true
  }
}

function DeckBuilder({ onBack, onStartMatch }) {
  const [savedLoadout] = useState(getSavedLoadout)
  const [selectedFactionId, setSelectedFactionId] = useState(savedLoadout?.factionId ?? factions[0].id)
  const [selectedLeaderId, setSelectedLeaderId] = useState(savedLoadout?.leaderId ?? getDefaultLeaderId(savedLoadout?.factionId ?? factions[0].id))
  const [deckIds, setDeckIds] = useState(savedLoadout?.deckIds?.length ? savedLoadout.deckIds : getStarterDeckIds(savedLoadout?.factionId ?? factions[0].id))
  const [difficulty, setDifficulty] = useState(savedLoadout?.difficulty ?? 'veteran')
  const [search, setSearch] = useState('')
  const [organizationId, setOrganizationId] = useState('all')
  const [residentEvilEntryId, setResidentEvilEntryId] = useState('all')
  const [row, setRow] = useState('all')
  const [sort, setSort] = useState('default')
  const [saveMessage, setSaveMessage] = useState('')
  const [hadLocalLoadout] = useState(hasLocalLoadout)

  const faction = factions.find((item) => item.id === selectedFactionId) ?? factions[0]
  const factionLeaders = leaders.filter((leader) => leader.factionId === selectedFactionId)
  const leader = leaders.find((item) => item.id === selectedLeaderId) ?? factionLeaders[0]
  const factionOrganizations = organizations.filter((organization) => organization.factionId === selectedFactionId)
  const factionCards = useMemo(() => cards.filter((card) => card.factionId === selectedFactionId), [selectedFactionId])
  const deckCards = useMemo(() => deckIds.map((id) => factionCards.find((card) => card.id === id)).filter(Boolean).map(getCardView), [deckIds, factionCards])
  const leaderView = getLeaderView(leader)

  const filteredCards = useMemo(() => {
    const filtered = filterCards(factionCards, {
      search,
      organizationId,
      residentEvilEntryId,
      row,
    })

    const sorters = {
      'power-desc': (a, b) => b.power - a.power,
      'power-asc': (a, b) => a.power - b.power,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    const sorter = sorters[sort]

    return (sorter ? [...filtered].sort(sorter) : filtered).map(getCardView)
  }, [factionCards, organizationId, residentEvilEntryId, row, search, sort])

  function persistLoadout() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ factionId: selectedFactionId, leaderId: selectedLeaderId, deckIds, difficulty }))
      return true
    } catch {
      return false
    }
  }

  useEffect(() => {
    persistLoadout()
  })

  useEffect(() => {
    // Restore-only: a fresh device hydrates from the server deck once; live local state always wins.
    if (hadLocalLoadout) return undefined
    let cancelled = false
    getDecks()
      .then((decks) => {
        if (cancelled) return
        const remote = decks.find((deck) => deck.name === SERVER_DECK_NAME)
        if (!remote) return
        const validated = validateLoadout({
          factionId: remote.faction_id,
          leaderId: remote.leader_id,
          deckIds: remote.card_ids,
          difficulty: remote.difficulty,
        })
        setSelectedFactionId(validated.factionId)
        setSelectedLeaderId(validated.leaderId)
        setDeckIds(validated.deckIds.length ? validated.deckIds : getStarterDeckIds(validated.factionId))
        setDifficulty(validated.difficulty)
        setSaveMessage('Loadout restored from server.')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [hadLocalLoadout])

  function handleFactionChange(nextFactionId) {
    const nextLeader = leaders.find((item) => item.factionId === nextFactionId && item.isDefault && item.isSelectable)
      ?? leaders.find((item) => item.factionId === nextFactionId && item.isSelectable)
    setSelectedFactionId(nextFactionId)
    setSelectedLeaderId(nextLeader?.id)
    setDeckIds(getStarterDeckIds(nextFactionId))
    setOrganizationId('all')
    setResidentEvilEntryId('all')
    setCardType('all')
    setRow('all')
    setSaveMessage('')
  }

  function handleCardClick(card) {
    if (deckIds.includes(card.id)) return
    if (deckIds.length >= MAX_DECK_SIZE) {
      setSaveMessage(`Deck limit reached: ${MAX_DECK_SIZE} cards.`)
      return
    }

    setDeckIds((currentIds) => [...currentIds, card.id])
    setSaveMessage('')
  }

  function handleRemove(card) {
    setDeckIds((currentIds) => currentIds.filter((id) => id !== card.id))
    setSaveMessage('')
  }

  async function handleSave() {
    if (deckIds.length < MIN_DECK_SIZE) {
      setSaveMessage(`Add at least ${MIN_DECK_SIZE} cards before saving.`)
      return
    }

    if (!persistLoadout()) {
      setSaveMessage('Unable to save this loadout in the current browser session.')
      return
    }
    try {
      await putDeck(SERVER_DECK_NAME, {
        faction_id: selectedFactionId,
        leader_id: selectedLeaderId,
        card_ids: deckIds,
        difficulty,
      })
      setSaveMessage(`Loadout saved with ${deckIds.length} cards (server + local).`)
    } catch {
      setSaveMessage(`Loadout saved locally with ${deckIds.length} cards.`)
    }
  }

  function handleStartMatch() {
    if (deckIds.length < MIN_DECK_SIZE) {
      setSaveMessage(`Add at least ${MIN_DECK_SIZE} cards before deployment.`)
      return
    }

    persistLoadout()
    onStartMatch({ faction, leader: leaderView, cards: deckCards, difficulty })
  }

  return (
    <ScreenShell title="Deck Builder" eyebrow={`${faction.name} armory`} onBack={onBack}>
      <div className="deck-builder-layout">
        <LeaderSelectPanel
          factions={factions}
          factionId={selectedFactionId}
          leaderId={leader.id}
          onFactionChange={handleFactionChange}
          onLeaderChange={(id) => { setSelectedLeaderId(id); setSaveMessage('') }}
        />

        <section className="collection-panel" aria-labelledby="collection-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Faction loadout</p>
              <h2 id="collection-title">Card Collection</h2>
            </div>
            <span className="panel-count" role="status" aria-live="polite">{filteredCards.length} files</span>
          </div>

          <p className="faction-identity">{faction.identity}</p>

          <div className="card-filters">
            <SearchBar value={search} onChange={setSearch} />
            <FilterControl label="Organization" value={organizationId} {...getFilterOptions(factionOrganizations, 'All organizations')} onChange={setOrganizationId} />
            <FilterControl label="Entry" value={residentEvilEntryId} {...getFilterOptions(entries, 'All entries')} onChange={setResidentEvilEntryId} />
            <FilterControl label="Row" value={row} {...rowOptions} onChange={setRow} />
            <FilterControl label="Sort" value={sort} options={['default', 'power-desc', 'power-asc', 'name']} optionLabels={{ default: 'Default', 'power-desc': 'Power ↓', 'power-asc': 'Power ↑', name: 'Name A-Z' }} onChange={setSort} />
          </div>

          <CardGrid cards={filteredCards} selectedIds={deckIds} onCardClick={handleCardClick} />
        </section>

        <DeckPanel
          leader={leaderView}
          cards={deckCards}
          maxSize={MAX_DECK_SIZE}
          onRemove={handleRemove}
          difficulty={difficulty}
          factionId={selectedFactionId}
          onDifficultyChange={(val) => { setDifficulty(val); setSaveMessage('') }}
          saveMessage={saveMessage}
          onSave={handleSave}
          onStartMatch={handleStartMatch}
          canStart={deckIds.length >= MIN_DECK_SIZE}
        />
      </div>
    </ScreenShell>
  )
}

export default DeckBuilder
