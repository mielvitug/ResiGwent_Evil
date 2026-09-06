import { leaderEffects } from './leaderEffects.js'
import { rows } from '../data/rows.js'
import { cards } from '../data/catalog.js'

export const ROWS = rows
export const HAND_SIZE = 13
export const WINS_NEEDED = 2
export const MAX_ROUNDS = 3
export const DRAW_PER_ROUND = 3

const AI_TEMPO_LEAD = 8
const AI_BANK_LEAD = 5
const AI_BANK_HAND_MAX = 2

export const AI_PROFILES = {
  recruit: { handDelta: -1, tempoLead: Infinity, bankLead: Infinity, bankHandMax: 0 },
  veteran: { handDelta: 0, tempoLead: AI_TEMPO_LEAD, bankLead: AI_BANK_LEAD, bankHandMax: AI_BANK_HAND_MAX },
  nemesis: { handDelta: 1, tempoLead: 5, bankLead: 3, bankHandMax: 3 },
}

function aiLead(state) {
  return getTotalScore(state.opponentRows, state.opponentRowBonuses) - getTotalScore(state.playerRows, state.playerRowBonuses)
}

function aiProfile(state) {
  return AI_PROFILES[state.difficulty] ?? AI_PROFILES.veteran
}

function createRows() {
  return Object.fromEntries(ROWS.map((row) => [row, []]))
}

function createRowValues(defaultValue = 0) {
  return Object.fromEntries(ROWS.map((row) => [row, defaultValue]))
}

function cloneRows(rows) {
  return Object.fromEntries(ROWS.map((row) => [row, [...(rows[row] ?? [])]]))
}

export function getRowScore(cards = [], rowBonus = 0) {
  return cards.reduce((score, card) => score + card.power + (card.bonus ?? 0), rowBonus)
}

export function getTotalScore(rows, rowBonuses = {}) {
  return ROWS.reduce((score, row) => score + getRowScore(rows[row], rowBonuses[row]), 0)
}

function splitForHand(cards, limit = HAND_SIZE) {
  return { hand: cards.slice(0, limit), drawPile: cards.slice(limit) }
}

function evolutionMax(card) {
  return card.evolution.stages.length - 1
}

// ponytail: the stage a timed card would move to at a given clock, or null (supports firstAt delay and cycleFrom wrap; standard cards behave as before)
export function evolutionPreview(card, clock) {
  const evolution = card.evolution
  if (!evolution) return null
  const stage = card.evolutionStage ?? 0
  const stageSpec = evolution.stages[stage] ?? {}
  // ponytail: timed exit is per-stage (Gideon 2nd form) falling back to card cadence for pure timed cards; trigger-only stages never fire here
  const every = stageSpec.every ?? (evolution.trigger ? undefined : (evolution.every ?? 2))
  if (every === undefined) return null
  const firstAt = stageSpec.firstAt ?? evolution.firstAt ?? every
  if (clock < firstAt || (clock - firstAt) % every !== 0) return null
  const max = evolution.stages.length - 1
  const next = stage + 1
  return next > max ? (evolution.cycleFrom ?? max) : next
}

function applyEvolutionStage(card, stage) {
  const capped = Math.max(0, Math.min(evolutionMax(card), stage))
  const form = card.evolution.stages[capped]
  return { ...card, evolutionStage: capped, power: form.power, artwork: form.artwork, ability: form.ability ?? card.ability }
}

