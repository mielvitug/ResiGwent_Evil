import { useEffect, useRef, useState } from 'react'
import CardTile from '../cards/CardTile'
import { evolutionPreview } from '../../game/gameRules.js'

function GameRow({ rowType, cards, score, isPlayerRow, justDeployedIds = [], evolutionClock = 0 }) {
  const [hit, setHit] = useState(false)
  const prevScore = useRef(score)

  useEffect(() => {
    if (score < prevScore.current) {
      setHit(true)
      const id = setTimeout(() => setHit(false), 650)
      prevScore.current = score
      return () => clearTimeout(id)
    }
    prevScore.current = score
  }, [score])

  return (
    <section className={`game-row game-row--${isPlayerRow ? 'player' : 'opponent'}${hit ? ' game-row--hit' : ''}`} aria-label={`${isPlayerRow ? 'Player' : 'Opponent'} ${rowType} card row`}>
      <header className="game-row__header">
        <span className="row-name">{rowType}</span>
        <span className="row-owner">{isPlayerRow ? 'YOU' : 'AI'}</span>
        <strong className="row-score">{score}</strong>
      </header>
      <div className="game-row__cards">
        {cards.length > 0 ? cards.map((card) => {
          const evolution = card.evolution
          const unevolvedTimed = Boolean(evolution) && !evolution.trigger
          const cycleLen = evolution?.firstAt ?? evolution?.every ?? 2
          const upcoming = unevolvedTimed ? evolutionPreview(card, evolutionClock + 1) : null
          const wouldChange = upcoming !== null && upcoming !== (card.evolutionStage ?? 0)
          const remaining = cycleLen - (evolutionClock % cycleLen)
          const evolutionAlert = !unevolvedTimed
            ? null
            : wouldChange
              ? ((card.evolutionStage ?? 0) === 0 && evolution.cycleFrom != null ? 'ember' : 'soon')
              : (remaining === 2 && (evolution.escalate || evolution.cycleFrom != null) ? 'dormant' : null)
          return <CardTile key={card.id} card={card} compact interactive={false} justDeployed={justDeployedIds.includes(card.id)} evolvingSoon={evolutionAlert === 'soon' || evolutionAlert === 'ember'} evolutionAlert={evolutionAlert} />
        }) : <span className="empty-row">No cards deployed</span>}
      </div>
    </section>
  )
}

export default GameRow
