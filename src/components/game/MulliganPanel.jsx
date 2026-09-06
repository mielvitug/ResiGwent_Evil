import Button from '../ui/Button'
import CardTile from '../cards/CardTile'
import { useModalDialog } from '../../hooks/useModalDialog.js'
import { formatCount } from '../../utils/formatCount.js'

function MulliganPanel({ hand, drawPileCount, selectedIds, onToggle, onConfirm, onAbort }) {
  const { primaryButtonRef, trapFocus } = useModalDialog()

  return (
    <div className="result-backdrop">
      <section className="result-overlay mulligan-overlay" role="dialog" aria-modal="true" aria-labelledby="mulligan-title" onKeyDown={trapFocus}>
        <p className="eyebrow">Briefing / loadout check</p>
        <h2 id="mulligan-title">Initial Deployment</h2>
        <p>
          Select any operatives you want to redeploy. Swapped cards move to the bottom of your reserves
          and are replaced from the top. You get one redeployment window per operation.
        </p>

        <div className="hand-cards mulligan-cards">
          {hand.map((card) => (
            <CardTile
              key={card.id}
              card={card}
              selected={selectedIds.includes(card.id)}
              selectedLabel="REDEPLOY"
              actionLabel={`${selectedIds.includes(card.id) ? 'Keep' : 'Redeploy'} ${card.name}`}
              onClick={() => onToggle(card.id)}
            />
          ))}
        </div>

        <p className="mulligan-status" role="status" aria-live="polite">
          {formatCount(selectedIds.length, 'card')} selected for redeployment / {formatCount(drawPileCount, 'card')} in reserve
        </p>

        <div className="result-actions">
          <Button label="Begin Operation" buttonRef={primaryButtonRef} size="large" variant="primary" onClick={onConfirm} />
          <Button label="Abort Operation" variant="secondary" size="small" onClick={onAbort} />
        </div>
      </section>
    </div>
  )
}

export default MulliganPanel
