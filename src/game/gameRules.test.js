import assert from 'node:assert/strict'
import test from 'node:test'
import {
  DRAW_PER_ROUND,
  HAND_SIZE,
  ROWS,
  WINS_NEEDED,
  activateLeaderAbility,
  confirmMulligan,
  createMatchState,
  evolutionPreview,
  finishRound,
  getRowScore,
  getTotalScore,
  passPlayer,
  playOpponentTurn,
  playPlayerCard,
  resolveOpponentTurn,
  startNextRound,
  toggleMulliganCard,
} from './gameRules.js'

const starsFaction = { id: 'stars', name: 'S.T.A.R.S.' }
const umbrellaFaction = { id: 'umbrella', name: 'Umbrella' }
const chrisLeader = { id: 'stars-chris-redfield', name: 'Chris Redfield' }
const birkinLeader = { id: 'umbrella-william-birkin-human', name: 'William Birkin' }

function playerCard(id, power, row, extra = {}) {
  return { id, name: `Player ${id}`, power, row, ...extra }
}

function opponentCard(id, power, row, extra = {}) {
  return { id, name: `Opponent ${id}`, power, row, ...extra }
}

const playerLoadout = {
  faction: starsFaction,
  leader: chrisLeader,
  cards: [
    playerCard('leon', 7, 'Ranged'),
    playerCard('barry', 6, 'Siege'),
    playerCard('chris', 9, 'Melee'),
    playerCard('brad', 5, 'Melee'),
    playerCard('rebecca', 4, 'Ranged'),
    playerCard('marvin', 6, 'Melee'),
    playerCard('sherry', 4, 'Siege'),
    playerCard('kendo', 5, 'Ranged'),
    playerCard('helena', 5, 'Ranged'),
    playerCard('billy', 6, 'Melee'),
    playerCard('ada', 7, 'Ranged'),
    playerCard('carlos', 8, 'Melee'),
    playerCard('dario', 4, 'Melee'),
    playerCard('elena', 5, 'Ranged'),
    playerCard('luis', 6, 'Siege'),
  ],
}

const opponentLoadout = {
  faction: umbrellaFaction,
  leader: birkinLeader,
  cards: [
    opponentCard('tyrant', 10, 'Siege'),
    opponentCard('licker', 6, 'Melee'),
    opponentCard('ganado', 4, 'Melee'),
    opponentCard('verdugo', 9, 'Ranged'),
    opponentCard('zombie', 5, 'Melee'),
    opponentCard('crow', 5, 'Ranged'),
    opponentCard('plant', 6, 'Siege'),
    opponentCard('spider', 7, 'Melee'),
    opponentCard('frog', 8, 'Ranged'),
    opponentCard('moth', 6, 'Siege'),
  ],
}

function readyMatch(playerLoadoutOverride = playerLoadout) {
  return { ...createMatchState(playerLoadoutOverride, opponentLoadout), phase: 'battle' }
}

test('row and total scores are calculated from card power and bonuses', () => {
  const rows = { Melee: [], Ranged: [playerCard('a', 7, 'Ranged')], Siege: [playerCard('b', 6, 'Siege')] }
  assert.equal(getRowScore(rows.Ranged), 7)
  assert.equal(getRowScore([], 3), 3)
  assert.equal(getTotalScore(rows, { Melee: 0, Ranged: 0, Siege: 2 }), 15)
})

test('match state deals opening hands and reserves the rest as draw piles', () => {
  const match = readyMatch()

  assert.equal(match.playerHand.length, HAND_SIZE)
  assert.equal(match.playerDrawPile.length, playerLoadout.cards.length - HAND_SIZE)
  assert.equal(match.opponentHand.length, Math.min(HAND_SIZE, opponentLoadout.cards.length))
  assert.equal(match.playerWins, 0)
  assert.equal(match.opponentWins, 0)
  assert.equal(match.roundHistory.length, 0)
  assert.equal(match.matchResult, null)
})

test('player can only play a card into its assigned row', () => {
  const match = readyMatch()
  const next = playPlayerCard(match, 'leon', 'Melee')

  assert.equal(next.error, 'This card can only enter the Ranged row.')
  assert.equal(next.playerRows.Ranged.length, 0)
})

test('valid player play removes the card from hand and gives the AI a turn', () => {
  const match = readyMatch()
  const next = playPlayerCard(match, 'leon', 'Ranged')

  assert.equal(next.playerHand.some((card) => card.id === 'leon'), false)
  assert.equal(next.playerRows.Ranged[0].id, 'leon')
  assert.equal(next.turn, 'opponent')
})

test('player keeps the turn when the AI has already passed', () => {
  const match = { ...readyMatch(), opponentPassed: true }
  const next = playPlayerCard(match, 'leon', 'Ranged')

  assert.equal(next.turn, 'player')
  assert.equal(next.playerRows.Ranged[0].id, 'leon')
})

test('AI plays the highest-power card and returns the turn to the player', () => {
  const match = { ...readyMatch(), turn: 'opponent' }
  const next = playOpponentTurn(match)

  assert.equal(next.opponentRows.Siege[0].id, 'tyrant')
  assert.equal(next.opponentHand.some((card) => card.id === 'tyrant'), false)
  assert.equal(next.turn, 'player')
})

test('AI responds with its weakest card when already leading by a wide margin', () => {
  const match = readyMatch()
  const leading = {
    ...match,
    turn: 'opponent',
    opponentRows: { Melee: [opponentCard('lead', 10, 'Melee')], Ranged: [], Siege: [] },
    playerRows: { Melee: [playerCard('trail', 2, 'Melee')], Ranged: [], Siege: [] },
  }
  const next = playOpponentTurn(leading)

  assert.equal(next.opponentRows.Melee.some((card) => card.id === 'ganado'), true)
  assert.equal(next.opponentRows.Melee.some((card) => card.id === 'tyrant'), false)
})

test('the AI banks a round win by passing while ahead with few cards left', () => {
  const match = passPlayer(readyMatch())
  const banking = {
    ...match,
    opponentRows: { Melee: [opponentCard('bank', 10, 'Melee')], Ranged: [], Siege: [] },
    opponentHand: [opponentCard('spare1', 3, 'Ranged'), opponentCard('spare2', 3, 'Siege')],
  }

  const next = resolveOpponentTurn(banking)

  assert.equal(next.opponentPassed, true)
  assert.equal(next.opponentHand.length, 2)
  assert.equal(next.turn, 'player')
})

test('the AI keeps fighting after a player pass when the score is not secured', () => {
  const match = passPlayer(readyMatch())
  const behind = { ...match, playerRows: { Melee: [playerCard('wall', 9, 'Melee')], Ranged: [], Siege: [] }, opponentHand: [opponentCard('spare1', 3, 'Ranged'), opponentCard('spare2', 3, 'Siege')] }

  const next = resolveOpponentTurn(behind)

  assert.equal(next.opponentPassed, true)
  assert.equal(next.opponentHand.length, 0)
})

test('resolving after a player play gives the AI one reply without a pass', () => {
  const match = readyMatch()
  const next = resolveOpponentTurn(playPlayerCard(match, 'leon', 'Ranged'))

  assert.equal(next.turn, 'player')
  const opponentCardsOnBoard = ROWS.reduce((total, row) => total + next.opponentRows[row].length, 0)
  assert.equal(opponentCardsOnBoard, 1)
  assert.equal(next.playerPassed, false)
  assert.equal(next.opponentPassed, false)
})

test('card effects change row scores for both player and AI cards', () => {
  const effectCard = playerCard('effect', 7, 'Ranged', { effect: { type: 'boost-row', amount: 2 } })
  const match = readyMatch({ ...playerLoadout, cards: [effectCard] })
  const afterPlayer = playPlayerCard(match, effectCard.id, effectCard.row)
  assert.equal(getRowScore(afterPlayer.playerRows.Ranged), 9)

  const opponentEffect = opponentCard('boosted', 10, 'Siege', { effect: { type: 'boost-self', amount: 2 } })
  const opponentMatch = { ...createMatchState(playerLoadout, { ...opponentLoadout, cards: [opponentEffect] }), phase: 'battle', turn: 'opponent' }
  const afterOpponent = playOpponentTurn(opponentMatch)
  assert.equal(getRowScore(afterOpponent.opponentRows.Siege), 12)
})

test('B.O.W. effects target only the intended biological weapon cards', () => {
  const suppression = playerCard('suppression', 3, 'Siege', { effect: { type: 'weaken-opponent-bow', amount: 2 } })
  const bow = opponentCard('bow', 6, 'Melee', { cardType: 'bow' })
  const human = opponentCard('human', 4, 'Melee', { cardType: 'human' })
  const match = readyMatch({ ...playerLoadout, cards: [suppression] })
  const prepared = { ...match, opponentRows: { Melee: [bow, human], Ranged: [], Siege: [] } }
  const afterSuppression = playPlayerCard(prepared, suppression.id, suppression.row)

  assert.equal(getRowScore(afterSuppression.opponentRows.Melee), 8)

  const molded = playerCard('molded', 5, 'Ranged', { effect: { type: 'boost-allied-bow', amount: 1 } })
  const allyBow = playerCard('ally-bow', 6, 'Ranged', { cardType: 'bow' })
  const allyHuman = playerCard('ally-human', 4, 'Ranged', { cardType: 'human' })
  const moldedMatch = readyMatch({ ...playerLoadout, cards: [molded] })
  const moldedPrepared = { ...moldedMatch, playerRows: { Melee: [], Ranged: [allyBow, allyHuman], Siege: [] } }
  const afterMold = playPlayerCard(moldedPrepared, molded.id, molded.row)

  assert.equal(getRowScore(afterMold.playerRows.Ranged), 16)
  assert.equal(afterMold.playerRows.Ranged.find((card) => card.id === 'ally-human').bonus, undefined)
})

test('damage-strongest weakens only the single most powerful opposing card', () => {
  const attacker = playerCard('attacker', 4, 'Melee', { effect: { type: 'damage-strongest', amount: 3 } })
  const strongBow = opponentCard('strong-bow', 9, 'Melee')
  const weakBow = opponentCard('weak-bow', 6, 'Melee')
  const otherRow = opponentCard('other-row', 8, 'Siege')
  const match = readyMatch({ ...playerLoadout, cards: [attacker] })
  const prepared = { ...match, opponentRows: { Melee: [strongBow, weakBow], Ranged: [], Siege: [otherRow] } }

  const next = playPlayerCard(prepared, attacker.id, attacker.row)

  assert.equal(getRowScore(next.opponentRows.Melee), 12)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'weak-bow').bonus, undefined)
  assert.equal(next.opponentRows.Siege[0].bonus, undefined)
})

test('damage-random-opponent scorches one random opposing card by the amount', () => {
  const attacker = playerCard('attacker', 4, 'Melee', { effect: { type: 'damage-random-opponent', amount: 2, count: 1 } })
  const match = readyMatch({ ...playerLoadout, cards: [attacker] })
  const prepared = { ...match, opponentRows: { Melee: [opponentCard('solo', 7, 'Melee')], Ranged: [], Siege: [] } }

  const next = playPlayerCard(prepared, attacker.id, attacker.row)

  assert.equal(next.opponentRows.Melee[0].bonus, -2)
  assert.equal(getRowScore(next.opponentRows.Melee), 5)
})

