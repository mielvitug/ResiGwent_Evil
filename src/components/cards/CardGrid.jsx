import CardTile from './CardTile'

function CardGrid({ cards, selectedIds = [], onCardClick, cardAction = 'add', emptyMessage = 'No cards match the current filters.' }) {
  if (cards.length === 0) {
    return <p className="empty-state">{emptyMessage}</p>
  }

  return (
    <div className="card-grid">
      {cards.map((card) => <GridCard key={card.id} card={card} selected={selectedIds.includes(card.id)} cardAction={cardAction} onCardClick={onCardClick} />)}
    </div>
  )
}

function GridCard({ card, selected, cardAction, onCardClick }) {
  const isAddAction = cardAction === 'add'
  const actionLabel = isAddAction
    ? (selected ? `Already in deck: ${card.name}` : `Add ${card.name} to deck`)
    : `Inspect ${card.name}`

  return <CardTile card={card} selected={selected} disabled={isAddAction && selected} toggleable={isAddAction} actionLabel={actionLabel} onClick={onCardClick} />
}

export default CardGrid
