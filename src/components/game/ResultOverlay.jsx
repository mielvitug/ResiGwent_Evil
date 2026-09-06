import Button from '../ui/Button'
import { useModalDialog } from '../../hooks/useModalDialog.js'

function getRoundLabel(winner) {
  return winner === 'draw' ? 'Drawn' : winner === 'player' ? 'Won' : 'Lost'
}

function ResultOverlay({ result, matchResult, roundHistory, playerWins, opponentWins, onContinue, onReturn }) {
  const { primaryButtonRef, trapFocus } = useModalDialog()

  if (!result) return null

  const matchTitle = matchResult ? (matchResult.winner === 'draw' ? 'Stalemate' : matchResult.winner === 'player' ? 'Mission Complete' : 'You Died') : null
  const matchSummary = matchResult
    ? matchResult.winner === 'draw'
      ? 'Neither force secured the zone. Command recalls both teams.'
      : matchResult.winner === 'player'
        ? 'Your field team held the containment zone across the operation.'
        : 'The opposing force overwhelmed the containment zone.'
    : null

  return (
    <div className="result-backdrop">
      <section className="result-overlay" role="dialog" aria-modal="true" aria-labelledby="result-title" onKeyDown={trapFocus}>
        {matchResult ? (
          <>
            <p className="eyebrow">Operation resolved</p>
            <h2 id="result-title" className={matchResult.winner === 'opponent' ? 'result-title--defeat' : undefined}>{matchTitle}</h2>
            <p>{matchSummary}</p>
            <div className="result-scores">
              <div><span>Your rounds</span><strong>{playerWins}</strong></div>
              <div><span>Opponent rounds</span><strong>{opponentWins}</strong></div>
            </div>
            <ul className="result-history" aria-label="Round history">
              {roundHistory.map((round) => (
                <li key={round.round}>
                  <span>Round {round.round}</span>
                  <strong className={round.winner === 'player' ? 'history-win' : round.winner === 'opponent' ? 'history-loss' : 'history-draw'}>{getRoundLabel(round.winner)}</strong>
                  <small>{round.playerScore} - {round.opponentScore}</small>
                </li>
              ))}
            </ul>
            <Button label="Return to Command Center" buttonRef={primaryButtonRef} onClick={onReturn} />
          </>
        ) : (
          <>
            <p className="eyebrow">Round {result.round} resolved</p>
            <h2 id="result-title">{getRoundLabel(result.winner) === 'Drawn' ? 'Round Draw' : `Round ${getRoundLabel(result.winner).toLowerCase()}`}</h2>
            <p>{getRoundLabel(result.winner) === 'Won' ? 'Your field team takes the round.' : getRoundLabel(result.winner) === 'Lost' ? 'The opposing force takes the round.' : 'Both sides leave the field with equal strength.'}</p>
            <div className="result-scores">
              <div><span>Your score</span><strong>{result.playerScore}</strong></div>
              <div><span>Opponent score</span><strong>{result.opponentScore}</strong></div>
            </div>
            <div className="result-actions">
              <Button label={`Deploy for Round ${result.round + 1}`} buttonRef={primaryButtonRef} size="large" variant="primary" onClick={onContinue} />
              <Button label="Quit to Main Menu" variant="secondary" size="small" onClick={onReturn} />
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ResultOverlay
