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

function Collection({ onBack }) {
  const [viewMode, setViewMode] = useState('cards')
  const [search, setSearch] = useState('')
  const [factionId, setFactionId] = useState('all')
  const [organizationId, setOrganizationId] = useState('all')
  const [originGroupId, setOriginGroupId] = useState('all')
  const [residentEvilEntryId, setResidentEvilEntryId] = useState('all')
  const [cardType, setCardType] = useState('all')
  const [row, setRow] = useState('all')
  const [selectedRecord, setSelectedRecord] = useState(null)

  const organizationOptions = factionId === 'all' ? organizations : organizations.filter((organization) => organization.factionId === factionId)
  const originOptions = organizationId === 'all'
    ? (factionId === 'all' ? origins : origins.filter((origin) => organizationOptions.some((organization) => organization.id === origin.organizationId)))
    : origins.filter((origin) => origin.organizationId === organizationId)
  const visibleCards = useMemo(() => filterCards(cards, { search, factionId, organizationId, originGroupId, residentEvilEntryId, cardType, row }).map(getCardView), [cardType, factionId, organizationId, originGroupId, residentEvilEntryId, row, search])
  const visibleLeaders = useMemo(() => filterLeaders(leaders, { search, factionId, organizationId, originGroupId, residentEvilEntryId }).map(getLeaderView), [factionId, organizationId, originGroupId, residentEvilEntryId, search])
  const displayedRecords = viewMode === 'cards' ? visibleCards : visibleLeaders

  function handleFactionChange(nextFactionId) {
    setFactionId(nextFactionId)
    setOrganizationId('all')
    setOriginGroupId('all')
    setSelectedRecord(null)
  }

  function handleModeChange(nextMode) {
    setViewMode(nextMode)
    setSelectedRecord(null)
  }

  function handleFilterChange(setter, value) {
    setter(value)
    setSelectedRecord(null)
  }

  return (
    <ScreenShell title="Collection" eyebrow="Recovered archive" onBack={onBack}>
      <div className="collection-layout">
        <section className="collection-browser" aria-labelledby="archive-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Field archive</p>
              <h2 id="archive-title">Card Database</h2>
            </div>
            <span className="panel-count" role="status" aria-live="polite">{displayedRecords.length} records</span>
          </div>

          <div className="collection-mode" role="group" aria-label="Collection record type">
            <Button size="small" variant="secondary" ariaPressed={viewMode === 'cards'} onClick={() => handleModeChange('cards')}>Normal cards</Button>
            <Button size="small" variant="secondary" ariaPressed={viewMode === 'leaders'} onClick={() => handleModeChange('leaders')}>Leader cards</Button>
          </div>

          <div className="card-filters collection-filters">
            <SearchBar value={search} onChange={(value) => handleFilterChange(setSearch, value)} placeholder="Search archive" label={viewMode === 'cards' ? 'Search cards' : 'Search leaders'} />
            <FilterControl label="Faction" value={factionId} {...getFilterOptions(factions, 'All factions')} onChange={handleFactionChange} />
            <FilterControl label="Organization" value={organizationId} {...getFilterOptions(organizationOptions, 'All organizations')} onChange={(value) => handleFilterChange(setOrganizationId, value)} />
            <FilterControl label="Origin / group" value={originGroupId} {...getFilterOptions(originOptions, 'All origins')} onChange={(value) => handleFilterChange(setOriginGroupId, value)} />
            <FilterControl label="Entry" value={residentEvilEntryId} {...getFilterOptions(entries, 'All entries')} onChange={(value) => handleFilterChange(setResidentEvilEntryId, value)} />
            {viewMode === 'cards' && <>
              <FilterControl label="Card type" value={cardType} {...getFilterOptions(cardTypes, 'All types')} onChange={(value) => handleFilterChange(setCardType, value)} />
              <FilterControl label="Row" value={row} {...rowOptions} onChange={(value) => handleFilterChange(setRow, value)} />
            </>}
          </div>

          {viewMode === 'cards' ? (
            <CardGrid cards={visibleCards} selectedIds={selectedRecord ? [selectedRecord.id] : []} cardAction="inspect" onCardClick={setSelectedRecord} />
          ) : (
            <div className="leader-grid">
              {visibleLeaders.length > 0 ? visibleLeaders.map((leader) => <LeaderTile key={leader.id} leader={leader} selected={selectedRecord?.id === leader.id} onClick={setSelectedRecord} />) : <p className="empty-state">No leaders match the current filters.</p>}
            </div>
          )}
        </section>

        <CardDetail record={selectedRecord} kind={viewMode === 'leaders' ? 'leader' : 'card'} />
      </div>
    </ScreenShell>
  )
}

export default Collection