test('damage-random-opponent hits exactly one card across rows', () => {
  const attacker = playerCard('attacker', 4, 'Melee', { effect: { type: 'damage-random-opponent', amount: 2, count: 1 } })
  const match = readyMatch({ ...playerLoadout, cards: [attacker] })
  const prepared = {
    ...match,
    opponentRows: { Melee: [opponentCard('a', 7, 'Melee'), opponentCard('b', 6, 'Melee')], Ranged: [opponentCard('c', 5, 'Ranged')], Siege: [] },
  }

  const next = playPlayerCard(prepared, attacker.id, attacker.row)
  const bonuses = [...next.opponentRows.Melee, ...next.opponentRows.Ranged].map((card) => card.bonus ?? 0)

  assert.equal(bonuses.reduce((sum, bonus) => sum + bonus, 0), -2)
  assert.equal(bonuses.filter((bonus) => bonus === -2).length, 1)
})

test('damage-random-opponent no-ops on an empty board', () => {
  const attacker = playerCard('attacker', 4, 'Melee', { effect: { type: 'damage-random-opponent', amount: 2, count: 1 } })
  const match = readyMatch({ ...playerLoadout, cards: [attacker] })

  const next = playPlayerCard(match, attacker.id, attacker.row)

  assert.equal(next.error, '')
  assert.equal(getTotalScore(next.opponentRows, next.opponentRowBonuses), 0)
})

test('damage-random-opponent spreads hits across targets', () => {
  const attacker = playerCard('attacker', 4, 'Melee', { effect: { type: 'damage-random-opponent', amount: 2, count: 1 } })
  const match = readyMatch({ ...playerLoadout, cards: [attacker] })
  const prepared = {
    ...match,
    opponentRows: { Melee: [opponentCard('a', 7, 'Melee')], Ranged: [opponentCard('b', 6, 'Ranged')], Siege: [opponentCard('c', 5, 'Siege')] },
  }
  const hit = new Set()

  for (let i = 0; i < 50; i++) {
    const next = playPlayerCard(prepared, attacker.id, attacker.row)
    const struck = [...next.opponentRows.Melee, ...next.opponentRows.Ranged, ...next.opponentRows.Siege].find((card) => card.bonus === -2)
    hit.add(struck.id)
  }

  assert.deepEqual([...hit].sort(), ['a', 'b', 'c'])
})

test('damage-random-opponent works for AI-owned cards', () => {
  const match = {
    ...readyMatch(),
    turn: 'opponent',
    opponentHand: [opponentCard('saboteur', 3, 'Melee', { effect: { type: 'damage-random-opponent', amount: 2, count: 1 } })],
    playerRows: { Melee: [playerCard('guard', 7, 'Melee')], Ranged: [], Siege: [] },
  }

  const next = playOpponentTurn(match)

  assert.equal(next.playerRows.Melee[0].bonus, -2)
  assert.equal(next.turn, 'player')
})

const evolvingStages = [{ power: 4, artwork: 'form-one.png' }, { power: 6, artwork: 'form-two.png' }, { power: 8, artwork: 'form-three.png' }]

function evolvingCard(id = 'evolver', stage) {
  const card = playerCard(id, 4, 'Melee', { evolution: { stages: evolvingStages } })
  return stage === undefined ? card : { ...card, evolutionStage: stage, power: evolvingStages[stage].power, artwork: evolvingStages[stage].artwork }
}

test('new matches reset evolving cards to their first form', () => {
  const match = readyMatch({ ...playerLoadout, cards: [evolvingCard('evolver', 2)] })

  assert.equal(match.playerHand[0].evolutionStage, 0)
  assert.equal(match.playerHand[0].power, 4)
  assert.equal(match.playerHand[0].artwork, 'form-one.png')
})

test('a single exchange does not mutate evolving cards', () => {
  const match = readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), evolvingCard()] })

  const afterReply = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))

  assert.equal(afterReply.evolutionClock, 1)
  assert.equal(afterReply.playerHand[0].evolutionStage, 0)
  assert.equal(afterReply.playerHand[0].power, 4)
})

test('every second exchange mutates evolving cards on both sides', () => {
  const foe = opponentCard('foe', 4, 'Melee', { evolution: { stages: evolvingStages } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), evolvingCard()] }),
    playerRows: { Melee: [evolvingCard('evolver', 0)], Ranged: [], Siege: [] },
    opponentRows: { Melee: [foe], Ranged: [], Siege: [] },
  }

  const first = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  assert.equal(first.evolutionClock, 1)
  assert.equal(first.playerRows.Melee.find((card) => card.id === 'evolver').evolutionStage, 0)

  const second = resolveOpponentTurn(playPlayerCard(first, 'a2', 'Melee'))
  assert.equal(second.evolutionClock, 2)
  const evolved = second.playerRows.Melee.find((card) => card.id === 'evolver')
  assert.equal(evolved.evolutionStage, 1)
  assert.equal(evolved.power, 6)
  assert.equal(evolved.artwork, 'form-two.png')
  assert.equal(second.opponentRows.Melee.find((card) => card.id === 'foe').evolutionStage, 1)
  assert.equal(second.playerHand.find((card) => card.id === 'evolver').evolutionStage, 0)
})

test('evolution caps at the final form', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee')] }),
    evolutionClock: 1,
    playerRows: { Melee: [evolvingCard('evolver', 2)], Ranged: [], Siege: [] },
  }

  const next = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  const cappedByRound = resolveOpponentTurn(playPlayerCard(next, 'a2', 'Melee'))
  const capped = cappedByRound.playerRows.Melee.find((card) => card.id === 'evolver')

  assert.equal(capped.evolutionStage, 2)
  assert.equal(capped.power, 8)
})

function slowEvolvingCard(id = 'slow', stage = 0) {
  const base = evolvingCard(id, stage)
  return { ...base, evolution: { ...base.evolution, every: 3 } }
}

test('per-card cadence mutates slow cards every third exchange while fast cards mutate every second', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee'), playerCard('a4', 4, 'Melee')] }),
    playerRows: { Melee: [evolvingCard('fast', 0), slowEvolvingCard('slow', 0)], Ranged: [], Siege: [] },
  }

  const afterFirst = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  assert.equal(afterFirst.evolutionClock, 1)
  assert.equal(afterFirst.playerRows.Melee.find((card) => card.id === 'fast').evolutionStage, 0)
  assert.equal(afterFirst.playerRows.Melee.find((card) => card.id === 'slow').evolutionStage, 0)

  const afterSecond = resolveOpponentTurn(playPlayerCard(afterFirst, 'a2', 'Melee'))
  assert.equal(afterSecond.evolutionClock, 2)
  assert.equal(afterSecond.playerRows.Melee.find((card) => card.id === 'fast').evolutionStage, 1)
  assert.equal(afterSecond.playerRows.Melee.find((card) => card.id === 'slow').evolutionStage, 0)

  const afterThird = resolveOpponentTurn(playPlayerCard(afterSecond, 'a3', 'Melee'))
  assert.equal(afterThird.evolutionClock, 3)
  const slow = afterThird.playerRows.Melee.find((card) => card.id === 'slow')
  assert.equal(slow.evolutionStage, 1)
  assert.equal(slow.power, 6)

  const afterFourth = resolveOpponentTurn(playPlayerCard(afterThird, 'a4', 'Melee'))
  assert.equal(afterFourth.evolutionClock, 4)
  assert.equal(afterFourth.playerRows.Melee.find((card) => card.id === 'fast').evolutionStage, 2)
  assert.equal(afterFourth.playerRows.Melee.find((card) => card.id === 'slow').evolutionStage, 1)
})

test('new rounds restart the evolution clock', () => {
  const match = readyMatch({ ...playerLoadout, cards: [evolvingCard()] })

  const next = startNextRound({ ...match, evolutionClock: 5, result: { winner: 'player' } })

  assert.equal(next.evolutionClock, 0)
})

test('evolving stages swap the ability quote and reset restores the base quote', () => {
  const baseAbility = '"Jungle revelation." — Dominant Plaga Mutation: boost this card by 1 on deployment.'
  const awakenedAbility = '"WITNESS THE POWER!" — Dominant Plaga Mutation: boost this card by 1 on deployment.'
  const quoted = [
    { power: 8, artwork: 'dormant.png', ability: baseAbility },
    { power: 13, artwork: 'krauser_form2.png', ability: awakenedAbility },
  ]
  const vessel = playerCard('vessel', 8, 'Melee', { evolution: { stages: quoted, every: 3 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee')] }),
    playerRows: { Melee: [{ ...vessel, evolutionStage: 0, ability: baseAbility }], Ranged: [], Siege: [] },
  }

  const afterThird = resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee')), 'a2', 'Melee')), 'a3', 'Melee'))
  const awakened = afterThird.playerRows.Melee.find((card) => card.id === 'vessel')
  assert.equal(awakened.evolutionStage, 1)
  assert.equal(awakened.power, 13)
  assert.equal(awakened.ability, awakenedAbility)

  const fresh = createMatchState({ ...playerLoadout, cards: [awakened] }, opponentLoadout)
  assert.equal(fresh.playerHand[0].ability, baseAbility)
})

const saddlerStages = [
  { power: 9, artwork: 'Osmund_Saddler_Leader.webp', ability: '"Oh, las plagas, this lamb yearns for enlightenment!" — Enlightened Form: weaken the strongest opposing card by 2. Empower fellow Las Plagas cards by 1. Transforms after five turns.' },
  { power: 15, artwork: 'osmund_saddler_form.png', ability: '"Behold the power of the Holy Body!" — Enlightened Form: weaken the strongest opposing card by 2. Empower fellow Las Plagas cards by 1.' },
]

test('Saddler mutates into his Active Form with new artwork and quote after five exchanges', () => {
  const seed = playerCard('saddler', 9, 'Melee', { evolution: { stages: saddlerStages, every: 5, escalate: true, formLabels: ['Dormant Form', 'Active Form'] } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee'), playerCard('a4', 4, 'Melee'), playerCard('a5', 4, 'Melee')] }),
    playerRows: { Melee: [{ ...seed, evolutionStage: 0, ability: saddlerStages[0].ability }], Ranged: [], Siege: [] },
  }

  const afterFifth = resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee')), 'a2', 'Melee')), 'a3', 'Melee')), 'a4', 'Melee')), 'a5', 'Melee'))
  const mutated = afterFifth.playerRows.Melee.find((card) => card.id === 'saddler')

  assert.equal(afterFifth.evolutionClock, 5)
  assert.equal(mutated.evolutionStage, 1)
  assert.equal(mutated.power, 15)
  assert.equal(mutated.artwork, 'osmund_saddler_form.png')
  assert.equal(mutated.ability, saddlerStages[1].ability)
})

test('Saddler weakens the strongest foe and empowers fellow Las Plagas allies on deployment', () => {
  const eye = playerCard('eye', 4, 'Melee', { originGroupId: 'las-plagas' })
  const outsider = playerCard('outsider', 4, 'Melee', { originGroupId: 'ganados' })
  const foe = opponentCard('foe', 6, 'Melee')
  const weakling = opponentCard('weakling', 2, 'Melee')
  const seed = {
    ...playerCard('saddler', 9, 'Melee', {
      originGroupId: 'las-plagas',
      effect: { type: 'damage-strongest', amount: 2 },
      effects: [{ type: 'boost-allied-origin', originGroupId: 'las-plagas', amount: 1 }],
    }),
    evolutionStage: 0,
  }
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [seed] }),
    opponentHand: [],
    playerRows: { Melee: [eye, outsider], Ranged: [], Siege: [] },
    opponentRows: { Melee: [foe, weakling], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'saddler', 'Melee')

  assert.equal(next.playerRows.Melee.find((card) => card.id === 'eye').bonus, 1)
  assert.equal(next.playerRows.Melee.find((card) => card.id === 'outsider').bonus, undefined)
  assert.equal(next.playerRows.Melee.find((card) => card.id === 'saddler').bonus, undefined)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'foe').bonus, -2)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'weakling').bonus, undefined)
})

