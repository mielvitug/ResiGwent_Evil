import { useMemo, useState } from 'react'
import CardDetail from '../components/cards/CardDetail'
import CardGrid from '../components/cards/CardGrid'
import LeaderTile from '../components/cards/LeaderTile'
import FilterControl from '../components/filters/FilterControl'
import SearchBar from '../components/filters/SearchBar'
import ScreenShell from '../components/layout/ScreenShell'
import Button from '../components/ui/Button'
import { cardTypes, cards, entries, factions, leaders, organizations, origins } from '../data/catalog.js'
import { filterCards, filterLeaders, getCardView, getFilterOptions, getLeaderView } from '../data/catalogQueries.js'
import { rowOptions } from '../data/rows.js'

const rarityRank = { common: 0, uncommon: 1, rare: 2, legendary: 3 }
const sortOptions = ['name', 'power', 'rarity']
const sortLabels = { name: 'Name', power: 'Power', rarity: 'Rarity' }

function sortRecords(records, sort) {
  const sorted = [...records]
  if (sort === 'power') sorted.sort((a, b) => (b.power ?? 0) - (a.power ?? 0) || a.name.localeCompare(b.name))
  else if (sort === 'rarity') sorted.sort((a, b) => (rarityRank[b.rarity] ?? 0) - (rarityRank[a.rarity] ?? 0) || a.name.localeCompare(b.name))
  else sorted.sort((a, b) => a.name.localeCompare(b.name))
  return sorted
}

function Collection({ onBack }) {
  const [viewMode, setViewMode] = useState('cards')
  const [search, setSearch] = useState('')
  const [factionId, setFactionId] = useState('all')
  const [organizationId, setOrganizationId] = useState('all')
  const [originGroupId, setOriginGroupId] = useState('all')
  const [residentEvilEntryId, setResidentEvilEntryId] = useState('all')
  const [cardType, setCardType] = useState('all')
  const [row, setRow] = useState('all')
  const [sort, setSort] = useState('name')
  const [selectedId, setSelectedId] = useState(null)

  const organizationOptions = factionId === 'all' ? organizations : organizations.filter((organization) => organization.factionId === factionId)
  const originOptions = organizationId === 'all'
    ? (factionId === 'all' ? origins : origins.filter((origin) => organizationOptions.some((organization) => organization.id === origin.organizationId)))
    : origins.filter((origin) => origin.organizationId === organizationId)
  const visibleCards = useMemo(() => filterCards(cards, { search, factionId, organizationId, originGroupId, residentEvilEntryId, cardType, row }).map(getCardView), [cardType, factionId, organizationId, originGroupId, residentEvilEntryId, row, search])
  const visibleLeaders = useMemo(() => filterLeaders(leaders, { search, factionId, organizationId, originGroupId, residentEvilEntryId }).map(getLeaderView), [factionId, organizationId, originGroupId, residentEvilEntryId, search])
  const displayedRecords = useMemo(() => sortRecords(viewMode === 'cards' ? visibleCards : visibleLeaders, sort), [sort, viewMode, visibleCards, visibleLeaders])
  const selectedIndex = selectedId ? displayedRecords.findIndex((record) => record.id === selectedId) : -1
  const selectedRecord = selectedIndex >= 0 ? displayedRecords[selectedIndex] : null

  function handleFactionChange(nextFactionId) {
    setFactionId(nextFactionId)
    setOrganizationId('all')
    setOriginGroupId('all')
  }

  function handleModeChange(nextMode) {
    setViewMode(nextMode)
    setSelectedId(null)
  }

  return (
    <ScreenShell title="Collection" eyebrow="Recovered archive" onBack={onBack}>
      <section className="collection-browser" aria-labelledby="archive-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Field archive</p>
            <h2 id="archive-title">Card Database</h2>
          </div>
          <span className="panel-count" role="status" aria-live="polite">{displayedRecords.length} records</span>
        </div>

        <div className="collection-mode" role="group" aria-label="Collection record type">
            <Button size="small" variant="secondary" label="Unit cards" ariaPressed={viewMode === 'cards'} onClick={() => handleModeChange('cards')} />
            <Button size="small" variant="secondary" label="Leader cards" ariaPressed={viewMode === 'leaders'} onClick={() => handleModeChange('leaders')} />
        </div>

        <div className="card-filters collection-filters">
          <SearchBar value={search} onChange={setSearch} placeholder="Search archive" label={viewMode === 'cards' ? 'Search cards' : 'Search leaders'} />
          <FilterControl label="Faction" value={factionId} {...getFilterOptions(factions, 'All factions')} onChange={handleFactionChange} />
          <FilterControl label="Organization" value={organizationId} {...getFilterOptions(organizationOptions, 'All organizations')} onChange={setOrganizationId} />
          <FilterControl label="Origin / group" value={originGroupId} {...getFilterOptions(originOptions, 'All origins')} onChange={setOriginGroupId} />
          <FilterControl label="Entry" value={residentEvilEntryId} {...getFilterOptions(entries, 'All entries')} onChange={setResidentEvilEntryId} />
          {viewMode === 'cards' && <>
            <FilterControl label="Card type" value={cardType} {...getFilterOptions(cardTypes, 'All types')} onChange={setCardType} />
            <FilterControl label="Row" value={row} {...rowOptions} onChange={setRow} />
          </>}
          <FilterControl label="Sort" value={sort} options={sortOptions} optionLabels={sortLabels} onChange={setSort} />
        </div>

        {viewMode === 'cards' ? (
          <div className="collection-grid">
            <CardGrid cards={displayedRecords} selectedIds={selectedRecord ? [selectedRecord.id] : []} cardAction="inspect" onCardClick={(card) => setSelectedId(card.id)} />
          </div>
        ) : (
          <div className="leader-grid">
            {displayedRecords.length > 0 ? displayedRecords.map((leader) => <LeaderTile key={leader.id} leader={leader} selected={selectedRecord?.id === leader.id} onClick={(record) => setSelectedId(record.id)} />) : <p className="empty-state">No leaders match the current filters.</p>}
          </div>
        )}
      </section>

      {selectedRecord && (
        <CardDetail
          record={selectedRecord}
          kind={viewMode === 'leaders' ? 'leader' : 'card'}
          positionLabel={`${selectedIndex + 1} of ${displayedRecords.length}`}
          onClose={() => setSelectedId(null)}
          onPrev={selectedIndex > 0 ? () => setSelectedId(displayedRecords[selectedIndex - 1].id) : undefined}
          onNext={selectedIndex < displayedRecords.length - 1 ? () => setSelectedId(displayedRecords[selectedIndex + 1].id) : undefined}
          hasPrev={selectedIndex > 0}
          hasNext={selectedIndex < displayedRecords.length - 1}
        />
      )}
    </ScreenShell>
  )
}

export default Collection
