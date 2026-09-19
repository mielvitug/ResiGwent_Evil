import FilterControl from '../filters/FilterControl'
import { getFilterOptions, getLeaderView } from '../../data/catalogQueries.js'
import { leaders } from '../../data/catalog.js'

function LeaderSelectPanel({ factions, factionId, leaderId, onFactionChange, onLeaderChange }) {
  const factionLeaders = leaders.filter((leader) => leader.factionId === factionId)
  const selectedLeader = getLeaderView(factionLeaders.find((leader) => leader.id === leaderId) ?? factionLeaders[0])
  const leaderOptions = {
    options: factionLeaders.map((leader) => leader.id),
    optionLabels: Object.fromEntries(factionLeaders.map((leader) => [leader.id, `${leader.name} — ${leader.version}`])),
  }

  return (
    <section className="leader-select-panel" aria-labelledby="leader-select-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Command</p>
          <h2 id="leader-select-title">Leader</h2>
        </div>
      </div>

      <FilterControl label="Select Main Faction" value={factionId} {...getFilterOptions(factions, 'Select faction')} disabledOptions={['all']} onChange={onFactionChange} />

      <FilterControl label="Select Faction Leader" value={selectedLeader.id} {...leaderOptions} disabledOptions={factionLeaders.filter((leader) => !leader.isSelectable).map((leader) => leader.id)} onChange={onLeaderChange} />

      <div className="leader-portrait" aria-live="polite">
        <div className="leader-portrait__art" aria-hidden="true">
          {selectedLeader.artwork
            ? <img className={`leader-portrait__image${selectedLeader.portraitZoomedIn ? ' leader-portrait__image--zoomed-in' : selectedLeader.portraitDso ? ' leader-portrait__image--dso' : selectedLeader.portraitWesker ? ' leader-portrait__image--wesker' : selectedLeader.portraitJill ? ' leader-portrait__image--jill' : selectedLeader.portraitFbi ? ' leader-portrait__image--fbi' : selectedLeader.portraitBsaChris ? ' leader-portrait__image--bsaa-chris' : selectedLeader.halfBody ? ' half-body' : selectedLeader.portraitZoomedOut ? ' leader-portrait__image--zoomed-out' : selectedLeader.portraitZoomed ? ' leader-portrait__image--zoomed' : selectedLeader.portraitContain ? ' leader-portrait__image--contain' : ''}`} src={selectedLeader.artwork.includes('.') ? `/images/cards/${selectedLeader.artwork}` : `/images/cards/${selectedLeader.artwork}.png`} alt="" loading="lazy" />
            : <span className="leader-portrait__initial">{selectedLeader.name[0]}</span>}
          {!selectedLeader.artwork && <span className="card-art-label">ART PLACEHOLDER</span>}
        </div>
        <div className="leader-portrait__body">
          <span className="card-faction">{selectedLeader.factionName}</span>
          <strong>{selectedLeader.name}</strong>
          {!selectedLeader.affiliatedOrganizationIds?.length && (
            <span className="leader-version">{selectedLeader.version}</span>
          )}
          {selectedLeader.affiliatedOrganizationIds?.length > 0 && (
            <span className="leader-version">{selectedLeader.organizationDisplayName}</span>
          )}
          <span className="leader-ability"><strong>{selectedLeader.ability}</strong> {selectedLeader.description}</span>
        </div>
      </div>

    </section>
  )
}

export default LeaderSelectPanel