test('Target Locator boosts its row by 2 and weakens the strongest foe by 2', () => {
  const eye = playerCard('eye', 4, 'Ranged')
  const locator = playerCard('locator', 4, 'Ranged', {
    effect: { type: 'boost-row', amount: 2 },
    effects: [{ type: 'damage-strongest', amount: 2 }],
  })
  const foe = opponentCard('foe', 6, 'Melee')
  const weakling = opponentCard('weakling', 2, 'Melee')
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [locator] }),
    opponentHand: [],
    playerRows: { Melee: [], Ranged: [eye], Siege: [] },
    opponentRows: { Melee: [foe, weakling], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'locator', 'Ranged')

  assert.equal(next.playerRowBonuses.Ranged, 0)
  assert.equal(next.playerRows.Ranged.find((card) => card.id === 'eye').bonus, 2)
  assert.equal(next.playerRows.Ranged.find((card) => card.id === 'locator').bonus, 2)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'foe').bonus, -2)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'weakling').bonus, undefined)
})

const tyrantStages = [{ power: 6, artwork: 't-00_mr_x.webp' }, { power: 10, artwork: 't-00_mr_x2.webp' }]

function triggerFoe(id, stages, extra, stage = 0) {
  const card = opponentCard(id, stages[stage].power, 'Melee', { evolution: { stages, trigger: 'when-weakened', ...extra } })
  return { ...card, evolutionStage: stage, artwork: stages[stage].artwork }
}

const mrXCard = (stage = 0) => triggerFoe('mr-x', tyrantStages, { transformedLabel: 'SUPER TYRANT' }, stage)

test('weakening an enemy Mr. X transforms him into Super Tyrant immediately', () => {
  const mikhail = playerCard('mikhail', 5, 'Melee', { effect: { type: 'damage-random-opponent', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [mikhail] }),
    opponentRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'mikhail', 'Melee')
  const tyrant = next.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
  assert.equal(tyrant.artwork, 't-00_mr_x2.webp')
  assert.equal(tyrant.bonus, -1)
})

test('a row weaken from a leader ability also triggers the transformation', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'illuminados-saddler', name: 'Saddler' } }),
    opponentRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const next = activateLeaderAbility(match)
  const tyrant = next.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
})

test('Mr. X stays dormant when no weakening lands on him', () => {
  const match = {
    ...readyMatch(),
    opponentRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const next = resolveOpponentTurn(playPlayerCard(match, 'leon', 'Ranged'))
  const tyrant = next.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 0)
  assert.equal(tyrant.power, 6)
})

test('an already-transformed Mr. X never re-fires', () => {
  const mikhail = playerCard('mikhail', 5, 'Melee', { effect: { type: 'damage-random-opponent', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [mikhail, playerCard('a2', 4, 'Melee')] }),
    opponentRows: { Melee: [mrXCard(1)], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'mikhail', 'Melee')
  const tyrant = next.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
  assert.equal(tyrant.bonus, -1)
})

test('the evolution clock never passively mutates a trigger-evolution card', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee')] }),
    opponentRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const first = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  const second = resolveOpponentTurn(playPlayerCard(first, 'a2', 'Melee'))
  const tyrant = second.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 0)
  assert.equal(tyrant.power, 6)
})

test('the AI scorching the player side transforms an allied Mr. X too', () => {
  const match = {
    ...readyMatch(),
    opponentHand: [opponentCard('scorcher', 5, 'Ranged', { effect: { type: 'damage-strongest', amount: 2 } })],
    playerRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const next = resolveOpponentTurn(playPlayerCard({ ...match, turn: 'opponent' }, 'leon', 'Ranged'))
  const tyrant = next.playerRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
})

const nemesisStages = [{ power: 8, artwork: 'RERES_Nemesis.webp' }, { power: 11, artwork: 'Nemesis_2.webp' }, { power: 15, artwork: 'Nemesis_3.webp' }]

const nemesisCard = (stage = 0) => triggerFoe('nemesis', nemesisStages, { formLabels: ['NE-αlpha 1st form', 'NE-αlpha 2nd form', 'NE-αlpha 3rd form'] }, stage)

test('Nemesis advances one form per fresh weakening across separate plays', () => {
  const scorch = (id) => playerCard(id, 5, 'Melee', { effect: { type: 'damage-random-opponent', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorch('mikhail'), scorch('ada'), scorch('kendo')] }),
    opponentHand: [],
    opponentRows: { Melee: [nemesisCard()], Ranged: [], Siege: [] },
  }

  const first = playPlayerCard(match, 'mikhail', 'Melee')
  const firstForm = first.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(firstForm.evolutionStage, 1)
  assert.equal(firstForm.power, 11)
  assert.equal(firstForm.artwork, 'Nemesis_2.webp')

  const second = playPlayerCard(resolveOpponentTurn(first), 'ada', 'Melee')
  const secondForm = second.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(secondForm.evolutionStage, 2)
  assert.equal(secondForm.power, 15)
  assert.equal(secondForm.artwork, 'Nemesis_3.webp')

  const third = playPlayerCard(resolveOpponentTurn(second), 'kendo', 'Melee')
  const finalForm = third.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(finalForm.evolutionStage, 2)
  assert.equal(finalForm.power, 15)
})

test('Nemesis advances one form per scorch and holds his final form', () => {
  const rocket = (id) => playerCard(id, 4, 'Melee', { effect: { type: 'damage-strongest', amount: 2 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [rocket('r1'), rocket('r2'), rocket('r3')] }),
    opponentHand: [],
    opponentRows: { Melee: [nemesisCard()], Ranged: [], Siege: [] },
  }

  const first = playPlayerCard(match, 'r1', 'Melee')
  const firstForm = first.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(firstForm.evolutionStage, 1)
  assert.equal(firstForm.power, 11)
  assert.equal(firstForm.bonus, -2)

  const second = playPlayerCard(resolveOpponentTurn(first), 'r2', 'Melee')
  const secondForm = second.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(secondForm.evolutionStage, 2)
  assert.equal(secondForm.power, 15)

  const third = playPlayerCard(resolveOpponentTurn(second), 'r3', 'Melee')
  const finalForm = third.opponentRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(finalForm.evolutionStage, 2)
  assert.equal(finalForm.power, 15)
})

test('a new match resets Nemesis to his first form and clears his weakening tracker', () => {
  const fresh = createMatchState({ ...playerLoadout, cards: [{ ...nemesisCard(2), bonus: -2, evolutionWeakeningSeen: -2 }] }, opponentLoadout)

  assert.equal(fresh.playerHand[0].evolutionStage, 0)
  assert.equal(fresh.playerHand[0].power, 8)
  assert.equal(fresh.playerHand[0].evolutionWeakeningSeen, 0)
})

function ironMaiden() {
  return opponentCard('maiden', 7, 'Melee', { effect: { type: 'deathburst', amount: 1, count: 4 } })
}

test('scorching Iron Maiden detonates her to 0 and pings random enemies', () => {
  const scorch = playerCard('scorcher', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 2 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorch] }),
    opponentHand: [],
    playerRows: {
      Melee: [playerCard('p1', 4, 'Melee'), playerCard('p2', 4, 'Melee'), playerCard('p3', 4, 'Melee'), playerCard('p4', 4, 'Melee'), playerCard('p5', 4, 'Melee')],
      Ranged: [],
      Siege: [],
    },
    opponentRows: { Melee: [ironMaiden()], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'scorcher', 'Melee')
  const husk = next.opponentRows.Melee.find((card) => card.id === 'maiden')

  assert.equal(husk.power, 0)
  assert.equal(husk.bonus, 0)
  assert.equal(husk.detonated, true)
  const pinged = next.playerRows.Melee.filter((card) => (card.bonus ?? 0) < 0)
  assert.equal(pinged.length, 4)
  assert.ok(pinged.every((card) => card.bonus === -1))
})

test('a lone Iron Maiden still detonates even with fewer enemies than pings', () => {
  const scorch = playerCard('scorcher', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 2 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorch] }),
    opponentHand: [],
    playerRows: { Melee: [playerCard('p1', 4, 'Melee')], Ranged: [], Siege: [] },
    opponentRows: { Melee: [ironMaiden()], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'scorcher', 'Melee')
  const husk = next.opponentRows.Melee.find((card) => card.id === 'maiden')

  assert.equal(husk.power, 0)
  assert.equal(husk.detonated, true)
  const pinged = next.playerRows.Melee.filter((card) => (card.bonus ?? 0) < 0)
  assert.equal(pinged.length, 2)
})

test('Iron Maiden stays live without weakening and never re-detonates', () => {
  const scorch = (id) => playerCard(id, 5, 'Melee', { effect: { type: 'damage-strongest', amount: 2 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('plain', 4, 'Melee'), scorch('s1'), scorch('s2')] }),
    opponentHand: [],
    playerRows: { Melee: [playerCard('p1', 4, 'Melee')], Ranged: [], Siege: [] },
    opponentRows: { Melee: [ironMaiden()], Ranged: [], Siege: [] },
  }

  const calm = playPlayerCard(match, 'plain', 'Melee')
  const live = calm.opponentRows.Melee.find((card) => card.id === 'maiden')
  assert.equal(live.detonated ?? false, false)
  assert.equal(live.power, 7)

  const first = playPlayerCard(resolveOpponentTurn(calm), 's1', 'Melee')
  const husk = first.opponentRows.Melee.find((card) => card.id === 'maiden')
  assert.equal(husk.power, 0)
  assert.equal(husk.detonated, true)

  const second = playPlayerCard(resolveOpponentTurn(first), 's2', 'Melee')
  const still = second.opponentRows.Melee.find((card) => card.id === 'maiden')
  assert.equal(still.power, 0)
  assert.equal(still.detonated, true)
  assert.deepEqual(
    second.playerRows.Melee.filter((card) => (card.bonus ?? 0) < 0).map((card) => card.id),
    ['p1', 'plain', 's1'],
  )
})