function ageOwnedEvolution(state) {
  const clock = state.evolutionClock ?? 0
  // ponytail: stage mutateEffects (Miranda) and recurring card effects (Sturm) fire after aging, threaded owner-side through the shared applier
  const pending = []
  const age = (cards, row, owner) => cards.map((card) => {
    // ponytail: one schedule or several (Wesker pulse); firstAt offsets the first fire, defaulting to 0 (Sturm unchanged)
    const schedules = Array.isArray(card.recurring) ? card.recurring : card.recurring ? [card.recurring] : []
    schedules.forEach((schedule) => {
      const firstAt = schedule.firstAt ?? 0
      if (clock >= firstAt && (clock - firstAt) % schedule.every === 0) pending.push({ card, row, owner, effect: schedule.effect })
    })
    const next = evolutionPreview(card, clock)
    if (next === null || next === (card.evolutionStage ?? 0)) return card
    const evolved = applyEvolutionStage(card, next)
    // ponytail: hits are per-stage — reset on advance like the trigger path
    const aged = card.evolution?.trigger ? { ...evolved, evolutionWeakeningHits: 0 } : evolved
    // ponytail: one mutateEffect or several (T-501 Super State) fan out in text order
    const entryEffects = [card.evolution.stages[next].mutateEffect, ...(card.evolution.stages[next].mutateEffects ?? [])].filter(Boolean)
    entryEffects.forEach((entryEffect) => pending.push({ card: aged, row, owner, effect: entryEffect }))
    return aged
  })
  const ageRows = (rows, owner) => Object.fromEntries(ROWS.map((row) => [row, age(rows[row] ?? [], row, owner)]))
  // ponytail: rows only - hand/draw piles never mutate, only deployed cards age
  const agedState = {
    ...state,
    playerRows: ageRows(state.playerRows, 'player'),
    opponentRows: ageRows(state.opponentRows, 'opponent'),
  }
  const withAging = ratchetWeakening(pending.reduce((nextState, item) => applyOneEffect(nextState, item.card, item.row, item.owner, item.effect), agedState))
  // ponytail: age-pass weakenings (flames, spider/acid mutate effects) wake weakened-mutation cards exactly like play-chain ones
  return evolveWeakened(evolveWeakened(withAging, 'playerRows'), 'opponentRows')
}

// ponytail: trigger cards calibrate their weakening baseline at deploy (post-boost, incl. row bonus) so a deployment bonus doesn't swallow the first scorch
function calibrateWeakening(rows, rowBonuses, row, cardId) {
  const nextRows = cloneRows(rows)
  nextRows[row] = nextRows[row].map((card) => card.id === cardId && card.evolution?.trigger
    ? { ...card, evolutionWeakeningSeen: (card.bonus ?? 0) + rowBonuses[row] }
    : card)
  return nextRows
}

// ponytail: ratchet trigger baselines up after boosts land so later weakenings still count; never ratchets down, so uncounted drops are preserved for the evolve check
function ratchetWeakening(state) {
  const ratchetRows = (rows, rowBonuses) => Object.fromEntries(ROWS.map((row) => [row, (rows[row] ?? []).map((card) => {
    if (card.evolution?.trigger !== 'when-weakened' || card.evolutionWeakeningSeen === undefined) return card
    const weakening = (card.bonus ?? 0) + rowBonuses[row]
    return weakening > card.evolutionWeakeningSeen ? { ...card, evolutionWeakeningSeen: weakening } : card
  })]))
  return { ...state, playerRows: ratchetRows(state.playerRows, state.playerRowBonuses), opponentRows: ratchetRows(state.opponentRows, state.opponentRowBonuses) }
}

function evolveWeakened(state, rowsKey) {

  const rowBonusesKey = rowsKey === 'playerRows' ? 'playerRowBonuses' : 'opponentRowBonuses'
  const owner = rowsKey === 'playerRows' ? 'player' : 'opponent'
  // ponytail: stage mutateEffects fire on trigger-path advances too (Gideon), threaded like the timed path
  const pending = []
  const rows = state[rowsKey]
  const rowBonuses = state[rowBonusesKey]
  const evolved = Object.fromEntries(ROWS.map((row) => [
    row,
    (rows[row] ?? []).map((card) => {
      if (card.evolution?.trigger !== 'when-weakened') return card
      const weakening = (card.bonus ?? 0) + rowBonuses[row]
      const seen = card.evolutionWeakeningSeen ?? 0
      const hits = card.evolutionWeakeningHits ?? 0
      const struck = weakening < seen ? hits + 1 : hits
      const next = { ...card, evolutionWeakeningSeen: weakening, evolutionWeakeningHits: struck }
      const stage = card.evolutionStage ?? 0
      if (!(struck >= (card.evolution.triggerHits ?? 1) && stage < evolutionMax(card))) return next
      const aged = applyEvolutionStage(next, stage + 1)
      // ponytail: hits are per-stage — reset on advance so satisfied counters can't auto-advance again without fresh weakenings
      const reset = { ...aged, evolutionWeakeningHits: 0 }
      const entryEffects = [card.evolution.stages[stage + 1].mutateEffect, ...(card.evolution.stages[stage + 1].mutateEffects ?? [])].filter(Boolean)
      entryEffects.forEach((entryEffect) => pending.push({ card: reset, row, owner, effect: entryEffect }))
      return reset
    }),
  ]))
  const withEvolved = { ...state, [rowsKey]: evolved }
  return ratchetWeakening(pending.reduce((nextState, item) => applyOneEffect(nextState, item.card, item.row, item.owner, item.effect), withEvolved))
}

