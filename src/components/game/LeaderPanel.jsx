import Button from '../ui/Button'

function LeaderPanel({ leader, used, onUse, disabled }) {
  return (
    <section className="game-leader" aria-labelledby="leader-title">
      <div className="leader-art-container">
        {leader.artwork
          ? <img className={`leader-art${leader.halfBody ? ' leader-art--contain' : ''}${leader.id === 'stars-wesker-captain' ? ' leader-art--wesker' : ''}${leader.id === 'stars-jill-valentine' ? ' leader-art--jill' : ''}${leader.id === 'rpd-leon-kennedy' ? ' leader-art--leon' : ''}${leader.id === 'umbrella-hunk' ? ' leader-art--hunk' : ''}${leader.id === 'illuminados-saddler' ? ' leader-art--saddler' : ''}`} src={(leader.battleArtwork || leader.artwork).includes('.') ? `/images/cards/${leader.battleArtwork || leader.artwork}` : `/images/cards/${leader.battleArtwork || leader.artwork}.png`} alt="" loading="lazy" />
          : <span className="leader-art__fallback" aria-hidden="true">{leader.name[0]}</span>}
      </div>
      <div className="game-leader__info">
        <p className="eyebrow">{leader.factionShortName ?? leader.factionName}</p>
        <h2 id="leader-title">{leader.name}</h2>
        <p className="leader-version">{leader.version}</p>
        <p className="leader-ability"><strong>{leader.ability}</strong> {leader.description}</p>
      </div>
      <div className="leader-controls">
        <span className={`leader-state${used ? ' leader-state--used' : ''}`}>{used ? 'USED' : disabled ? 'PENDING' : 'READY'}</span>
        <Button size="small" label={disabled ? 'Ability pending' : 'Use ability'} variant="primary" disabled={used || disabled} onClick={onUse} />
      </div>
    </section>
  )
}

export default LeaderPanel
