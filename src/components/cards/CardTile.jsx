import AbilityText from './AbilityText'
import Icon from '../ui/Icon'

function CardTile({ card, selected = false, disabled = false, onClick, compact = false, actionLabel, toggleable = true, interactive = true, selectedLabel = 'IN DECK', justDeployed = false, deploying = false, evolvingSoon = false, evolutionAlert = null }) {
  const initials = card.name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 3)
  const factionName = card.organizationShortName ?? card.factionShortName ?? card.factionName
  const originGroupName = card.originGroupName
  const cardTypeName = card.cardTypeName
  const effectivePower = card.power + (card.bonus ?? 0)
  const transformed = (card.evolutionStage ?? 0) > 0 && Boolean(card.evolution)
  const multiHit = (card.evolution?.triggerHits ?? 1) >= 2
  const dormantGlow = Boolean(card.evolution) && (card.evolutionStage ?? 0) === 0 && (multiHit ? (card.evolutionWeakeningHits ?? 0) === 0 : (!card.evolution.trigger && (!card.evolution.escalate && card.evolution.cycleFrom == null || evolutionAlert === 'dormant')))
  const volatileGlow = Boolean(card.evolution?.hideStagePill) && (card.evolutionStage ?? 0) === 0
  const primed = multiHit && (card.evolutionStage ?? 0) === 0 && (card.evolutionWeakeningHits ?? 0) === (card.evolution?.triggerHits ?? 2) - 1
  const detonated = Boolean(card.detonated)
  const cardDescription = `${card.name}. Power ${effectivePower}. Faction ${factionName}. Origin ${originGroupName}. Type ${cardTypeName}. Row ${card.row}. Ability: ${card.ability}${evolvingSoon || primed ? ' About to mutate.' : ''}${transformed ? ' Transformed.' : ''}${detonated ? ' Detonated.' : ''}${volatileGlow ? ' Volatile.' : ''}`
  const rarity = card.rarity ?? 'common'
  const rarityLabel = rarity.charAt(0).toUpperCase() + rarity.slice(1)
  const CardElement = interactive ? 'button' : 'article'

  const tileClass = [
    'card-tile',
    selected ? 'card-tile--selected' : '',
    compact ? 'card-tile--compact' : '',
    justDeployed ? 'card-tile--just-deployed' : '',
    deploying ? 'card-tile--deploying' : '',
    (evolvingSoon || primed) && evolutionAlert !== 'ember' ? 'card-tile--evolving-soon' : '',
    evolutionAlert === 'ember' ? 'card-tile--evolving-ember' : '',
    transformed ? 'card-tile--transformed' : '',
    dormantGlow ? 'card-tile--dormant' : '',
    volatileGlow ? 'card-tile--volatile' : '',
    detonated ? 'card-tile--detonated' : '',
    card.factionId ? `card-tile--faction-${card.factionId}` : '',
    rarity ? `card-tile--rarity-${rarity}` : '',
  ].filter(Boolean).join(' ')

  return (
    <CardElement
      className={tileClass}
      aria-label={actionLabel ? `${actionLabel}. ${cardDescription}` : cardDescription}
      {...(interactive ? { type: 'button', disabled, 'aria-pressed': toggleable ? selected : undefined, onClick: () => onClick?.(card) } : {})}
    >
      <span className="card-art" aria-hidden="true">
        {card.artwork
          ? <img className={`card-art__image card-art__image--${card.id}${card.artworkCentered ? ' card-art__image--centered' : ''}${card.artworkFill ? ' card-art__image--fill' : ''}${card.artworkZoomedOut ? ' card-art__image--zoomed-out' : ''}${card.artworkHalfBody ? ' card-art__image--half-body' : ''}`} src={card.artwork.includes('.') ? `/images/cards/${card.artwork}` : `/images/cards/${card.artwork}.png`} alt="" loading="lazy" />
          : <span className="card-initials">{initials}</span>}
      </span>
      <strong className="card-power">{effectivePower}{card.bonus ? <small className="card-bonus">{card.bonus > 0 ? `+${card.bonus}` : card.bonus}</small> : null}</strong>
      <span className="card-tile__body">
        <span className="card-tile__meta">
          <span className="card-faction">{factionName}</span>
          <span className="card-tile__pills">
            <span className={`card-rarity card-rarity--${rarity}`}>{rarityLabel}</span>
            {card.evolution && !card.evolution.hideStagePill && (
              card.evolution.formLabels
                ? <span className="card-evolution"><Icon name="refresh" size={11} />{card.evolution.formLabels[card.evolutionStage ?? 0]}</span>
                : <span className="card-evolution"><Icon name="refresh" size={11} />G{(card.evolutionStage ?? 0) + 1}{card.evolution.stageSuffix ?? ''}</span>
            )}
            {card.evolution?.transformedLabel && (card.evolutionStage ?? 0) > 0 && (
              <span className="card-evolution card-evolution--transformed"><Icon name="warning" size={11} />{card.evolution.transformedLabel}</span>
            )}
          </span>
        </span>
        <span className="card-origin">{originGroupName}{!card.hideTypeChip && <> <span className="card-type-chip">{cardTypeName}</span></>}</span>
        <span className="card-name">{card.name}</span>
        <span className="card-ability"><AbilityText ability={card.ability} /></span>
      </span>
      {selected && <span className="card-selected-label">{selectedLabel}</span>}
    </CardElement>
  )
}

export default CardTile