function detonateWeakened(state, rowsKey) {
  const rowBonusesKey = rowsKey === 'playerRows' ? 'playerRowBonuses' : 'opponentRowBonuses'
  const opposingRowsKey = rowsKey === 'playerRows' ? 'opponentRows' : 'playerRows'
  const rows = state[rowsKey]
  const rowBonuses = state[rowBonusesKey]
  let opposingRows = state[opposingRowsKey]
  const detonated = Object.fromEntries(ROWS.map((row) => [
    row,
    (rows[row] ?? []).map((card) => {
      const scorched = !card.detonated && card.effect?.type === 'deathburst' && ((card.bonus ?? 0) < 0 || rowBonuses[row] < 0)
      if (!scorched) return card
      const pool = ROWS.flatMap((targetRow) => opposingRows[targetRow].filter((foe) => !foe.immune).map((foe) => ({ row: targetRow, cardId: foe.id })))
      // ponytail: same idiom as damage-random-opponent — pool is tiny, Math.random matches opponent.js
      const shuffled = [...pool].sort(() => Math.random() - 0.5)
      const picks = Math.min(card.effect.count ?? 1, shuffled.length)
      for (let i = 0; i < picks; i++) {
        opposingRows = addBonusToCard(opposingRows, shuffled[i].row, shuffled[i].cardId, -card.effect.amount)
      }
      return { ...card, power: 0, bonus: 0, detonated: true }
    }),
  ]))
  return { ...state, [rowsKey]: detonated, [opposingRowsKey]: opposingRows }
}

function passTurnToPlayer(state) {
  const clock = (state.evolutionClock ?? 0) + 1
  const next = { ...state, turn: 'player', evolutionClock: clock }
  return ageOwnedEvolution(next)
}

function resetEvolution(cards) {
  return cards.map((card) => card.evolution ? { ...applyEvolutionStage(card, 0), evolutionWeakeningSeen: 0, evolutionWeakeningHits: 0 } : card)
}

function drawCards(hand, drawPile, count) {
  const nextHand = [...hand]
  const nextPile = [...drawPile]

  for (let drawn = 0; drawn < count && nextPile.length > 0; drawn++) {
    nextHand.push(nextPile.shift())
  }

  return { hand: nextHand, drawPile: nextPile }
}

function redrawCards(hand, drawPile, cardIds) {
  const nextHand = [...hand]
  const nextPile = [...drawPile]

  for (const cardId of cardIds) {
    const replacement = nextPile.shift()
    if (!replacement) break
    const cardIndex = nextHand.findIndex((card) => card.id === cardId)
    if (cardIndex === -1) {
      nextPile.unshift(replacement)
      continue
    }
    nextPile.push(nextHand[cardIndex])
    nextHand[cardIndex] = replacement
  }

  return { hand: nextHand, drawPile: nextPile }
}

export function createMatchState(playerLoadout, opponentLoadout, options = {}) {
  const difficulty = AI_PROFILES[options.difficulty] ? options.difficulty : 'veteran'
  const opponentLimit = HAND_SIZE + AI_PROFILES[difficulty].handDelta
  const playerSplit = splitForHand(resetEvolution(playerLoadout.cards))
  const opponentSplit = splitForHand(resetEvolution(opponentLoadout.cards), opponentLimit)

  return {
    round: 1,
    phase: 'mulligan',
    difficulty,
    turn: 'player',
    evolutionClock: 0,
    playerFaction: playerLoadout.faction,
    playerLeader: playerLoadout.leader,
    opponentFaction: opponentLoadout.faction,
    opponentLeader: opponentLoadout.leader,
    playerHand: playerSplit.hand,
    playerDrawPile: playerSplit.drawPile,
    opponentHand: opponentSplit.hand,
    opponentDrawPile: opponentSplit.drawPile,
    playerRows: createRows(),
    opponentRows: createRows(),
    playerRowBonuses: createRowValues(),
    opponentRowBonuses: createRowValues(),
    playerPassed: false,
    opponentPassed: false,
    leaderUsed: false,
    playerWins: 0,
    opponentWins: 0,
    roundHistory: [],
    mulliganIds: [],
    result: null,
    matchResult: null,
    error: '',
  }
}

function addBonusToRow(rows, row, amount) {
  const nextRows = cloneRows(rows)
  nextRows[row] = nextRows[row].map((card) => ({ ...card, bonus: (card.bonus ?? 0) + amount }))
  return nextRows
}

