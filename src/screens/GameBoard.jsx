import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import GameRow from '../components/game/GameRow'
import LeaderPanel from '../components/game/LeaderPanel'
import MulliganPanel from '../components/game/MulliganPanel'
import PlayerHand from '../components/game/PlayerHand'
import ResultOverlay from '../components/game/ResultOverlay'
import ScoreDisplay from '../components/game/ScoreDisplay'
import { createOpponentLoadout } from '../game/opponent.js'
import { useSfx } from '../audio/useSfx.js'
import { formatCount } from '../utils/formatCount.js'
import { shuffleDeck } from '../utils/shuffleDeck.js'
import { recordMatch } from '../log/matchLog.js'
import { loadSettings, applyAnimationPreference } from '../settings/settingsStore.js'
import { ROWS, activateLeaderAbility, confirmMulligan, createMatchState, finishRound, getRowScore, getTotalScore, playPlayerCard, passPlayer, resolveOpponentTurn, startNextRound, toggleMulliganCard } from '../game/gameRules.js'

function GameBoard({ loadout, onReturn }) {
  const playSfx = useSfx()
  const announcedRound = useRef(null)
  const loggedMatch = useRef(false)
  const [opponent] = useState(() => {
    const opponentLoadout = createOpponentLoadout(loadout.faction.id)
    return { ...opponentLoadout, cards: shuffleDeck(opponentLoadout.cards) }
  })
  const [game, setGame] = useState(() => createMatchState({ ...loadout, cards: shuffleDeck(loadout.cards) }, opponent, { difficulty: loadout.difficulty }))
  const [pendingCard, setPendingCard] = useState(null)
  const [settings] = useState(loadSettings)
  const { confirmPlay } = settings
  const [deploying, setDeploying] = useState(null)
  const [justDeployedIds, setJustDeployedIds] = useState([])
  const gameRef = useRef(game)
  gameRef.current = game
  const timers = useRef([])
  const playerDeployMs = settings.animations ? 1000 : 0
  const aiDeployMs = settings.animations ? 2000 : 0

  function later(ms, fn) {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }

  function clearTimers() {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  function tagNewcomers(before, after) {
    const seen = new Set([...Object.values(before.playerRows).flat(), ...Object.values(before.opponentRows).flat()].map((card) => card.id))
    return [...Object.values(after.playerRows).flat(), ...Object.values(after.opponentRows).flat()].map((card) => card.id).filter((id) => !seen.has(id))
  }

  function collectStages(state) {
    const stages = new Map()
    for (const card of [...state.playerHand, ...state.playerDrawPile, ...Object.values(state.playerRows).flat(), ...state.opponentHand, ...state.opponentDrawPile, ...Object.values(state.opponentRows).flat()]) {
      if (card.evolution) stages.set(card.id, card.evolutionStage ?? 0)
    }
    return stages
  }

  function tagEvolved(before, after) {
    const was = collectStages(before)
    const ids = []
    for (const [id, stage] of collectStages(after)) {
      if (was.has(id) && stage > was.get(id)) ids.push(id)
    }
    return ids
  }

  useEffect(() => clearTimers, [])

  useEffect(() => {
    applyAnimationPreference(settings)
  }, [settings])

  const matchEntry = useMemo(() => game.matchResult
    ? {
        faction: game.playerFaction.name,
        opponent: game.opponentFaction.name,
        difficulty: game.difficulty,
        rounds: `${game.playerWins}-${game.opponentWins}`,
        outcome: game.matchResult.winner,
      }
    : null, [game.difficulty, game.matchResult, game.opponentFaction, game.opponentWins, game.playerFaction, game.playerWins])

  useEffect(() => {
    if (!matchEntry || loggedMatch.current) return
    loggedMatch.current = true
    recordMatch(matchEntry)
  }, [matchEntry])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      const target = event.target
      if (target instanceof HTMLElement && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (game.phase !== 'battle' || game.result) return

      const key = event.key.toLowerCase()
      if (key === 'escape' && pendingCard) {
        setPendingCard(null)
        return
      }
      if (!isPlayerTurn) return

      if (key === 'p') {        handlePass()
      } else if (key === 'l') {
        handleLeaderAbility()
      } else if (/^[0-9]$/.test(key)) {
        const card = game.playerHand[key === '0' ? 9 : Number(key) - 1]
        if (card) handlePlay(card)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })

  const playerScore = getTotalScore(game.playerRows, game.playerRowBonuses)
  const opponentScore = getTotalScore(game.opponentRows, game.opponentRowBonuses)
  const isPlayerTurn = game.turn === 'player' && !game.playerPassed && !game.result && !deploying

  useEffect(() => {
    if (!game.result || announcedRound.current === game.result.round) return
    announcedRound.current = game.result.round
    playSfx(game.result.winner === 'player' ? 'roundWon' : game.result.winner === 'opponent' ? 'roundLost' : 'pass')
  }, [game.result, playSfx])

  function commitPlay(card) {
    if (deploying) return
    setPendingCard(null)
    setDeploying({ side: 'player', cardId: card.id })
    later(playerDeployMs, () => {
      const played = playPlayerCard(gameRef.current, card.id, card.row)
      if (played.error) {
        setDeploying(null)
        setGame(played)
        return
      }
      playSfx('deploy')
      setJustDeployedIds((ids) => [...ids, card.id].slice(-6))
      if (played.turn !== 'opponent' || played.opponentPassed || played.result) {
        setDeploying(null)
        setGame(played)
        return
      }
      setGame(played)
      setDeploying({ side: 'opponent', cardId: null })
      later(aiDeployMs, () => {
        const before = gameRef.current
        const next = resolveOpponentTurn(before)
        setJustDeployedIds((ids) => [...ids, ...tagNewcomers(played, next), ...tagEvolved(before, next)].slice(-8))
        setDeploying(null)
        playSfx('deploy')
        setGame(next)
      })
    })
  }

  function handlePlay(card) {
    if (deploying) return
    if (confirmPlay) {
      setPendingCard((current) => current?.id === card.id ? null : card)
      return
    }

    commitPlay(card)
  }

  function handlePass() {
    if (deploying) return
    let nextState = resolveOpponentTurn(passPlayer(game))
    setJustDeployedIds((ids) => [...ids, ...tagNewcomers(game, nextState), ...tagEvolved(game, nextState)].slice(-8))

    if (nextState.playerPassed && nextState.opponentPassed) nextState = finishRound(nextState)
    else playSfx('pass')
    if (nextState.result) setPendingCard(null)
    setGame(nextState)
  }

  function handleLeaderAbility() {
    const next = activateLeaderAbility(game)
    if (!next.error && next.leaderUsed) playSfx('leader')
    setGame(next)
  }

  function handleContinue() {
    setPendingCard(null)
    clearTimers()
    setDeploying(null)
    setJustDeployedIds([])
    setGame(startNextRound(game))
  }

  function handleMulliganToggle(cardId) {
    setGame(toggleMulliganCard(game, cardId))
  }

  function handleMulliganConfirm() {
    setGame(confirmMulligan(game))
  }

  function renderBattlefieldSide(isPlayer, faction, rows, rowBonuses, handCount, totalScore) {
    const sideRows = isPlayer ? game.playerRows : game.opponentRows
    const sideKey = isPlayer ? 'player' : 'opponent'
    const factionClass = faction.id === 'bioterrorism' ? 'faction--bioterrorism' : faction.id === 'counterforce' ? 'faction--counterforce' : ''

    return (
      <div className={`battlefield-side battlefield-side--${sideKey}`}>
        <div className={`side-label side-label--${sideKey}`}>
          <span>{isPlayer ? 'PLAYER' : 'OPPONENT'}</span>
          <strong className={factionClass}>{faction.shortName ?? faction.uiName ?? faction.name}</strong>
          <small>{formatCount(handCount, 'card')} {isPlayer ? 'in hand' : 'hidden'}</small>
          <ScoreDisplay label="Total" score={totalScore} tone={faction.id === 'bioterrorism' ? 'bioterrorism' : faction.id === 'counterforce' ? 'counterforce' : isPlayer ? 'player' : 'opponent'} />
        </div>
        <div className="side-rows">
          {rows.map((row) => (
            <GameRow
              key={`${sideKey}-${row}`}
              rowType={row}
              cards={sideRows[row]}
              score={getRowScore(sideRows[row], rowBonuses[row])}
              isPlayerRow={isPlayer}
              justDeployedIds={justDeployedIds}
              evolutionClock={game.evolutionClock ?? 0}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="game-board-screen" inert={game.phase === 'mulligan' || game.result}>
      <header className="game-hud">
        <div>
          <p className="eyebrow">Containment zone / round {game.round} / {game.difficulty}</p>
          <h1>Battle Board</h1>
        </div>
        <div className="game-hud__status" aria-live="polite">
          <span className={`${isPlayerTurn ? 'turn-indicator turn-indicator--active' : 'turn-indicator'}${deploying?.side === 'opponent' ? ' turn-indicator--thinking' : ''}`}>{deploying?.side === 'opponent' ? 'AI deploying' : deploying ? 'Deploying…' : game.playerPassed ? 'You passed' : 'Your turn'}</span>
          <Button variant="ghost" size="small" icon="close" onClick={onReturn}>Quit to Menu</Button>
        </div>
      </header>

      <section className="battlefield" aria-label="Three-row battlefield">
        <div className="battlefield-leaders">
          <LeaderPanel leader={game.opponentLeader} used={true} disabled={true} />
          <LeaderPanel leader={game.playerLeader} used={game.leaderUsed} onUse={handleLeaderAbility} />
        </div>
        <div className="battlefield-center">
          {renderBattlefieldSide(false, game.opponentFaction, ROWS.slice().reverse(), game.opponentRowBonuses, game.opponentHand.length, opponentScore)}
          <div className="battle-divider" aria-hidden="true"><span>VS</span></div>
          {renderBattlefieldSide(true, game.playerFaction, ROWS, game.playerRowBonuses, game.playerHand.length, playerScore)}
        </div>
      </section>

      <section className="battle-controls">
        <PlayerHand cards={game.playerHand} onPlay={handlePlay} disabled={!isPlayerTurn} selectedCardId={pendingCard?.id} deployingCardId={deploying?.side === 'player' ? deploying.cardId : null} />
        <div className="battle-actions">
          <div className="action-score">
            <div className="action-score__row">
              <span className="action-score__label">{game.opponentFaction.shortName}</span>
              <strong className={`action-score__value action-score__value--${game.opponentFaction.id}`}>{opponentScore}</strong>
            </div>
            <div className="action-score__row">
              <span className="action-score__label">{game.playerFaction.shortName}</span>
              <strong className={`action-score__value action-score__value--${game.playerFaction.id}`}>{playerScore}</strong>
            </div>
          </div>
          {pendingCard && isPlayerTurn ? (
            <div className="confirm-play" role="group" aria-label="Confirm card deployment">
              <p>Deploy <strong>{pendingCard.name}</strong> to {pendingCard.row}?</p>
              <Button label="Confirm" size="small" variant="primary" onClick={() => commitPlay(pendingCard)} />
              <Button label="Cancel" size="small" variant="ghost" icon="close" onClick={() => setPendingCard(null)} />
            </div>
          ) : (
            <Button size="small" label="Pass Round" variant="primary" disabled={!isPlayerTurn} onClick={handlePass} />
          )}
          {game.error && <p className="game-error" role="alert">{game.error}</p>}
          <p className="hotkey-hints" aria-hidden="true"><kbd>0-9</kbd> play · <kbd>P</kbd> pass · <kbd>L</kbd> leader · <kbd>Esc</kbd> cancel</p>
        </div>
      </section>

      </main>
      {game.phase === 'mulligan' && (
        <MulliganPanel
          hand={game.playerHand}
          drawPileCount={game.playerDrawPile.length}
          selectedIds={game.mulliganIds}
          onToggle={handleMulliganToggle}
          onConfirm={handleMulliganConfirm}
          onAbort={onReturn}
        />
      )}
      {game.result && (
        <ResultOverlay
          result={game.result}
          matchResult={game.matchResult}
          roundHistory={game.roundHistory}
          playerWins={game.playerWins}
          opponentWins={game.opponentWins}
          onContinue={handleContinue}
          onReturn={onReturn}
        />
      )}
    </>
  )
}

export default GameBoard
