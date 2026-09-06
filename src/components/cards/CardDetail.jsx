import AbilityText from './AbilityText'

function DetailArt({ record, variant = '' }) {  return (
    <div className={`detail-art${variant ? ` ${variant}` : ''}`} aria-hidden="true">
      {record.artwork
        ? <img className={`detail-art__image${record.artworkCentered ? ' card-art__image--centered' : ''}${record.artworkZoomedOut ? ' card-art__image--zoomed-out' : ''}`} src={record.artwork.includes('.') ? `/images/cards/${record.artwork}` : `/images/cards/${record.artwork}.png`} alt="" loading="lazy" />
        : record.name.split(' ').map((word) => word[0]).join('').slice(0, 3)}
    </div>
  )
}

function CardDetail({ record, kind = 'card' }) {
  if (!record) {
    return (
      <aside className="card-detail card-detail--empty" aria-label="Card details">
        <p className="eyebrow">Field file</p>
        <h2>Select a card</h2>
        <p>Choose a recovered file to inspect its faction, origin, entry, and ability data.</p>
      </aside>
    )
  }

  if (kind === 'leader') {
    return (
      <aside className="card-detail card-detail--leader" aria-label={`${record.name} leader details`}>
        <DetailArt record={record} variant="detail-art--leader" />
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
        <div className="detail-ability"><strong>Once per match</strong><p><AbilityText ability={record.ability} /></p></div>
      </aside>
    )
  }

  return (
    <aside className="card-detail" aria-label={`${record.name} card details`}>
      <DetailArt record={record} />
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
      <div className="detail-ability"><strong>Ability</strong><p><AbilityText ability={record.ability} /></p></div>
    </aside>
  )
}

export default CardDetail