function addBonusToCard(rows, row, cardId, amount) {
  const nextRows = cloneRows(rows)
  nextRows[row] = nextRows[row].map((card) => card.id === cardId ? { ...card, bonus: (card.bonus ?? 0) + amount } : card)
  return nextRows
}

function addBonusToMatchingCards(rows, predicate, amount) {
  const nextRows = cloneRows(rows)
  ROWS.forEach((row) => {
    nextRows[row] = nextRows[row].map((card) => predicate(card) ? { ...card, bonus: (card.bonus ?? 0) + amount } : card)
  })
  return nextRows
}

function addBonusToRows(rowBonuses, targetRows, amount) {
  return Object.fromEntries(ROWS.map((row) => [row, rowBonuses[row] + (targetRows.includes(row) ? amount : 0)]))
}

function findLowestScoreRow(rows, rowBonuses = {}) {
  const occupiedRows = ROWS.filter((row) => rows[row].length > 0)
  return occupiedRows.reduce((lowestRow, row) => getRowScore(rows[row], rowBonuses[row]) < getRowScore(rows[lowestRow], rowBonuses[lowestRow]) ? row : lowestRow, occupiedRows[0] ?? null)
}

function findHighestScoreRow(rows, rowBonuses = {}) {
  const occupiedRows = ROWS.filter((row) => rows[row].length > 0)
  return occupiedRows.reduce((highestRow, row) => getRowScore(rows[row], rowBonuses[row]) > getRowScore(rows[highestRow], rowBonuses[highestRow]) ? row : highestRow, occupiedRows[0] ?? null)
}

function findStrongestCard(rows, predicate) {
  let strongest = null
  ROWS.forEach((row) => {
    rows[row].forEach((card) => {
      const power = card.power + (card.bonus ?? 0)
      if (predicate(card) && (!strongest || power > strongest.power)) strongest = { row, cardId: card.id, power }
    })
  })
  return strongest
}

function findWeakestCard(rows) {
  let weakest = null
  ROWS.forEach((row) => {
    rows[row].forEach((card) => {
      const power = card.power + (card.bonus ?? 0)
      if (!weakest || power < weakest.power) weakest = { row, cardId: card.id, power }
    })
  })
  return weakest
}

function applyCardEffect(state, card, targetRow, owner = 'player') {
  // ponytail: single effect plus optional extras array (Saddler) — threaded in order, back-compat for single-effect cards
  return [card.effect, ...(card.effects ?? [])].filter(Boolean).reduce(
    (nextState, effect) => applyOneEffect(nextState, card, targetRow, owner, effect),
    state,
  )
}

