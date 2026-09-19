import { useRef } from 'react'
import Button from '../ui/Button'
import CardTile from '../cards/CardTile'

function DeckPanel({ leader, cards, maxSize, onRemove, difficulty, onDifficultyChange, saveMessage, onSave, onStartMatch, canStart }) {
  const panelRef = useRef(null)

  function handleRemove(card) {
    const removedIndex = cards.findIndex((item) => item.id === card.id)
    onRemove(card)
    requestAnimationFrame(() => {
      const remainingCards = panelRef.current?.querySelectorAll('.deck-list button') ?? []
      const nextIndex = Math.min(removedIndex, remainingCards.length - 1)
      const nextCard = remainingCards[nextIndex]
      ;(nextCard ?? panelRef.current)?.focus()
    })
  }

  return (
    <section className="deck-panel" ref={panelRef} tabIndex="-1" aria-labelledby="your-deck-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Active loadout</p>
          <h2 id="your-deck-title">Your Deck</h2>
        </div>
        <strong className="deck-count">{cards.length} / {maxSize}</strong>
      </div>

      <div className="leader-card">
        <div className="leader-thumb" aria-hidden="true">
          {leader.artwork
            ? <img className="leader-thumb__image" src={leader.artwork.includes('.') ? `/images/cards/${leader.artwork}` : `/images/cards/${leader.artwork}.png`} alt="" loading="lazy" />
            : <span className="leader-thumb__initial">{leader.name[0]}</span>}
        </div>
        <div className="leader-card__body">
          <p className="card-faction">{leader.factionName} / {leader.version}</p>
          <strong className="leader-card__name">{leader.name}</strong>
          <p className="leader-card__ability"><strong>{leader.ability}</strong> {leader.description}</p>
        </div>
      </div>

      <div className="deck-list">
        {cards.map((card) => (
          <CardTile key={card.id} card={card} compact toggleable={false} actionLabel={`Remove ${card.name} from deck`} onClick={handleRemove} />
        ))}
        {cards.length === 0 && <p className="empty-state">Add cards from the collection.</p>}
      </div>

      <div className="deck-actions">
        <div className="difficulty-picker">
          <label htmlFor="difficulty-select">AI difficulty</label>
          <select id="difficulty-select" value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)}>
            <option value="recruit">Recruit</option>
            <option value="veteran">Veteran</option>
            <option value="nemesis">Nemesis</option>
          </select>
        </div>
        <Button label="Save Deck" variant="secondary" size="small" disabled={!canStart} onClick={onSave} />
        <Button label="Open Battle Board" size="small" disabled={!canStart} onClick={onStartMatch} />
        {saveMessage && <p className="save-message" role="status">{saveMessage}</p>}
      </div>
    </section>
  )
}

export default DeckPanel
