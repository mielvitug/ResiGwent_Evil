export const DIFFICULTY_ORDER = ['recruit', 'veteran', 'nemesis']

const LABELS = {
  counterforce: {
    recruit: 'Ganado',
    veteran: 'Jack Baker',
    nemesis: 'Nemesis',
  },
  bioterrorism: {
    recruit: 'Rookie Cop',
    veteran: 'S.T.A.R.S.',
    nemesis: 'Leon S. Kennedy',
  },
}

const FALLBACK = {
  recruit: 'Recruit',
  veteran: 'Veteran',
  nemesis: 'Nemesis',
}

export function difficultyLabel(id, factionId) {
  return LABELS[factionId]?.[id] ?? FALLBACK[id] ?? id
}