function applyOneEffect(state, card, targetRow, owner, effect) {
  const ownRowsKey = owner === 'player' ? 'playerRows' : 'opponentRows'
  const opposingRowsKey = owner === 'player' ? 'opponentRows' : 'playerRows'
  const ownRows = state[ownRowsKey]
  const opposingRows = state[opposingRowsKey]

  if (effect.condition === 'opponent-bow' && !Object.values(opposingRows).flat().some((item) => item.cardType === 'bow')) return state
  if (effect.condition === 'hand-at-most-2' && state[owner === 'player' ? 'playerHand' : 'opponentHand'].length > 2) return state

  if (effect.type === 'boost-row') {
    return { ...state, [ownRowsKey]: addBonusToRow(ownRows, targetRow, effect.amount) }
  }

  if (effect.type === 'boost-self') {
    return { ...state, [ownRowsKey]: addBonusToCard(ownRows, targetRow, card.id, effect.amount) }
  }

  if (effect.type === 'reset-self') {
    // ponytail: Wesker pulse — clears own card bonus (row auras live elsewhere, untouched); incidental ally buffs go too, accepted for the loop
    const resetRows = cloneRows(ownRows)
    resetRows[targetRow] = resetRows[targetRow].map((ally) => ally.id === card.id ? { ...ally, bonus: 0 } : ally)
    return { ...state, [ownRowsKey]: resetRows }
  }

  if (effect.type === 'weaken-opponent-row') {
    const highestRow = findHighestScoreRow(opposingRows, state[opposingRowsKey === 'playerRows' ? 'playerRowBonuses' : 'opponentRowBonuses'])
    const opposingBonusesKey = opposingRowsKey === 'playerRows' ? 'playerRowBonuses' : 'opponentRowBonuses'
    return highestRow ? { ...state, [opposingBonusesKey]: addBonusToRows(state[opposingBonusesKey], [highestRow], -effect.amount) } : state
  }

  if (effect.type === 'damage-mirror-row') {
    // ponytail: Hound Wolf pack tactic — every foe in the deployment mirror row takes the hit; empty mirror is a no-op
    const foes = opposingRows[targetRow] ?? []
    if (foes.length === 0) return state
    let nextOpposing = opposingRows
    foes.forEach((foe) => { if (!foe.immune) nextOpposing = addBonusToCard(nextOpposing, targetRow, foe.id, -effect.amount) })
    return { ...state, [opposingRowsKey]: nextOpposing }
  }

  if (effect.type === 'weaken-opponent-bow') {
    const target = findStrongestCard(opposingRows, (item) => item.cardType === 'bow' && !item.immune)
    return target ? { ...state, [opposingRowsKey]: addBonusToCard(opposingRows, target.row, target.cardId, -effect.amount) } : state
  }

  if (effect.type === 'boost-allied-bow') {
    const boostedRows = addBonusToMatchingCards(ownRows, (item) => item.cardType === 'bow', effect.amount)
    return { ...state, [ownRowsKey]: boostedRows }
  }

  if (effect.type === 'boost-allied-origin') {
    const boostedRows = addBonusToMatchingCards(ownRows, (item) => item.originGroupId === effect.originGroupId && item.id !== card.id, effect.amount)
    return { ...state, [ownRowsKey]: boostedRows }
  }

  if (effect.type === 'damage-strongest') {
    // ponytail: Last Escape — targeted weakenings skip immune cards, retargeting or fizzling through existing no-op paths
    const target = findStrongestCard(opposingRows, (card) => !card.immune)
    return target ? { ...state, [opposingRowsKey]: addBonusToCard(opposingRows, target.row, target.cardId, -effect.amount) } : state
  }

  if (effect.type === 'damage-random-opponent') {
    const pool = ROWS.flatMap((row) => opposingRows[row].filter((card) => !card.immune).map((card) => ({ row, cardId: card.id })))
    if (pool.length === 0) return state
    // ponytail: uniform pick via partial Fisher-Yates would avoid full-shuffle cost; pool is tiny (<= hand size), Math.random matches opponent.js idiom
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const picks = Math.min(effect.count ?? 1, shuffled.length)
    let nextOpposing = opposingRows
    for (let i = 0; i < picks; i++) {
      nextOpposing = addBonusToCard(nextOpposing, shuffled[i].row, shuffled[i].cardId, -effect.amount)
    }
    return { ...state, [opposingRowsKey]: nextOpposing }
  }

  if (effect.type === 'boost-random-ally') {
    const pool = ROWS.flatMap((row) => ownRows[row].filter((ally) => ally.id !== card.id).map((ally) => ({ row, cardId: ally.id })))
    if (pool.length === 0) return state
    // ponytail: same shuffle idiom as damage-random-opponent — pool is tiny
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    const picks = Math.min(effect.count ?? 1, shuffled.length)
    let nextOwn = ownRows
    for (let i = 0; i < picks; i++) {
      nextOwn = addBonusToCard(nextOwn, shuffled[i].row, shuffled[i].cardId, effect.amount ?? 1)
    }
    return { ...state, [ownRowsKey]: nextOwn }
  }

  if (effect.type === 'damage-all-opponents') {
    // ponytail: army-wide weaken (Moreau acid rain) — per-card loop unnecessary, map rows directly
    const nextOpposing = Object.fromEntries(ROWS.map((row) => [row, (opposingRows[row] ?? []).map((foe) => foe.immune ? foe : ({ ...foe, bonus: (foe.bonus ?? 0) - effect.amount }))]))
    return { ...state, [opposingRowsKey]: nextOpposing }
  }

  if (effect.type === 'boost-self-per-ally') {
    const allies = ownRows[targetRow].filter((item) => item.id !== card.id && (!effect.matchType || item.cardType === effect.matchType)).length
    return allies > 0 ? { ...state, [ownRowsKey]: addBonusToCard(ownRows, targetRow, card.id, effect.amount * allies) } : state
  }

  if (effect.type === 'boost-weakest-ally') {
    const target = findWeakestCard(ownRows)
    return target ? { ...state, [ownRowsKey]: addBonusToCard(ownRows, target.row, target.cardId, effect.amount) } : state
  }

  if (effect.type === 'boost-occupied-rows') {
    const rowBonusesKey = owner === 'player' ? 'playerRowBonuses' : 'opponentRowBonuses'
    const occupied = ROWS.filter((row) => ownRows[row].length > 0)
    if (occupied.length === 0) return state
    return { ...state, [rowBonusesKey]: addBonusToRows(state[rowBonusesKey], occupied, effect.amount) }
  }

  if (effect.type === 'hazard-row') {
    return {
      ...state,
      playerRowBonuses: addBonusToRows(state.playerRowBonuses, [targetRow], -effect.amount),
      opponentRowBonuses: addBonusToRows(state.opponentRowBonuses, [targetRow], -effect.amount),
    }
  }

  return state
}