test('your own hazard never self-detonates your Maiden', () => {
  const hazard = playerCard('hz', 4, 'Melee', { effect: { type: 'hazard-row', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [hazard] }),
    opponentHand: [],
    playerRows: { Melee: [playerCard('maiden', 7, 'Melee', { effect: { type: 'deathburst', amount: 1, count: 4 } })], Ranged: [], Siege: [] },
    opponentRows: { Melee: [opponentCard('f1', 4, 'Melee')], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'hz', 'Melee')
  const own = next.playerRows.Melee.find((card) => card.id === 'maiden')

  assert.equal(own.detonated ?? false, false)
  assert.equal(own.power, 7)
})

const mendezStages = [{ power: 8, artwork: 'Bitorez_Mendez.webp' }, { power: 13, artwork: 'Bitorez_Mendez2.png' }]

function mendezCard() {
  return { ...opponentCard('mendez', 8, 'Melee', { evolution: { stages: mendezStages, trigger: 'when-weakened', formLabels: ['Dormant Form', 'Active Form'] } }), evolutionStage: 0, artwork: 'Bitorez_Mendez.webp' }
}

test('a single scorch transforms Bitores into his Active Form', () => {
  const scorch = playerCard('scorcher', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorch] }),
    opponentHand: [],
    opponentRows: { Melee: [mendezCard()], Ranged: [], Siege: [] },
  }

  const next = playPlayerCard(match, 'scorcher', 'Melee')
  const active = next.opponentRows.Melee.find((card) => card.id === 'mendez')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 13)
  assert.equal(active.artwork, 'Bitorez_Mendez2.png')
  assert.equal(active.bonus, -1)
})

const jackStages = [
  { power: 7, artwork: 'Jack_Baker1a.png', ability: '"Heck of a thing, ain\'t it? Sure as shit beats the hell out of dying! My little girl has given us a gift! And this gift is with me always!" — Regeneration: boost this card by 1 on deployment. Dormant mutation: transforms after two weakenings.' },
  { power: 14, artwork: 'Jack_Baker_form.png', ability: '"Oh yeah, oh yeah! That\'s real nice!" — Regeneration: boost this card by 1 on deployment. Fully mutated.' },
]

function jackCard() {
  return { ...opponentCard('jack', 7, 'Melee', { evolution: { stages: jackStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Molded Form'] } }), evolutionStage: 0, artwork: 'Jack_Baker1a.png', ability: jackStages[0].ability }
}

test('two weakenings transform Jack Baker into his Active Form', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [jackCard()], Ranged: [], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Melee.find((card) => card.id === 'jack')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 7)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Melee.find((card) => card.id === 'jack')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 14)
  assert.equal(active.artwork, 'Jack_Baker_form.png')
  assert.equal(active.bonus, -2)
  assert.equal(active.ability, jackStages[1].ability)
})

const t501Stages = [
  { power: 8, artwork: 't501_form1.png', ability: 'Flawless Efficiency: boost this card by 2 on deployment. Super Tyrant: transforms after two weakenings.' },
  { power: 13, artwork: 't501_form2.png', ability: 'Super Tyrant: boost this card by 3 on transformation. Charging Strike: weaken the strongest opposing card by 2. Fully mutated.', mutateEffects: [{ type: 'boost-self', amount: 3 }, { type: 'damage-strongest', amount: 2 }] },
]

function t501Card() {
  return { ...opponentCard('t501', 8, 'Melee', { evolution: { stages: t501Stages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Dormant State', 'Super State'] } }), evolutionStage: 0, artwork: 't501_form1.png', ability: t501Stages[0].ability }
}

test('two weakenings transform T-501 and fire both Super State entry effects', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 3, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [t501Card()], Ranged: [], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Melee.find((card) => card.id === 't501')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 8)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Melee.find((card) => card.id === 't501')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 13)
  assert.equal(active.artwork, 't501_form2.png')
  assert.equal(active.bonus, 1)
  assert.equal(active.ability, t501Stages[1].ability)
  const struck = twice.playerRows.Melee.find((card) => card.id === 'scorcher-a')
  assert.equal(struck.bonus, -2)
})

const hunkStages = [
  { power: 8, artwork: 'Hunk.webp', ability: '"This is war. Survival is your responsibility." — The Grim Reaper: weaken the strongest opposing card by 1. The Commander: boost this row by 1. Combat shift: changes style after two weakenings.' },
  { power: 8, artwork: 'Hunk_Commander.png', ability: 'The Commander: boost this card by 3 on transformation. The Grim Reaper: weaken the strongest opposing card by 1. Fully transformed.', mutateEffects: [{ type: 'boost-self', amount: 3 }, { type: 'damage-strongest', amount: 1 }] },
]

function hunkCard() {
  return { ...opponentCard('hunk', 8, 'Melee', { evolution: { stages: hunkStages, trigger: 'when-weakened', triggerHits: 2, hideStagePill: true, transformedLabel: 'CLOSE COMBAT STYLE' } }), evolutionStage: 0, artwork: 'Hunk.webp', ability: hunkStages[0].ability }
}

test('two weakenings shift HUNK into Close Combat Style and fire both entry effects', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 3, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [hunkCard()], Ranged: [], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Melee.find((card) => card.id === 'hunk')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 8)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Melee.find((card) => card.id === 'hunk')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 8)
  assert.equal(active.artwork, 'Hunk_Commander.png')
  assert.equal(active.bonus, 1)
  assert.equal(active.ability, hunkStages[1].ability)
  const struck = twice.playerRows.Melee.find((card) => card.id === 'scorcher-a')
  assert.equal(struck.bonus, -1)
})

const jillStages = [
  { power: 6, artwork: 're3_Jill_Valentine2.png', ability: '"It was Raccoon City\'s last chance and my last chance... My last escape." — S.T.A.R.S Survivor: boost this card by 2 on deployment. Last Escape: immune to targeted weakening. Railgun Charging: shifts to Railgun use on turn 5.' },
  { power: 15, artwork: 'jill_2_railgun.png', ability: '"You want S.T.A.R.S? I\'ll give you S.T.A.R.S!" — Railgun: weaken the strongest opposing card by 3 on transformation. Fully transformed.', mutateEffect: { type: 'damage-strongest', amount: 3 } },
]

function jillCard() {
  return { ...playerCard('jill', 6, 'Ranged', { effect: { type: 'boost-self', amount: 2 }, evolution: { stages: jillStages, every: 5, hideStagePill: true, transformedLabel: 'FERROMAGNETIC INFANTRY-USE NEXT GENERATION RAILGUN' }, immune: true }), evolutionStage: 0, artwork: 're3_Jill_Valentine2.png', ability: jillStages[0].ability }
}

test('Jill shifts to Railgun form at turn 5, striking the strongest foe', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => playerCard(id, 4, 'Melee'))
  const match = {
    ...readyMatch({ ...playerLoadout, cards }),
    playerRows: { Melee: [], Ranged: [jillCard()], Siege: [] },
    opponentRows: { Melee: [opponentCard('brute', 7, 'Melee')], Ranged: [opponentCard('sniper', 4, 'Ranged')], Siege: [] },
    opponentHand: ['w1', 'w2', 'w3', 'w4', 'w5'].map((id) => opponentCard(id, 2, 'Melee')),
  }
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const afterFifth = play(play(play(play(play(match, 'a1'), 'a2'), 'a3'), 'a4'), 'a5')
  assert.equal(afterFifth.evolutionClock, 5)
  const railgun = afterFifth.playerRows.Ranged.find((card) => card.id === 'jill')
  assert.equal(railgun.evolutionStage, 1)
  assert.equal(railgun.power, 15)
  assert.equal(railgun.artwork, 'jill_2_railgun.png')
  assert.equal(railgun.ability, jillStages[1].ability)
  assert.equal(afterFifth.opponentRows.Melee.find((card) => card.id === 'brute').bonus, -3)
  assert.equal(afterFifth.opponentRows.Ranged.find((card) => card.id === 'sniper').bonus ?? 0, 0)
})

test('targeted weakening retargets off immune Jill onto the next-strongest card', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee')] }),
    playerRows: { Melee: [], Ranged: [jillCard(), playerCard('ally', 5, 'Ranged')], Siege: [] },
    opponentHand: [opponentCard('scorcher', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })],
  }

  const after = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  assert.equal(after.playerRows.Ranged.find((card) => card.id === 'ally').bonus, -1)
  assert.equal(after.playerRows.Ranged.find((card) => card.id === 'jill').bonus ?? 0, 0)
})

test('targeted weakening fizzles against a lone immune Jill', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee')] }),
    playerRows: { Melee: [], Ranged: [jillCard()], Siege: [] },
    opponentHand: [opponentCard('scorcher', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })],
  }

  const after = resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee'))
  assert.equal(after.playerRows.Ranged.find((card) => card.id === 'jill').bonus ?? 0, 0)
})

test('row auras still count immune Jill in scoring (documented exception)', () => {
  assert.equal(getRowScore([{ power: 6, bonus: 0, immune: true }], -2), 4)
})

const lucasStages = [
  { power: 7, artwork: 'Lucas_Baker2.webp', ability: '"I\'ve done terrible things...horrible things. I killed your men, I tortured them...and I enjoyed every second, soldier boy!" — Trap: weaken the highest-scoring opposing row by 1. Dormant mutation: transforms after two weakenings.' },
  { power: 13, artwork: 'Lucas_Form2.png', ability: '"Oh boy... So this is what it feels like." — Trap: weaken the highest-scoring opposing row by 1. Fully mutated.' },
]

