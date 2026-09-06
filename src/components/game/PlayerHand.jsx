import CardTile from '../cards/CardTile'
import { formatCount } from '../../utils/formatCount.js'

function PlayerHand({ cards, onPlay, disabled, selectedCardId, deployingCardId }) {
  return (
    <section className="player-hand" aria-labelledby="hand-title">
      <div className="hand-heading">
        <div>
          <p className="eyebrow">Available cards</p>
          <h2 id="hand-title">Your Hand</h2>
        </div>
        <span>{formatCount(cards.length, 'card')}</span>
      </div>
      <div className="hand-cards">
        {cards.length > 0 ? cards.map((card) => (
          <CardTile
            key={card.id}
            card={card}
            disabled={disabled}
            selected={selectedCardId === card.id || deployingCardId === card.id}
            selectedLabel={deployingCardId === card.id ? 'DEPLOYING…' : selectedCardId === card.id ? 'STAGED' : undefined}
            deploying={deployingCardId === card.id}
            actionLabel={`Play ${card.name} to ${card.row}`}
            onClick={onPlay}
          />
        )) : <p className="empty-state">No cards remain. Pass Round to end your participation.</p>}
      </div>
    </section>
  )
}

export default PlayerHand