export function playPlayerCard(state, cardId, targetRow) {
  if (state.phase !== 'battle' || state.result || state.turn !== 'player' || state.playerPassed) return state

  const card = state.playerHand.find((item) => item.id === cardId)
  if (!card) return { ...state, error: 'That card is no longer in your hand.' }
  if (!ROWS.includes(targetRow) || card.row !== targetRow) return { ...state, error: `This card can only enter the ${card.row} row.` }

  const playerRows = cloneRows(state.playerRows)
  playerRows[targetRow].push(card)

  const resolved = detonateWeakened(evolveWeakened(applyCardEffect({
    ...state,
    playerHand: state.playerHand.filter((item) => item.id !== cardId),
    playerRows,
    turn: state.opponentPassed ? 'player' : 'opponent',
    error: '',
  }, card, targetRow), 'opponentRows'), 'opponentRows')
  return { ...resolved, playerRows: calibrateWeakening(resolved.playerRows, resolved.playerRowBonuses, targetRow, cardId) }
}

export function playOpponentTurn(state) {
  if (state.phase !== 'battle' || state.result || state.turn !== 'opponent' || state.opponentPassed) return state
  if (state.opponentHand.length === 0) return { ...state, opponentPassed: true, turn: 'player', error: '' }

  const leading = aiLead(state) >= aiProfile(state).tempoLead
  const card = leading
    ? [...state.opponentHand].sort((a, b) => a.power - b.power)[0]
    : state.opponentHand.reduce((strongest, item) => item.power > strongest.power ? item : strongest)
  const opponentRows = cloneRows(state.opponentRows)
  opponentRows[card.row].push(card)

  const resolved = passTurnToPlayer(detonateWeakened(evolveWeakened(applyCardEffect({
    ...state,
    opponentHand: state.opponentHand.filter((item) => item.id !== card.id),
    opponentRows,
    turn: 'player',
    error: '',
  }, card, card.row, 'opponent'), 'playerRows'), 'playerRows'))
  return { ...resolved, opponentRows: calibrateWeakening(resolved.opponentRows, resolved.opponentRowBonuses, card.row, card.id) }
}

export function advanceOpponentOnce(state) {
  if (state.phase !== 'battle' || state.result || state.opponentPassed) return state
  if (!state.playerPassed) return playOpponentTurn({ ...state, turn: 'opponent' })
  const profile = aiProfile(state)
  if (aiLead(state) >= profile.bankLead && state.opponentHand.length <= profile.bankHandMax) {
    return passTurnToPlayer({ ...state, opponentPassed: true, turn: 'player', error: '' })
  }
  return playOpponentTurn({ ...state, turn: 'opponent' })
}

export function resolveOpponentTurn(state) {
  if (state.phase !== 'battle' || state.result || state.opponentPassed || state.turn !== 'opponent') return state
  if (!state.playerPassed) return playOpponentTurn(state)

  let nextState = state
  while (nextState.playerPassed && !nextState.opponentPassed) {
    nextState = advanceOpponentOnce(nextState)
  }

  return nextState
}

export function passPlayer(state) {
  if (state.phase !== 'battle' || state.result || state.turn !== 'player') return state
  return { ...state, playerPassed: true, turn: 'opponent', error: '' }
}

export function toggleMulliganCard(state, cardId) {
  if (state.phase !== 'mulligan') return state
  const isSelected = state.mulliganIds.includes(cardId)

  return {
    ...state,
    mulliganIds: isSelected ? state.mulliganIds.filter((id) => id !== cardId) : [...state.mulliganIds, cardId],
  }
}