function lucasCard() {
  return { ...opponentCard('lucas', 7, 'Ranged', { evolution: { stages: lucasStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Molded Form'] } }), evolutionStage: 0, artwork: 'Lucas_Baker2.webp', ability: lucasStages[0].ability }
}

test('two weakenings transform Lucas Baker into his Active Form', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [], Ranged: [lucasCard()], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Ranged.find((card) => card.id === 'lucas')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 7)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Ranged.find((card) => card.id === 'lucas')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 13)
  assert.equal(active.artwork, 'Lucas_Form2.png')
  assert.equal(active.bonus, -2)
  assert.equal(active.ability, lucasStages[1].ability)
})

const margueriteStages = [
  { power: 5, artwork: 'Marguerite_Baker.webp', ability: 'Swarming brood: boost this card by 1. Dormant mutation: transforms after two weakenings.' },
  { power: 8, artwork: 'Marguerite_Baker2.png', ability: 'Swarming brood: boost this card by 1. Fully mutated.' },
]

function margueriteCard() {
  return { ...opponentCard('marguerite', 5, 'Ranged', { evolution: { stages: margueriteStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Molded Form'] } }), evolutionStage: 0, artwork: 'Marguerite_Baker.webp', ability: margueriteStages[0].ability }
}

test('two weakenings transform Marguerite Baker into her Active Form', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [], Ranged: [margueriteCard()], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Ranged.find((card) => card.id === 'marguerite')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 5)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Ranged.find((card) => card.id === 'marguerite')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 8)
  assert.equal(active.artwork, 'Marguerite_Baker2.png')
  assert.equal(active.bonus, -2)
  assert.equal(active.ability, margueriteStages[1].ability)
})

const alcinaStages = [
  { power: 8, artwork: 'Alcina_Dimitrescu.webp', ability: '"You will learn what it means to insult House Dimitrescu!" — Mistress of the castle: boost this card by 1. Dormant mutation: transforms after two weakenings.' },
  { power: 14, artwork: 'Alcina_Dragon_2.webp', ability: '"Flesh, bones, I will devour all of you!" — Mistress of the castle: boost this card by 1. Fully mutated.' },
]

function alcinaCard() {
  return { ...opponentCard('alcina', 8, 'Melee', { evolution: { stages: alcinaStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Megamycete Dragon Form'] } }), evolutionStage: 0, artwork: 'Alcina_Dimitrescu.webp', ability: alcinaStages[0].ability }
}

test('two weakenings transform Alcina Dimitrescu into her Dragon Form', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [scorchA, scorchB] }),
    opponentHand: [],
    opponentRows: { Melee: [alcinaCard()], Ranged: [], Siege: [] },
  }

  const once = playPlayerCard(match, 'scorcher-a', 'Melee')
  const dormant = once.opponentRows.Melee.find((card) => card.id === 'alcina')
  assert.equal(dormant.evolutionStage, 0)
  assert.equal(dormant.power, 8)

  const twice = playPlayerCard(resolveOpponentTurn(once), 'scorcher-b', 'Melee')
  const active = twice.opponentRows.Melee.find((card) => card.id === 'alcina')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 14)
  assert.equal(active.artwork, 'Alcina_Dragon_2.webp')
  assert.equal(active.bonus, -2)
  assert.equal(active.ability, alcinaStages[1].ability)
})

const heisenbergStages = [
  { power: 8, artwork: 'Heisenberg.webp', ability: '"You and me, Ethan. Together, we go save Rose and then, we can use her to grind Miranda into paste!" — Magnetic fury: boost this card by 2 on deployment. Mutates further every fourth turn.' },
  { power: 13, artwork: 'Heisenberg_Mutated.webp', ability: '"I\'m going to murder that boulder-punching asshole, but you\'re first!" — Magnetic fury: boost this card by 2 on deployment. Fully mutated.' },
]

function heisenbergCard() {
  return { ...playerCard('heisenberg', 8, 'Siege', { evolution: { stages: heisenbergStages, every: 4, formLabels: ['Dormant Form', 'Megamycete Mechanical Form'] } }), evolutionStage: 0, artwork: 'Heisenberg.webp', ability: heisenbergStages[0].ability }
}

test('Heisenberg mutates into his Mechanical Form after four exchanges', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee'), playerCard('a4', 4, 'Melee')] }),
    playerRows: { Melee: [], Ranged: [], Siege: [heisenbergCard()] },
  }

  const afterFourth = resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(resolveOpponentTurn(playPlayerCard(match, 'a1', 'Melee')), 'a2', 'Melee')), 'a3', 'Melee')), 'a4', 'Melee'))
  const mechanical = afterFourth.playerRows.Siege.find((card) => card.id === 'heisenberg')

  assert.equal(afterFourth.evolutionClock, 4)
  assert.equal(mechanical.evolutionStage, 1)
  assert.equal(mechanical.power, 13)
  assert.equal(mechanical.artwork, 'Heisenberg_Mutated.webp')
  assert.equal(mechanical.ability, heisenbergStages[1].ability)
})

const mirandaStages = [
  { power: 8, artwork: 'Mother_Miranda.webp' },
  { power: 14, artwork: 'Mother_Miranda_Form.webp', ability: '"None shall interfere in my grand designs!" — Mimicry: boost allied cards in this row by 1. Mutating into this form empowers a random ally by 1.', mutateEffect: { type: 'boost-random-ally', amount: 1 } },
  { power: 14, artwork: 'Miranda_form2.png', ability: '"Your time is up! Now die!" — Mimicry: boost allied cards in this row by 1. Mutating into this form weakens a random foe by 1.', mutateEffect: { type: 'damage-random-opponent', amount: 1 } },
]

function mirandaCard() {
  return { ...playerCard('miranda', 8, 'Siege', { evolution: { stages: mirandaStages, every: 3, firstAt: 3, cycleFrom: 1, formLabels: ['Dormant Form', 'Megamycete Aerial Form', 'Megamycete Spider Form'] } }), evolutionStage: 0 }
}

test('evolutionPreview schedules first delays, cadence, caps, and cycle wraps', () => {
  const standard = playerCard('std', 4, 'Melee', { evolution: { stages: evolvingStages } })
  assert.equal(evolutionPreview({ ...standard, evolutionStage: 0 }, 1), null)
  assert.equal(evolutionPreview({ ...standard, evolutionStage: 0 }, 2), 1)
  assert.equal(evolutionPreview({ ...standard, evolutionStage: 2 }, 4), 2)
  const miranda = mirandaCard()
  assert.equal(evolutionPreview(miranda, 2), null)
  assert.equal(evolutionPreview(miranda, 3), 1)
  assert.equal(evolutionPreview({ ...miranda, evolutionStage: 1 }, 5), null)
  assert.equal(evolutionPreview({ ...miranda, evolutionStage: 1 }, 6), 2)
  assert.equal(evolutionPreview({ ...miranda, evolutionStage: 2 }, 9), 1)
  const gideon = gideonCard()
  assert.equal(evolutionPreview(gideon, 4), null)
  assert.equal(evolutionPreview(gideon, 5), null)
  assert.equal(evolutionPreview({ ...gideon, evolutionStage: 1 }, 4), null)
  assert.equal(evolutionPreview({ ...gideon, evolutionStage: 1 }, 5), 2)
  const moreau = moreauCard()
  assert.equal(evolutionPreview(moreau, 3), null)
  assert.equal(evolutionPreview(moreau, 4), 1)
  assert.equal(evolutionPreview({ ...moreau, evolutionStage: 1 }, 8), 0)
  const trigger = opponentCard('trg', 6, 'Melee', { evolution: { stages: tyrantStages, trigger: 'when-weakened' } })
  assert.equal(evolutionPreview({ ...trigger, evolutionStage: 0 }, 4), null)
})

test('Miranda cycles forms every third turn, empowering a random ally and weakening a random foe', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9'].map((id) => playerCard(id, 4, 'Melee'))
  const match = {
    ...readyMatch({ ...playerLoadout, cards }),
    playerRows: { Melee: [], Ranged: [], Siege: [mirandaCard(), playerCard('kin', 4, 'Siege')] },
    opponentRows: { Melee: [opponentCard('mark', 5, 'Melee')], Ranged: [], Siege: [] },
  }
  const allyBonus = (state) => ROWS.flatMap((row) => state.playerRows[row]).filter((card) => card.id !== 'miranda').reduce((sum, card) => sum + (card.bonus ?? 0), 0)
  const foeBonus = (state) => ROWS.flatMap((row) => state.opponentRows[row]).reduce((sum, card) => sum + (card.bonus ?? 0), 0)
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const afterThird = play(play(play(match, 'a1'), 'a2'), 'a3')
  assert.equal(afterThird.evolutionClock, 3)
  const first = afterThird.playerRows.Siege.find((card) => card.id === 'miranda')
  assert.equal(first.evolutionStage, 1)
  assert.equal(first.power, 14)
  assert.equal(first.artwork, 'Mother_Miranda_Form.webp')
  assert.equal(allyBonus(afterThird), 1)
  assert.equal(foeBonus(afterThird), 0)

  const afterSixth = play(play(play(afterThird, 'a4'), 'a5'), 'a6')
  assert.equal(afterSixth.evolutionClock, 6)
  const second = afterSixth.playerRows.Siege.find((card) => card.id === 'miranda')
  assert.equal(second.evolutionStage, 2)
  assert.equal(second.power, 14)
  assert.equal(second.artwork, 'Miranda_form2.png')
  assert.equal(second.ability, mirandaStages[2].ability)
  assert.equal(allyBonus(afterSixth), 1)
  assert.equal(foeBonus(afterSixth), -1)

  const afterNinth = play(play(play(afterSixth, 'a7'), 'a8'), 'a9')
  assert.equal(afterNinth.evolutionClock, 9)
  const looped = afterNinth.playerRows.Siege.find((card) => card.id === 'miranda')
  assert.equal(looped.evolutionStage, 1)
  assert.equal(looped.power, 14)
  assert.equal(looped.artwork, 'Mother_Miranda_Form.webp')
  assert.equal(allyBonus(afterNinth), 2)
  assert.equal(foeBonus(afterNinth), -1)
})

function weskerCard() {
  return playerCard('wesker', 8, 'Melee', {
    effect: { type: 'boost-row', amount: 1 },
    recurring: [
      { every: 4, firstAt: 2, effect: { type: 'boost-self', amount: 3 } },
      { every: 4, firstAt: 4, effect: { type: 'reset-self' } },
    ],
  })
}

test('Wesker pulses +3 on turns 2 and 6, back to normal on turn 4', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => playerCard(id, 4, 'Melee'))
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [weskerCard(), ...cards] }),
    playerRows: { Melee: [], Ranged: [], Siege: [] },
  }
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const afterFirst = play(match, 'wesker')
  assert.equal(afterFirst.evolutionClock, 1)
  assert.equal(afterFirst.playerRows.Melee.find((card) => card.id === 'wesker').bonus, 1)
  assert.equal(afterFirst.playerRowBonuses.Melee, 0)

  const afterSecond = play(afterFirst, 'a1')
  assert.equal(afterSecond.evolutionClock, 2)
  assert.equal(afterSecond.playerRows.Melee.find((card) => card.id === 'wesker').bonus, 4)

  const afterFourth = play(play(afterSecond, 'a2'), 'a3')
  assert.equal(afterFourth.evolutionClock, 4)
  const normal = afterFourth.playerRows.Melee.find((card) => card.id === 'wesker')
  assert.equal(normal.bonus, 0)
  assert.equal(afterFourth.playerRowBonuses.Melee, 0)

  const afterSixth = play(play(afterFourth, 'a4'), 'a5')
  assert.equal(afterSixth.evolutionClock, 6)
  assert.equal(afterSixth.playerRows.Melee.find((card) => card.id === 'wesker').bonus, 3)
})

function zenoCard() {
  return playerCard('zeno', 8, 'Ranged', {
    effect: { type: 'boost-self', amount: 1 },
    effects: [{ type: 'boost-self', amount: 2 }],
    recurring: [
      { every: 4, firstAt: 2, effect: { type: 'reset-self' } },
      { every: 4, firstAt: 4, effect: { type: 'boost-self', amount: 2 } },
    ],
  })
}

