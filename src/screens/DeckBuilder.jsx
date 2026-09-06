import { useEffect, useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import CardGrid from '../components/cards/CardGrid'
import DeckPanel from '../components/deck/DeckPanel'
import LeaderSelectPanel from '../components/deck/LeaderSelectPanel'
import FilterControl from '../components/filters/FilterControl'
import SearchBar from '../components/filters/SearchBar'
import ScreenShell from '../components/layout/ScreenShell'
import { cards, factions, leaders, origins, entries, cardTypes, organizations } from '../data/catalog.js'
import { filterCards, getCardView, getFilterOptions, getLeaderView } from '../data/catalogQueries.js'
import { rowOptions } from '../data/rows.js'

const MIN_DECK_SIZE = 3
const MAX_DECK_SIZE = 25
const STORAGE_KEY = 'resigwent-evil-loadout'
const DIFFICULTY_IDS = new Set(['recruit', 'veteran', 'nemesis'])

function getDefaultLeaderId(factionId) {
  return leaders.find((leader) => leader.factionId === factionId && leader.isDefault && leader.isSelectable)?.id
    ?? leaders.find((leader) => leader.factionId === factionId && leader.isSelectable)?.id
}

function getStarterDeckIds(factionId) {
  return cards.filter((card) => card.factionId === factionId).slice(0, MIN_DECK_SIZE).map((card) => card.id)
}

function getSavedLoadout() {
  if (typeof window === 'undefined') return null

  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
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
  } catch {
    return null
  }
}

function DeckBuilder({ onBack, onStartMatch }) {
  const [savedLoadout] = useState(getSavedLoadout)
  const [selectedFactionId, setSelectedFactionId] = useState(savedLoadout?.factionId ?? factions[0].id)
  const [selectedLeaderId, setSelectedLeaderId] = useState(savedLoadout?.leaderId ?? getDefaultLeaderId(savedLoadout?.factionId ?? factions[0].id))
  const [deckIds, setDeckIds] = useState(savedLoadout?.deckIds?.length ? savedLoadout.deckIds : getStarterDeckIds(savedLoadout?.factionId ?? factions[0].id))
  const [difficulty, setDifficulty] = useState(savedLoadout?.difficulty ?? 'veteran')
  const [search, setSearch] = useState('')
  const [originGroupId, setOriginGroupId] = useState('all')
  const [organizationId, setOrganizationId] = useState('all')
  const [residentEvilEntryId, setResidentEvilEntryId] = useState('all')
  const [cardType, setCardType] = useState('all')
  const [row, setRow] = useState('all')
  const [sort, setSort] = useState('default')
  const [saveMessage, setSaveMessage] = useState('')

  const faction = factions.find((item) => item.id === selectedFactionId) ?? factions[0]
  const factionLeaders = leaders.filter((leader) => leader.factionId === selectedFactionId)
  const leader = leaders.find((item) => item.id === selectedLeaderId) ?? factionLeaders[0]
  const factionOrganizations = organizations.filter((organization) => organization.factionId === selectedFactionId)
  const factionOrigins = organizationId === 'all'
    ? origins.filter((origin) => factionOrganizations.some((organization) => organization.id === origin.organizationId))
    : origins.filter((origin) => origin.organizationId === organizationId)
  const factionCards = useMemo(() => cards.filter((card) => card.factionId === selectedFactionId), [selectedFactionId])
  const deckCards = useMemo(() => deckIds.map((id) => factionCards.find((card) => card.id === id)).filter(Boolean).map(getCardView), [deckIds, factionCards])
  const leaderView = getLeaderView(leader)

  const filteredCards = useMemo(() => {
    const filtered = filterCards(factionCards, {
      search,
      organizationId,
      originGroupId,
      residentEvilEntryId,
      cardType,
      row,
    })

    const sorters = {
      'power-desc': (a, b) => b.power - a.power,
      'power-asc': (a, b) => a.power - b.power,
      name: (a, b) => a.name.localeCompare(b.name),
    }
    const sorter = sorters[sort]

    return (sorter ? [...filtered].sort(sorter) : filtered).map(getCardView)
  }, [cardType, factionCards, organizationId, originGroupId, residentEvilEntryId, row, search, sort])

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

  function handleFactionChange(nextFactionId) {
    const nextLeader = leaders.find((item) => item.factionId === nextFactionId && item.isDefault && item.isSelectable)
      ?? leaders.find((item) => item.factionId === nextFactionId && item.isSelectable)
    setSelectedFactionId(nextFactionId)
    setSelectedLeaderId(nextLeader?.id)
    setDeckIds(getStarterDeckIds(nextFactionId))
    setOrganizationId('all')
    setOriginGroupId('all')
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

  function handleSave() {
    if (deckIds.length < MIN_DECK_SIZE) {
      setSaveMessage(`Add at least ${MIN_DECK_SIZE} cards before saving.`)
      return
    }

    setSaveMessage(persistLoadout() ? `Loadout saved locally with ${deckIds.length} cards.` : 'Unable to save this loadout in the current browser session.')
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
            <FilterControl label="Origin / group" value={originGroupId} {...getFilterOptions(factionOrigins, 'All origins')} onChange={setOriginGroupId} />
            <FilterControl label="Entry" value={residentEvilEntryId} {...getFilterOptions(entries, 'All entries')} onChange={setResidentEvilEntryId} />
            <FilterControl label="Card type" value={cardType} {...getFilterOptions(cardTypes, 'All types')} onChange={setCardType} />
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