export function confirmMulligan(state) {
  if (state.phase !== 'mulligan') return state

  const playerRedraw = redrawCards(state.playerHand, state.playerDrawPile, state.mulliganIds)
  const weakestOpponentCard = [...state.opponentHand].sort((a, b) => a.power - b.power)[0]
  const opponentPileTop = state.opponentDrawPile[0]
  const opponentRedrawIds = weakestOpponentCard && opponentPileTop && opponentPileTop.power > weakestOpponentCard.power
    ? [weakestOpponentCard.id]
    : []
  const opponentRedraw = redrawCards(state.opponentHand, state.opponentDrawPile, opponentRedrawIds)

  return {
    ...state,
    phase: 'battle',
    turn: 'player',
    playerHand: playerRedraw.hand,
    playerDrawPile: playerRedraw.drawPile,
    opponentHand: opponentRedraw.hand,
    opponentDrawPile: opponentRedraw.drawPile,
    mulliganIds: [],
    error: '',
  }
}

export function activateLeaderAbility(state) {
  if (state.phase !== 'battle' || state.result || state.turn !== 'player' || state.playerPassed || state.leaderUsed) return state

  const effect = leaderEffects[state.playerLeader.id]
  if (!effect) return { ...state, error: 'This Leader ability is not configured for the prototype.' }

  // ponytail: Gideon jumps allied weakened-mutation cards one stage (hit counters ignored); handled before row targeting, which doesn't apply
  if (effect.type === 'advance-trigger-evolutions') {
    let advanced = false
    const playerRows = Object.fromEntries(ROWS.map((row) => [row, (state.playerRows[row] ?? []).map((card) => {
      if (card.evolution?.trigger !== 'when-weakened' || (card.evolutionStage ?? 0) >= card.evolution.stages.length - 1) return card
      advanced = true
      return applyEvolutionStage(card, (card.evolutionStage ?? 0) + 1)
    })]))
    if (!advanced) return { ...state, error: 'There are no mutation cards ready to evolve.' }
    return detonateWeakened(evolveWeakened({ ...state, playerRows, leaderUsed: true, error: '' }, 'opponentRows'), 'opponentRows')
  }

  // ponytail: HUNK calls in Alpha Team — copies carry instance ids (GameRow keys on card.id) and enter silent: no deploy effects, no calibration; inert placement needs no resolution pass
  if (effect.type === 'deploy-ally') {
    const template = cards.find((card) => card.id === effect.cardId)
    if (!template || !ROWS.includes(effect.row)) return { ...state, error: 'The requested reinforcement is unavailable.' }
    const alongside = effect.presenceBonus && Object.values(state.playerRows).flat().some((card) => card.id === effect.presenceBonus.cardId)
    const count = (effect.count ?? 0) + (alongside ? effect.presenceBonus.extra ?? 0 : 0)
    const playerRows = cloneRows(state.playerRows)
    for (let i = 0; i < count; i += 1) playerRows[effect.row].push({ ...template, id: `${template.id}~${i + 1}` })
    return { ...state, playerRows, leaderUsed: true, error: '' }
  }

  // ponytail: Leon refuses the debuff — negative card bonuses wiped, positive buffs kept, row auras untouched (card-scoped by spec)
  if (effect.type === 'cleanse-allies') {
    const debuffed = Object.values(state.playerRows).flat().some((card) => (card.bonus ?? 0) < 0)
    if (!debuffed) return { ...state, error: 'There are no debuffs to remove.' }
    const playerRows = Object.fromEntries(ROWS.map((row) => [row, (state.playerRows[row] ?? []).map((card) => (card.bonus ?? 0) < 0 ? { ...card, bonus: 0 } : card)]))
    return { ...state, playerRows, leaderUsed: true, error: '' }
  }

  // ponytail: Eveline seizes random foes to your side, keeping their row (ids travel, stay unique — no instance-id problem); scores move with the cards, no resolution pass needed
  if (effect.type === 'seize-random-enemies') {
    const pool = ROWS.flatMap((row) => (state.opponentRows[row] ?? []).map((card) => ({ row, id: card.id })))
    if (pool.length === 0) return { ...state, error: 'There are no opposing cards to seize.' }
    const min = effect.min ?? 1
    const max = effect.max ?? min
    const count = Math.min(pool.length, min + Math.floor(Math.random() * (max - min + 1)))
    const takenIds = new Set([...pool].sort(() => Math.random() - 0.5).slice(0, count).map((slot) => slot.id))
    const seizedRows = cloneRows(state.playerRows)
    const opponentRows = Object.fromEntries(ROWS.map((row) => {
      const staying = []
      for (const card of state.opponentRows[row] ?? []) {
        if (takenIds.has(card.id)) seizedRows[row].push(card)
        else staying.push(card)
      }
      return [row, staying]
    }))
    return { ...state, playerRows: seizedRows, opponentRows, leaderUsed: true, error: '' }
  }

  const targetRow = effect.type === 'weaken-highest-opponent-row' ? findHighestScoreRow(state.opponentRows, state.opponentRowBonuses) : effect.type === 'boost-highest-row' ? findHighestScoreRow(state.playerRows, state.playerRowBonuses) : findLowestScoreRow(state.playerRows, state.playerRowBonuses)

  if (effect.type === 'weaken-highest-opponent-row' && !targetRow) return { ...state, error: 'There are no opposing cards available for this ability.' }
  if (!targetRow && effect.type !== 'boost-occupied-rows') return { ...state, error: 'There are no cards available for this ability.' }
  if (effect.type === 'boost-if-opponent-bow' && !Object.values(state.opponentRows).flat().some((card) => card.cardType === 'bow')) return { ...state, error: 'This ability requires an opposing B.O.W. on the battlefield.' }
  if (effect.type === 'boost-occupied-rows' && !ROWS.some((row) => state.playerRows[row].length > 0)) return { ...state, error: 'There are no allied cards available for this ability.' }

  let playerRowBonuses = state.playerRowBonuses
  let opponentRowBonuses = state.opponentRowBonuses
  if (effect.type === 'boost-occupied-rows') {
    playerRowBonuses = addBonusToRows(playerRowBonuses, ROWS.filter((row) => state.playerRows[row].length > 0), effect.amount)
  } else if (effect.type === 'weaken-highest-opponent-row') {
    opponentRowBonuses = addBonusToRows(opponentRowBonuses, [targetRow], -effect.amount)
  } else {
    playerRowBonuses = addBonusToRows(playerRowBonuses, [targetRow], effect.amount)
  }

  return detonateWeakened(evolveWeakened({ ...state, playerRowBonuses, opponentRowBonuses, leaderUsed: true, error: '' }, 'opponentRows'), 'opponentRows')
}