test('Zeno decays to base on turns 2 and 6, rises again on turn 4', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id) => playerCard(id, 4, 'Ranged'))
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [zenoCard(), ...cards] }),
    playerRows: { Melee: [], Ranged: [], Siege: [] },
  }
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Ranged'))

  const afterFirst = play(match, 'zeno')
  assert.equal(afterFirst.evolutionClock, 1)
  assert.equal(afterFirst.playerRows.Ranged.find((card) => card.id === 'zeno').bonus, 3)

  const afterSecond = play(afterFirst, 'a1')
  assert.equal(afterSecond.evolutionClock, 2)
  assert.equal(afterSecond.playerRows.Ranged.find((card) => card.id === 'zeno').bonus, 0)

  const afterFourth = play(play(afterSecond, 'a2'), 'a3')
  assert.equal(afterFourth.evolutionClock, 4)
  assert.equal(afterFourth.playerRows.Ranged.find((card) => card.id === 'zeno').bonus, 2)

  const afterSixth = play(play(afterFourth, 'a4'), 'a5')
  assert.equal(afterSixth.evolutionClock, 6)
  assert.equal(afterSixth.playerRows.Ranged.find((card) => card.id === 'zeno').bonus, 0)
})

const moreauStages = [
  { power: 5, artwork: 'Moreau.webp', ability: '"Oh Mother Miranda... if it\'s for you, I\'d do anything!" — Uncontrollable mutation: boost this card by 1. Shifts form every fourth turn.' },
  { power: 13, artwork: 'Moreau_2.webp', ability: '"I\'M THE BEEST!" — Acid rain: weaken all opposing cards by 2. Stacks with each fish form.', mutateEffect: { type: 'damage-all-opponents', amount: 2 } },
]

function moreauCard() {
  return { ...playerCard('moreau', 5, 'Siege', { evolution: { stages: moreauStages, every: 4, cycleFrom: 0, formLabels: ['Somewhat Stable Form', 'Megamycete Grotesque Fish Form'] } }), evolutionStage: 0 }
}

test('Moreau shifts to fish form every fourth turn, flooding all foes, then shifts back', () => {
  const cards = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].map((id) => playerCard(id, 4, 'Melee'))
  const match = {
    ...readyMatch({ ...playerLoadout, cards }),
    playerRows: { Melee: [], Ranged: [], Siege: [moreauCard()] },
    opponentRows: { Melee: [opponentCard('mark-m', 5, 'Melee')], Ranged: [opponentCard('mark-r', 5, 'Ranged')], Siege: [opponentCard('mark-s', 5, 'Siege')] },
  }
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const afterFourth = play(play(play(play(match, 'a1'), 'a2'), 'a3'), 'a4')
  assert.equal(afterFourth.evolutionClock, 4)
  const fish = afterFourth.playerRows.Siege.find((card) => card.id === 'moreau')
  assert.equal(fish.evolutionStage, 1)
  assert.equal(fish.power, 13)
  assert.equal(fish.artwork, 'Moreau_2.webp')
  assert.equal(fish.ability, moreauStages[1].ability)
  assert.equal(afterFourth.opponentRows.Melee.find((card) => card.id === 'mark-m').bonus, -2)
  assert.equal(afterFourth.opponentRows.Ranged.find((card) => card.id === 'mark-r').bonus, -2)
  assert.equal(afterFourth.opponentRows.Siege.find((card) => card.id === 'mark-s').bonus, -2)
  assert.equal(fish.bonus ?? 0, 0)

  const afterEighth = play(play(play(play(afterFourth, 'a5'), 'a6'), 'a7'), 'a8')
  assert.equal(afterEighth.evolutionClock, 8)
  const stable = afterEighth.playerRows.Siege.find((card) => card.id === 'moreau')
  assert.equal(stable.evolutionStage, 0)
  assert.equal(stable.power, 5)
  assert.equal(stable.artwork, 'Moreau.webp')
})

const gideonStages = [
  { power: 5, artwork: 'Victor_Gideon.webp', ability: '"Grace! Wait, Grace! Grace? GRAAAAAACE! There’s no escaping your destiny!" — Spencer\'s Legacy: boost all occupied allied rows by 1 on deployment. Dormant mutation: transforms after two weakenings.' },
  { power: 8, artwork: 'Victor_Gideon3_Form1.png', ability: '"You are nothing but an imitation!" — NE-γ Parasite Empowerment: boost this card by 2. Advances to final form after five turns or two further weakenings.', every: 5, mutateEffect: { type: 'boost-self', amount: 2 } },
  { power: 15, artwork: 'Victor_Gideon3_Form2.png', ability: '"You insufferable...fool... My master’s future...is absolute." — NE-γ Parasite Empowerment: boost this card by 2. Fully mutated.', mutateEffect: { type: 'boost-self', amount: 2 } },
]

function gideonCard() {
  return { ...opponentCard('gideon', 5, 'Siege', { evolution: { stages: gideonStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Normal State', 'NE-alpha Parasite 1ST FORM', 'NE-alpha Parasite FINAL FORM'] } }), evolutionStage: 0, artwork: 'Victor_Gideon.webp', ability: gideonStages[0].ability }
}

test("Spencer's Legacy boosts all occupied allied rows on deployment", () => {
  const herald = playerCard('herald', 5, 'Siege', { effect: { type: 'boost-occupied-rows', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [herald] }),
    opponentHand: [],
    playerRows: { Melee: [playerCard('a', 4, 'Melee')], Ranged: [playerCard('b', 4, 'Ranged')], Siege: [] },
  }

  const next = playPlayerCard(match, 'herald', 'Siege')

  assert.equal(next.playerRowBonuses.Melee, 1)
  assert.equal(next.playerRowBonuses.Ranged, 1)
  assert.equal(next.playerRowBonuses.Siege, 1)
})

test('Gideon reaches his final form on the clock after two weakenings', () => {
  const scorchA = playerCard('scorcher-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const scorchB = playerCard('scorcher-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const weakFoes = ['w1', 'w2', 'w3', 'w4', 'w5', 'w6'].map((id) => opponentCard(id, 2, 'Melee'))
  const match = {
    ...createMatchState(
      { ...playerLoadout, cards: [scorchA, scorchB, playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee')] },
      { ...opponentLoadout, cards: weakFoes },
    ),
    phase: 'battle',
    opponentRows: { Melee: [], Ranged: [], Siege: [gideonCard()] },
  }
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const afterSecond = play(play(match, 'scorcher-a'), 'scorcher-b')
  assert.equal(afterSecond.evolutionClock, 2)
  const first = afterSecond.opponentRows.Siege.find((card) => card.id === 'gideon')
  assert.equal(first.evolutionStage, 1)
  assert.equal(first.power, 8)
  assert.equal(first.artwork, 'Victor_Gideon3_Form1.png')
  assert.equal(first.ability, gideonStages[1].ability)
  assert.equal(first.bonus, 0)

  const afterFifth = play(play(play(afterSecond, 'a1'), 'a2'), 'a3')
  assert.equal(afterFifth.evolutionClock, 5)
  const final = afterFifth.opponentRows.Siege.find((card) => card.id === 'gideon')
  assert.equal(final.evolutionStage, 2)
  assert.equal(final.power, 15)
  assert.equal(final.artwork, 'Victor_Gideon3_Form2.png')
  assert.equal(final.ability, gideonStages[2].ability)
  assert.equal(final.bonus, 2)
})

test('Gideon reaches his final form on weakenings alone with a frozen clock', () => {
  const scorches = ['s1', 's2', 's3', 's4'].map((id) => playerCard(id, 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } }))
  const match = {
    ...readyMatch({ ...playerLoadout, cards: scorches }),
    opponentHand: [],
    opponentRows: { Melee: [], Ranged: [], Siege: [gideonCard()] },
  }
  const play = (state, id) => playPlayerCard(resolveOpponentTurn(state), id, 'Melee')

  const afterSecond = play(play(match, 's1'), 's2')
  assert.equal(afterSecond.opponentRows.Siege.find((card) => card.id === 'gideon').evolutionStage, 1)

  const afterFourth = play(play(afterSecond, 's3'), 's4')
  const final = afterFourth.opponentRows.Siege.find((card) => card.id === 'gideon')
  assert.equal(afterFourth.evolutionClock, 0)
  assert.equal(final.evolutionStage, 2)
  assert.equal(final.power, 15)
  assert.equal(final.artwork, 'Victor_Gideon3_Form2.png')
  assert.equal(final.bonus, 0)
})

test('Sturm weakens a random foe on deployment and again every third turn', () => {
  const sturm = playerCard('sturm', 8, 'Melee', {
    effect: { type: 'damage-random-opponent', amount: 1 },
    recurring: { every: 3, effect: { type: 'damage-random-opponent', amount: 1 } },
  })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [sturm, playerCard('a1', 4, 'Melee'), playerCard('a2', 4, 'Melee'), playerCard('a3', 4, 'Melee'), playerCard('a4', 4, 'Melee'), playerCard('a5', 4, 'Melee')] }),
    opponentRows: { Melee: [opponentCard('mark', 5, 'Melee')], Ranged: [], Siege: [] },
  }
  const foeBonus = (state) => ROWS.flatMap((row) => state.opponentRows[row]).reduce((sum, card) => sum + (card.bonus ?? 0), 0)
  const play = (state, id) => resolveOpponentTurn(playPlayerCard(state, id, 'Melee'))

  const deployed = play(match, 'sturm')
  assert.equal(deployed.evolutionClock, 1)
  assert.equal(foeBonus(deployed), -1)

  const afterSecond = play(deployed, 'a1')
  assert.equal(afterSecond.evolutionClock, 2)
  assert.equal(foeBonus(afterSecond), -1)

  const afterThird = play(afterSecond, 'a2')
  assert.equal(afterThird.evolutionClock, 3)
  assert.equal(foeBonus(afterThird), -2)

  const afterSixth = play(play(play(afterThird, 'a3'), 'a4'), 'a5')
  assert.equal(afterSixth.evolutionClock, 6)
  assert.equal(foeBonus(afterSixth), -3)
})

test('mirror-row weakening hits every foe in the deployment row only', () => {
  const hound = playerCard('hound', 5, 'Ranged', { effect: { type: 'damage-mirror-row', amount: 1 } })
  const match = {
    ...readyMatch({ ...playerLoadout, cards: [hound] }),
    opponentHand: [],
    opponentRows: { Melee: [opponentCard('far', 5, 'Melee')], Ranged: [opponentCard('left', 4, 'Ranged'), opponentCard('right', 6, 'Ranged')], Siege: [] },
  }

  const next = playPlayerCard(match, 'hound', 'Ranged')

  assert.equal(next.opponentRows.Ranged.find((card) => card.id === 'left').bonus, -1)
  assert.equal(next.opponentRows.Ranged.find((card) => card.id === 'right').bonus, -1)
  assert.equal(next.opponentRows.Melee.find((card) => card.id === 'far').bonus, undefined)
})

test('weakenings from the aging pass wake weakened-mutation cards', () => {
  const flamer = playerCard('flamer', 4, 'Melee', {
    recurring: { every: 1, effect: { type: 'damage-strongest', amount: 1 } },
  })
  const weakFoes = ['w1', 'w2'].map((id) => opponentCard(id, 2, 'Melee'))
  const match = {
    ...createMatchState(
      { ...playerLoadout, cards: [playerCard('filler', 4, 'Melee')] },
      { ...opponentLoadout, cards: weakFoes },
    ),
    phase: 'battle',
    playerRows: { Melee: [flamer], Ranged: [], Siege: [] },
    opponentRows: { Melee: [mrXCard()], Ranged: [], Siege: [] },
  }

  const next = resolveOpponentTurn(playPlayerCard(match, 'filler', 'Melee'))
  const tyrant = next.opponentRows.Melee.find((card) => card.id === 'mr-x')

  assert.equal(next.evolutionClock, 1)
  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
  assert.equal(tyrant.artwork, 't-00_mr_x2.webp')
})

test('Gideon advances all allied weakened-mutation cards one stage', () => {
  const playerMrX = { ...playerCard('mr-x', 6, 'Melee', { evolution: { stages: tyrantStages, trigger: 'when-weakened', transformedLabel: 'SUPER TYRANT' } }), evolutionStage: 0, artwork: 't-00_mr_x.webp' }
  const playerNemesis = { ...playerCard('nemesis', 8, 'Melee', { evolution: { stages: nemesisStages, trigger: 'when-weakened', formLabels: ['NE-alpha 1st form', 'NE-alpha 2nd form', 'NE-alpha 3rd form'] } }), evolutionStage: 0, artwork: 'RERES_Nemesis.webp' }
  const playerJack = { ...playerCard('jack', 7, 'Melee', { evolution: { stages: jackStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Molded Form'] } }), evolutionStage: 0, artwork: 'Jack_Baker1a.png', ability: jackStages[0].ability }
  const maxedMendez = { ...playerCard('mendez', 8, 'Melee', { evolution: { stages: mendezStages, trigger: 'when-weakened', formLabels: ['Dormant Form', 'Active Form'] } }), evolutionStage: 1, power: 13, artwork: 'Bitorez_Mendez2.png' }
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'connections-victor-gideon', name: 'Victor Gideon' } }),
    playerRows: { Melee: [playerMrX, playerNemesis], Ranged: [playerJack, maxedMendez, evolvingCard('timer', 0), playerCard('vanilla', 4, 'Ranged')], Siege: [] },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.leaderUsed, true)
  assert.equal(next.error, '')
  const tyrant = next.playerRows.Melee.find((card) => card.id === 'mr-x')
  assert.equal(tyrant.evolutionStage, 1)
  assert.equal(tyrant.power, 10)
  assert.equal(tyrant.artwork, 't-00_mr_x2.webp')
  const nemesis = next.playerRows.Melee.find((card) => card.id === 'nemesis')
  assert.equal(nemesis.evolutionStage, 1)
  assert.equal(nemesis.power, 11)
  assert.equal(nemesis.artwork, 'Nemesis_2.webp')
  const jack = next.playerRows.Ranged.find((card) => card.id === 'jack')
  assert.equal(jack.evolutionStage, 1)
  assert.equal(jack.power, 14)
  assert.equal(jack.artwork, 'Jack_Baker_form.png')
  const mendez = next.playerRows.Ranged.find((card) => card.id === 'mendez')
  assert.equal(mendez.evolutionStage, 1)
  assert.equal(mendez.power, 13)
  const timer = next.playerRows.Ranged.find((card) => card.id === 'timer')
  assert.equal(timer.evolutionStage, 0)
  const vanilla = next.playerRows.Ranged.find((card) => card.id === 'vanilla')
  assert.equal(vanilla.power, 4)
  assert.equal(vanilla.evolutionStage, undefined)
})

test('Gideon reports when no mutation cards are ready to evolve', () => {
  const match = readyMatch({ ...playerLoadout, leader: { id: 'connections-victor-gideon', name: 'Victor Gideon' } })
  const next = activateLeaderAbility(match)

  assert.equal(next.error, 'There are no mutation cards ready to evolve.')
  assert.equal(next.leaderUsed, false)
})

test('HUNK leader deploys one silent Alpha Team', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'umbrella-hunk', name: 'HUNK' } }),
    playerRows: { Melee: [], Ranged: [], Siege: [] },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.leaderUsed, true)
  assert.equal(next.error, '')
  const team = next.playerRows.Ranged.filter((card) => card.id.startsWith('umbrella-uss-alpha-team'))
  assert.equal(team.length, 1)
  assert.equal(team[0].power, 6)
  assert.equal(team[0].bonus, undefined)
})

