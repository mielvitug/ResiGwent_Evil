import { useEffect, useRef } from 'react'
import AbilityText from './AbilityText'

function DetailArt({ record, variant = '' }) {
  return (
    <div className={`dialog-art${variant ? ` ${variant}` : ''}`} aria-hidden="true">
      {record.artwork
        ? <img className={`dialog-art__image${record.artworkCentered ? ' card-art__image--centered' : ''}${record.artworkZoomedOut ? ' card-art__image--zoomed-out' : ''}`} src={record.artwork.includes('.') ? `/images/cards/${record.artwork}` : `/images/cards/${record.artwork}.png`} alt="" />
        : record.name.split(' ').map((word) => word[0]).join('').slice(0, 3)}
    </div>
  )
}

function EvolutionInfo({ evolution }) {
  if (!evolution) return null
  const labels = evolution.formLabels ?? evolution.stages.map((_, i) => `Form ${i + 1}`)
  const powers = evolution.stages.map((stage) => stage.power).join(' → ')
  const condition = evolution.triggerHits
    ? `Mutates after ${evolution.triggerHits} weakenings`
    : evolution.every
      ? `Mutates every ${evolution.every} turns`
      : 'Mutates in battle'
  return (
    <div className="dialog-ability dialog-mutation">
      <strong>Mutation</strong>
      <p>{labels.join(' → ')} · {powers} · {condition}.</p>
    </div>
  )
}

function CardDetail({ record, kind = 'card', positionLabel, onClose, onPrev, onNext, hasPrev, hasNext }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    dialogRef.current?.focus()
    document.body.style.overflow = 'hidden'
    function handleKey(event) {
      if (event.key === 'Escape') onClose?.()
      else if (event.key === 'ArrowLeft') onPrev?.()
      else if (event.key === 'ArrowRight') onNext?.()
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose, onPrev, onNext])

  if (!record) return null

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        ref={dialogRef}
        className="card-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${record.name} card details`}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-topbar">
          <span className="dialog-position" aria-live="polite">{positionLabel}</span>
          <button type="button" className="dialog-close" onClick={onClose} aria-label="Close card details">✕</button>
        </div>
        <div className="dialog-body">
          {hasPrev && <button type="button" className="dialog-nav dialog-nav--prev" onClick={onPrev} aria-label="View previous card">‹</button>}
          <DetailArt record={record} variant={kind === 'leader' ? 'dialog-art--leader' : ''} />
          <div className="dialog-info">
            {kind === 'leader' ? (
              <>
                <p className="eyebrow">Leader file / {record.factionName}</p>
                <h2>{record.name}</h2>
                <p className="detail-version">{record.version}</p>
                <dl className="detail-list">
                  <div><dt>Entry</dt><dd>{record.residentEvilEntryName ?? 'Pending'}</dd></div>
                  <div><dt>Origin</dt><dd>{record.originGroupName}</dd></div>
                  {record.affiliatedOrganizationIds?.length > 0 && <div><dt>Organization</dt><dd>{record.organizationDisplayName}</dd></div>}
                  <div><dt>Classification</dt><dd>{record.cardTypeName ?? 'Flexible / TBD'}</dd></div>
                  <div><dt>Availability</dt><dd>{record.isSelectable ? 'Selectable' : 'TBD'}</dd></div>
                </dl>
                <div className="dialog-ability"><strong>Once per match</strong><p><AbilityText ability={record.ability} /></p></div>
              </>
            ) : (
              <>
                <p className="eyebrow">{record.organizationName}</p>
                <h2>{record.name}</h2>
                <div className="detail-power">{record.power}</div>
                <dl className="detail-list">
                  <div><dt>Faction</dt><dd>{record.factionName}</dd></div>
                  <div><dt>Origin / group</dt><dd>{record.originGroupName}</dd></div>
                  <div><dt>Entry</dt><dd>{record.residentEvilEntryName}</dd></div>
                  <div><dt>Card type</dt><dd>{record.cardTypeName}</dd></div>
                  <div><dt>Row</dt><dd>{record.row}</dd></div>
                  <div><dt>Rarity</dt><dd>{record.rarity}</dd></div>
                  {record.metadata?.loreAffiliation && <div><dt>Lore note</dt><dd>{record.metadata.loreAffiliation}</dd></div>}
                </dl>
                <div className="dialog-ability"><strong>Ability</strong><p><AbilityText ability={record.ability} /></p></div>
                <EvolutionInfo evolution={record.evolution} />
              </>
            )}
          </div>
          {hasNext && <button type="button" className="dialog-nav dialog-nav--next" onClick={onNext} aria-label="View next card">›</button>}
        </div>
      </div>
    </div>
  )
}

export default CardDetail