export function finishRound(state) {
  if (state.result) return state

  const playerScore = getTotalScore(state.playerRows, state.playerRowBonuses)
  const opponentScore = getTotalScore(state.opponentRows, state.opponentRowBonuses)
  const winner = playerScore === opponentScore ? 'draw' : playerScore > opponentScore ? 'player' : 'opponent'
  const playerWins = state.playerWins + (winner === 'player' ? 1 : 0)
  const opponentWins = state.opponentWins + (winner === 'opponent' ? 1 : 0)

  let matchResult = null
  if (playerWins >= WINS_NEEDED || opponentWins >= WINS_NEEDED || state.round >= MAX_ROUNDS) {
    matchResult = { winner: playerWins > opponentWins ? 'player' : opponentWins > playerWins ? 'opponent' : 'draw' }
  }

  return {
    ...state,
    turn: 'complete',
    playerPassed: true,
    opponentPassed: true,
    playerWins,
    opponentWins,
    roundHistory: [...state.roundHistory, { round: state.round, winner, playerScore, opponentScore }],
    result: { winner, playerScore, opponentScore, round: state.round },
    matchResult,
    error: '',
  }
}

export function startNextRound(state) {
  if (!state.result || state.matchResult) return state

  // ponytail: Holdout cards (Wolf Squad) survive the reset in place, state intact; everything else clears per-round
  const retainRows = (rows) => Object.fromEntries(ROWS.map((row) => [row, (rows[row] ?? []).filter((card) => card.holdout)]))

  const winner = state.result.winner
  const playerDrawCount = DRAW_PER_ROUND + (winner === 'opponent' || winner === 'draw' ? 1 : 0)
  const opponentDrawCount = DRAW_PER_ROUND + (winner === 'player' || winner === 'draw' ? 1 : 0)
  const playerDraw = drawCards(state.playerHand, state.playerDrawPile, playerDrawCount)
  const opponentDraw = drawCards(state.opponentHand, state.opponentDrawPile, opponentDrawCount)

  return {
    ...state,
    round: state.round + 1,
    turn: 'player',
    evolutionClock: 0,
    playerHand: playerDraw.hand,
    playerDrawPile: playerDraw.drawPile,
    opponentHand: opponentDraw.hand,
    opponentDrawPile: opponentDraw.drawPile,
    playerRows: retainRows(state.playerRows),
    opponentRows: retainRows(state.opponentRows),
    playerRowBonuses: createRowValues(),
    opponentRowBonuses: createRowValues(),
    playerPassed: false,
    opponentPassed: false,
    leaderUsed: state.leaderUsed,
    result: null,
    error: '',
  }
}