test('HUNK leader deploys two distinctly-keyed Alpha Teams while his unit fights alongside', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'umbrella-hunk', name: 'HUNK' } }),
    playerRows: { Melee: [playerCard('umbrella-hunk-unit', 8, 'Melee')], Ranged: [], Siege: [] },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.leaderUsed, true)
  const team = next.playerRows.Ranged.filter((card) => card.id.startsWith('umbrella-uss-alpha-team'))
  assert.equal(team.length, 2)
  assert.notEqual(team[0].id, team[1].id)
})

test('Leon Federal Agent cleanses allied debuffs and keeps buffs', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'fbi-leon-kennedy-re4', name: 'Leon S. Kennedy' } }),
    playerRows: {
      Melee: [playerCard('debuffed', 5, 'Melee', { bonus: -2 }), playerCard('buffed', 4, 'Melee', { bonus: 3 }), playerCard('clean', 4, 'Melee')],
      Ranged: [],
      Siege: [],
    },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.leaderUsed, true)
  assert.equal(next.error, '')
  assert.equal(next.playerRows.Melee.find((card) => card.id === 'debuffed').bonus, 0)
  assert.equal(next.playerRows.Melee.find((card) => card.id === 'buffed').bonus, 3)
  assert.equal(next.playerRows.Melee.find((card) => card.id === 'clean').bonus, undefined)
})

test('Leon Federal Agent keeps his ability when there is nothing to cleanse', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'fbi-leon-kennedy-re4', name: 'Leon S. Kennedy' } }),
    playerRows: { Melee: [playerCard('buffed', 4, 'Melee', { bonus: 3 })], Ranged: [], Siege: [] },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.error, 'There are no debuffs to remove.')
  assert.equal(next.leaderUsed, false)
})

test('William Birkin leader deploys a silent G-Type to Melee', () => {
  const match = {
    ...readyMatch({ ...playerLoadout, leader: { id: 'umbrella-william-birkin-human', name: 'William Birkin' } }),
    playerRows: { Melee: [], Ranged: [], Siege: [] },
  }

  const next = activateLeaderAbility(match)

  assert.equal(next.leaderUsed, true)
  assert.equal(next.error, '')
  const spawned = next.playerRows.Melee.filter((card) => card.id.startsWith('umbrella-birkin-g-type'))
  assert.equal(spawned.length, 1)
  assert.equal(spawned[0].power, 5)
  assert.equal(spawned[0].bonus, undefined)
  assert.equal(spawned[0].evolutionStage, undefined)
})

