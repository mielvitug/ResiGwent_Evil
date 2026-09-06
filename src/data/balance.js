export const ARCHETYPE_WEIGHT = {
  none: 0,
  'boost-self': 1,
  'boost-row': 2,
  'boost-allied-bow': 2,
  'boost-allied-origin': 2,
  'boost-self-per-ally': 1.5,
  'boost-weakest-ally': 1,
  'weaken-opponent-bow': 1.5,
  'damage-strongest': 1.5,
  'damage-random-opponent': 1,
  'boost-random-ally': 1,
  'boost-occupied-rows': 2,
  'damage-all-opponents': 3,
  deathburst: 1,
  'weaken-opponent-row': 2,
  'damage-mirror-row': 2,
  'hazard-row': 1.5,
}

export const CONDITION_DISCOUNT = {
  'opponent-bow': 0.3,
  'hand-at-most-2': 0.3,
}

export const RARITY_VALUE_BAND = {
  common: { min: 2, max: 10 },
  uncommon: { min: 4, max: 9 },
  rare: { min: 4.5, max: 11.5 },
  legendary: { min: 8, max: 13 },
}

export const SIDE_AVG_POWER_TOLERANCE = 0.5
export const MAX_LEGENDARIES_PER_ORGANIZATION = 6

export function effectWeight(effect) {
  if (!effect) return ARCHETYPE_WEIGHT.none
  const base = ARCHETYPE_WEIGHT[effect.type]
  if (base === undefined) return 0
  const scaled = base * (effect.amount ?? 1)
  const discount = effect.condition ? CONDITION_DISCOUNT[effect.condition] ?? 0 : 0
  return Math.round((scaled * (1 - discount)) * 100) / 100
}

export function cardValue(card) {
  return card.power + [card.effect, ...(card.effects ?? [])].filter(Boolean).reduce((sum, effect) => sum + effectWeight(effect), 0)
}
