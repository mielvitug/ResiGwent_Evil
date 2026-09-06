import AbilityText from './AbilityText'

function LeaderTile({ leader, selected = false, onClick, compact = false }) {
  const status = leader.isSelectable ? 'Selectable leader' : 'Leader slot unresolved'

  return (
    <button
      className={`leader-tile${selected ? ' leader-tile--selected' : ''}${compact ? ' leader-tile--compact' : ''}`}
      type="button"
      disabled={!leader.isSelectable}
      aria-pressed={selected}
      aria-label={`${leader.name}, ${leader.version}. ${status}. Ability: ${leader.ability}`}
      onClick={() => onClick?.(leader)}
    >
      <span className="leader-tile__art" aria-hidden="true">
        {leader.artwork
          ? <img className="leader-tile__image" src={leader.artwork.includes('.') ? `/images/cards/${leader.artwork}` : `/images/cards/${leader.artwork}.png`} alt="" loading="lazy" />
          : 'L'}
      </span>
      <span className="leader-tile__body">
        <span className="card-faction">{leader.factionName}</span>
        <strong>{leader.name}</strong>
        <span className="leader-ability">{compact ? leader.version : <AbilityText ability={leader.ability} />}</span>
      </span>
      {!compact && <span className="leader-status">{leader.isSelectable ? 'READY' : 'TBD'}</span>}
    </button>
  )
}

export default LeaderTile