test('Jack Baker deployed by play counts two scorches despite his deployment boost', () => {
  const jackSeed = {
    ...playerCard('jack', 7, 'Melee', {
      effect: { type: 'boost-self', amount: 1 },
      evolution: { stages: jackStages, trigger: 'when-weakened', triggerHits: 2, formLabels: ['Stable Form', 'Molded Form'] },
    }),
    evolutionStage: 0,
  }
  const foeScorchA = opponentCard('foe-a', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const foeScorchB = opponentCard('foe-b', 5, 'Melee', { effect: { type: 'damage-strongest', amount: 1 } })
  const match = {
    ...createMatchState(
      { ...playerLoadout, cards: [jackSeed, playerCard('filler', 4, 'Melee')] },
      { ...opponentLoadout, cards: [foeScorchA, foeScorchB] },
    ),
    phase: 'battle',
  }

  const deployed = playPlayerCard(match, 'jack', 'Melee')
  const boosted = deployed.playerRows.Melee.find((card) => card.id === 'jack')
  assert.equal(boosted.bonus, 1)
  assert.equal(boosted.evolutionStage, 0)

  const once = resolveOpponentTurn(deployed)
  const struck = once.playerRows.Melee.find((card) => card.id === 'jack')
  assert.equal(struck.bonus, 0)
  assert.equal(struck.evolutionStage, 0)

  const twice = resolveOpponentTurn(playPlayerCard(once, 'filler', 'Melee'))
  const active = twice.playerRows.Melee.find((card) => card.id === 'jack')

  assert.equal(active.evolutionStage, 1)
  assert.equal(active.power, 14)
  assert.equal(active.artwork, 'Jack_Baker_form.png')
  assert.equal(active.ability, jackStages[1].ability)
})

test('boost-self-per-ally scales with matching allies already in the row', () => {
  const hordeMember = playerCard('horde', 4, 'Melee', { effect: { type: 'boost-self-per-ally', amount: 1, matchType: 'bow' }, cardType: 'bow' })
  const allyBowA = playerCard('ally-a', 5, 'Melee', { cardType: 'bow' })
  const allyBowB = playerCard('ally-b', 5, 'Melee', { cardType: 'bow' })
  const allyHuman = playerCard('ally-h', 5, 'Melee', { cardType: 'human' })
  const match = readyMatch({ ...playerLoadout, cards: [hordeMember] })
  const prepared = { ...match, playerRows: { Melee: [allyBowA, allyBowB, allyHuman], Ranged: [], Siege: [] } }

  const next = playPlayerCard(prepared, hordeMember.id, hordeMember.row)

  assert.equal(next.playerRows.Melee.find((card) => card.id === 'horde').bonus, 2)
})

test('boost-weakest-ally empowers the weakest friendly card board-wide', () => {
  const medic = playerCard('medic', 3, 'Siege', { effect: { type: 'boost-weakest-ally', amount: 2 } })
  const weakRanged = playerCard('weak-ranged', 3, 'Ranged')
  const strongMelee = playerCard('strong-melee', 8, 'Melee')
  const match = readyMatch({ ...playerLoadout, cards: [medic] })
  const prepared = { ...match, playerRows: { Melee: [strongMelee], Ranged: [weakRanged], Siege: [] } }

  const next = playPlayerCard(prepared, medic.id, medic.row)

  assert.equal(next.playerRows.Ranged.find((card) => card.id === 'weak-ranged').bonus, 2)
  assert.equal(next.playerRows.Melee[0].bonus, undefined)
})

test('passing lets the AI drain its hand, then finishing records the round without mutating source state', () => {
  const match = readyMatch()
  const resolved = finishRound(resolveOpponentTurn(passPlayer(match)))

  assert.equal(resolved.result.winner, 'opponent')
  assert.equal(resolved.opponentWins, 1)
  assert.equal(resolved.playerWins, 0)
  assert.equal(resolved.roundHistory.length, 1)
  assert.equal(resolved.matchResult, null)
  assert.equal(match.playerHand.length, HAND_SIZE)
  assert.equal(match.playerRows.Melee.length, 0)
})

test('startNextRound resets the board, draws up to hand limit, and keeps the Leader spent', () => {
  let match = { ...createMatchState(playerLoadout, opponentLoadout), phase: 'battle' }
  match = playOpponentTurn(playPlayerCard(match, 'barry', 'Siege'))
  match = activateLeaderAbility(match)
  const finished = finishRound(match)
  const next = startNextRound(finished)

  assert.equal(finished.leaderUsed, true)
  assert.equal(finished.result.winner, 'opponent')
  assert.equal(next.round, 2)
  assert.equal(next.result, null)
  assert.equal(next.playerPassed, false)
  assert.equal(next.opponentPassed, false)
  assert.equal(next.playerRows.Melee.length, 0)
  assert.equal(next.playerRowBonuses.Siege, 0)
  assert.equal(next.leaderUsed, true)
  assert.equal(next.playerHand.length, HAND_SIZE + 1)
  assert.equal(next.playerDrawPile.length, 0)
  assert.equal(next.playerHand.some((card) => card.id === 'leon'), true)
  const playerCardsOnBoard = ROWS.reduce((total, row) => total + finished.playerRows[row].length, 0)
  assert.equal(next.playerDrawPile.length + next.playerHand.length + playerCardsOnBoard, playerLoadout.cards.length)
  assert.equal(startNextRound(next).round, 2)
})

test('the losing side draws one extra card for the next round', () => {
  const deepPlayer = { ...playerLoadout, cards: [...playerLoadout.cards, playerCard('spare-p1', 3, 'Melee'), playerCard('spare-p2', 3, 'Siege')] }
  const deepOpponent = { ...opponentLoadout, cards: [...opponentLoadout.cards, opponentCard('spare-a', 3, 'Ranged'), opponentCard('spare-b', 3, 'Siege'), opponentCard('spare-c', 3, 'Melee'), opponentCard('spare-d', 3, 'Melee'), opponentCard('spare-e', 3, 'Ranged'), opponentCard('spare-f', 3, 'Siege'), opponentCard('spare-g', 3, 'Ranged')] }
  let match = createMatchState(deepPlayer, deepOpponent)
  match = finishRound({ ...match, playerRows: { Melee: [playerCard('win1', 10, 'Melee')], Ranged: [], Siege: [] } })

  assert.equal(match.result.winner, 'player')
  const roundTwo = startNextRound(match)

  assert.equal(roundTwo.playerHand.length, HAND_SIZE + DRAW_PER_ROUND)
  assert.equal(roundTwo.opponentHand.length, HAND_SIZE + DRAW_PER_ROUND + 1)
  assert.equal(roundTwo.opponentDrawPile.length, deepOpponent.cards.length - roundTwo.opponentHand.length)
})

test('both sides draw an extra card after a drawn round', () => {
  const deepPlayer = { ...playerLoadout, cards: [...playerLoadout.cards, playerCard('spare-p1', 3, 'Melee'), playerCard('spare-p2', 3, 'Siege')] }
  let match = passPlayer({ ...createMatchState(deepPlayer, opponentLoadout), phase: 'battle' })
  match = finishRound({ ...match, opponentPassed: true })
  const roundTwo = startNextRound(match)

  assert.equal(match.result.winner, 'draw')
  assert.equal(roundTwo.playerHand.length, HAND_SIZE + DRAW_PER_ROUND + 1)
})

test('leader abilities cannot be reused in later rounds of the same match', () => {
  let match = playPlayerCard(readyMatch(), 'barry', 'Siege')
  match = playOpponentTurn(match)
  match = activateLeaderAbility(match)
  const firstBonus = getRowScore(match.playerRows.Siege, match.playerRowBonuses.Siege) - getRowScore(match.playerRows.Siege)
  const roundTwo = startNextRound(finishRound(match))
  const reused = activateLeaderAbility(roundTwo)

  assert.ok(firstBonus > 0)
  assert.equal(roundTwo.leaderUsed, true)
  assert.deepEqual(reused, roundTwo)
})

test('two round wins end the match with a match result', () => {
  let match = readyMatch()
  match = finishRound({ ...match, playerRows: { Melee: [playerCard('win1', 10, 'Melee')], Ranged: [], Siege: [] } })
  assert.equal(match.matchResult, null)

  const secondRound = startNextRound(match)
  const finished = finishRound({ ...secondRound, playerRows: { Melee: [playerCard('win2', 10, 'Melee')], Ranged: [], Siege: [] } })

  assert.equal(finished.playerWins, WINS_NEEDED)
  assert.equal(finished.matchResult.winner, 'player')
  assert.equal(finished.roundHistory.length, 2)
})

test('a drawn round awards no wins and the match continues', () => {
  let match = readyMatch()
  match = finishRound({ ...passPlayer(match), opponentPassed: true })

  assert.equal(match.result.winner, 'draw')
  assert.equal(match.playerWins, 0)
  assert.equal(match.opponentWins, 0)
  assert.equal(match.matchResult, null)

  const next = startNextRound(match)
  assert.equal(next.round, 2)
})

test('after three rounds the match falls back to round wins, then overall draw', () => {
  const tied = { ...readyMatch(), round: 3, playerWins: 1, opponentWins: 1 }
  const decided = finishRound(tied)
  assert.equal(decided.matchResult.winner, 'draw')

  const favored = { ...tied, playerWins: 1, opponentWins: 0 }
  assert.equal(finishRound(favored).matchResult.winner, 'player')
})

test('BSAA Chris boosts the lowest occupied player row when an opposing B.O.W. is present', () => {
  const bsaaLeader = { id: 'bsaa-chris-redfield', name: 'Chris Redfield' }
  const match = readyMatch({ ...playerLoadout, leader: bsaaLeader })
  const active = activateLeaderAbility({
    ...match,
    playerRows: { Melee: [playerCard('barry', 6, 'Melee')], Ranged: [], Siege: [] },
    opponentRows: { Melee: [], Ranged: [], Siege: [{ ...opponentCard('tyrant', 10, 'Siege'), cardType: 'bow' }] },
  })

  assert.equal(active.playerRowBonuses.Melee, 2)
  assert.equal(active.opponentRowBonuses.Siege, 0)
})

test('a fresh match starts in the mulligan phase and blocks battle actions', () => {
  const match = createMatchState(playerLoadout, opponentLoadout)

  assert.equal(match.phase, 'mulligan')
  assert.deepEqual(playPlayerCard(match, 'leon', 'Ranged'), match)
  assert.deepEqual(passPlayer(match), match)
  assert.deepEqual(activateLeaderAbility(match), match)
})

test('mulligan selection toggles and confirm swaps selected cards with the draw pile', () => {
  let match = createMatchState(playerLoadout, opponentLoadout)
  match = toggleMulliganCard(match, 'leon')
  match = toggleMulliganCard(match, 'rebecca')
  match = toggleMulliganCard(match, 'leon')

  assert.deepEqual(match.mulliganIds, ['rebecca'])

  const confirmed = confirmMulligan(match)

  assert.equal(confirmed.phase, 'battle')
  assert.deepEqual(confirmed.mulliganIds, [])
  assert.equal(confirmed.playerHand.some((card) => card.id === 'leon'), true)
  assert.equal(confirmed.playerHand.some((card) => card.id === 'rebecca'), false)
  assert.equal(confirmed.playerHand.some((card) => card.id === 'sherry'), true)
  assert.equal(confirmed.playerHand.length, HAND_SIZE)
  assert.equal(confirmed.playerDrawPile.length + confirmed.playerHand.length + confirmed.playerRows.Melee.length, playerLoadout.cards.length)
})

test('redrawn cards move to the bottom of the draw pile in selection order', () => {
  const match = toggleMulliganCard(createMatchState(playerLoadout, opponentLoadout), 'leon')
  const confirmed = confirmMulligan(toggleMulliganCard(match, 'barry'))

  const pileIds = confirmed.playerDrawPile.map((card) => card.id)
  assert.equal(pileIds.slice(-2).join(','), 'leon,barry')
})

test('confirming the mulligan is single-use and locks further redraws', () => {
  const confirmed = confirmMulligan(createMatchState(playerLoadout, opponentLoadout))

  assert.deepEqual(confirmMulligan(confirmed), confirmed)
  assert.deepEqual(toggleMulliganCard(confirmed, 'chris'), confirmed)
})

test('the AI redraws its weakest hand card only when the replacement is stronger', () => {
  const reinforcedOpponent = {
    ...opponentLoadout,
    cards: [
      ...opponentLoadout.cards,
      opponentCard('experiment', 7, 'Melee'),
      opponentCard('hunter-b', 5, 'Ranged'),
      opponentCard('ivory', 8, 'Ranged'),
      opponentCard('filler', 6, 'Siege'),
    ],
  }
  const confirmed = confirmMulligan({ ...createMatchState(playerLoadout, reinforcedOpponent), mulliganIds: [] })

  assert.equal(confirmed.opponentHand.some((card) => card.id === 'ganado'), false)
  assert.equal(confirmed.opponentHand.some((card) => card.id === 'experiment'), true)
  assert.equal(confirmed.opponentDrawPile.at(-1)?.id, 'ganado')

  const depletedPile = confirmMulligan(createMatchState(playerLoadout, opponentLoadout))
  assert.equal(depletedPile.opponentHand.some((card) => card.id === 'ganado'), true)
  assert.equal(depletedPile.opponentDrawPile.length, 0)
})

test('difficulty tiers scale the AI opening hand', () => {
  assert.equal(createMatchState(playerLoadout, opponentLoadout, { difficulty: 'recruit' }).opponentHand.length, Math.min(HAND_SIZE - 1, opponentLoadout.cards.length))
  assert.equal(createMatchState(playerLoadout, opponentLoadout, { difficulty: 'veteran' }).opponentHand.length, Math.min(HAND_SIZE, opponentLoadout.cards.length))
  assert.equal(createMatchState(playerLoadout, opponentLoadout, { difficulty: 'nemesis' }).opponentHand.length, Math.min(HAND_SIZE + 1, opponentLoadout.cards.length))
  assert.equal(createMatchState(playerLoadout, opponentLoadout).difficulty, 'veteran')
})

test('recruit AI never banks or tempers, nemesis banks aggressively', () => {
  const bankingState = {
    ...passPlayer(readyMatch()),
    opponentRows: { Melee: [opponentCard('bank', 10, 'Melee')], Ranged: [], Siege: [] },
    opponentHand: [opponentCard('s1', 3, 'Ranged'), opponentCard('s2', 3, 'Siege'), opponentCard('s3', 3, 'Melee')],
  }

  const recruit = resolveOpponentTurn({ ...bankingState, difficulty: 'recruit' })
  assert.equal(recruit.opponentPassed, true)
  assert.equal(recruit.opponentHand.length, 0)

  const nemesis = resolveOpponentTurn({ ...bankingState, difficulty: 'nemesis' })
  assert.equal(nemesis.opponentPassed, true)
  assert.equal(nemesis.opponentHand.length, 3)
})

test('hazard-row weakens the entered row on both sides', () => {
  const hazard = playerCard('hazard', 4, 'Melee', { effect: { type: 'hazard-row', amount: 1 } })
  const ally = playerCard('ally', 6, 'Melee')
  const enemy = opponentCard('enemy', 6, 'Melee')
  const match = readyMatch({ ...playerLoadout, cards: [hazard] })
  const prepared = { ...match, playerRows: { Melee: [ally], Ranged: [], Siege: [] }, opponentRows: { Melee: [enemy], Ranged: [], Siege: [] } }

  const next = playPlayerCard(prepared, hazard.id, hazard.row)

  assert.equal(next.playerRowBonuses.Melee, -1)
  assert.equal(next.opponentRowBonuses.Melee, -1)
  assert.equal(next.playerRowBonuses.Ranged, 0)
})



