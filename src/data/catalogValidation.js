const validRows = new Set(['Melee', 'Ranged', 'Siege'])
const forbiddenEntryNames = new Set(['resident evil 5', 'resident evil 6'])
const requiredFactionIds = new Set(['counterforce', 'bioterrorism'])
const requiredOrganizationIds = new Set(['rpd', 'bsaa', 'dso', 'fbi', 'umbrella', 'los-iluminados', 'connections'])
const allowedPrimaryEntryIds = new Set(['re2', 're3', 're4', 're7', 'village', 're9-requiem'])
const connectionsLeaderIds = new Set(['connections-eveline', 'connections-mother-miranda-leader', 'connections-victor-gideon'])
const requiredConnectionCardIds = new Set(['connections-jack-baker', 'connections-lucas-baker', 'connections-molded', 'connections-mother-miranda'])
const requiredRpdOriginIds = new Set(['rpd-officers', 'stars', 'survivors'])
const forbiddenRpdCardNames = new Set(['Alyssa Ashcroft', 'Cindy Lennox', 'Ben Bertolucci', 'Robert Kendo', 'Sherry Birkin', 'Ada Wong - Raccoon City', 'Mayor Warren'])

function duplicateIds(records, label) {
  const seen = new Set()
  return records.reduce((errors, record) => {
    if (seen.has(record.id)) {
      errors.push(`${label} has duplicate id: ${record.id}`)
    }
    seen.add(record.id)
    return errors
  }, [])
}

export function validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders, cards }) {
  const factionIds = new Set(factions.map((faction) => faction.id))
  const organizationIds = new Set(organizations.map((organization) => organization.id))
  const organizationsById = new Map(organizations.map((organization) => [organization.id, organization]))
  const originsById = new Map(origins.map((origin) => [origin.id, origin]))
  const entryIds = new Set(entries.map((entry) => entry.id))
  const cardTypeIds = new Set(cardTypes.map((type) => type.id))
  const errors = [
    ...duplicateIds(factions, 'Factions'),
    ...duplicateIds(organizations, 'Organizations'),
    ...duplicateIds(origins, 'Origins'),
    ...duplicateIds(entries, 'Entries'),
    ...duplicateIds(cardTypes, 'Card types'),
    ...duplicateIds(leaders, 'Leaders'),
    ...duplicateIds(cards, 'Cards'),
  ]

  const allRecordIds = new Set()
  ;[...leaders, ...cards].forEach((record) => {
    if (allRecordIds.has(record.id)) errors.push(`Card and leader IDs must be globally unique: ${record.id}`)
    allRecordIds.add(record.id)
  })

  if (factions.length !== 2) errors.push('Catalog must contain exactly two playable factions.')
  if (factions.some((faction) => !requiredFactionIds.has(faction.id)) || requiredFactionIds.size !== factions.length || [...requiredFactionIds].some((id) => !factionIds.has(id))) errors.push('Catalog must contain the locked two playable faction IDs.')
  if (factions.some((faction) => faction.name === 'The Village')) errors.push('The Village cannot be a playable faction.')
  if (factionIds.has('stars')) errors.push('S.T.A.R.S. must be an Origin / Group under R.P.D.')
  if (organizations.some((organization) => organization.id === 'bow' || organization.name === 'B.O.W.')) errors.push('B.O.W. cannot be an organization.')

  organizations.forEach((organization) => {
    if (!factionIds.has(organization.factionId)) errors.push(`Organization ${organization.id} references an unknown faction.`)
  })

  origins.forEach((origin) => {
    const organization = organizationsById.get(origin.organizationId)
    if (!organization) errors.push(`Origin ${origin.id} references an unknown organization.`)
    if (origin.id === 'the-village' && origin.organizationId !== 'connections') errors.push('The Village origin must belong to The Connections.')
  })

  const rpdOriginIds = new Set(origins.filter((origin) => origin.organizationId === 'rpd').map((origin) => origin.id))
  if (rpdOriginIds.size !== requiredRpdOriginIds.size || [...requiredRpdOriginIds].some((id) => !rpdOriginIds.has(id))) errors.push('R.P.D. must contain exactly R.P.D. Officers, S.T.A.R.S., and Survivors origins.')

  entries.forEach((entry) => {
    if (entry.isPrimary && !allowedPrimaryEntryIds.has(entry.id)) errors.push(`Unsupported primary entry: ${entry.id}`)
    if (entry.isPrimary && forbiddenEntryNames.has(entry.name.toLowerCase())) errors.push(`Forbidden primary entry: ${entry.id}`)
  })
  const primaryEntryIds = new Set(entries.filter((entry) => entry.isPrimary).map((entry) => entry.id))
  if (primaryEntryIds.size !== allowedPrimaryEntryIds.size || [...allowedPrimaryEntryIds].some((id) => !primaryEntryIds.has(id))) errors.push('Catalog must contain the six locked primary Resident Evil entries.')

  leaders.forEach((leader) => {
    const organization = organizationsById.get(leader.organizationId)
    if (!organization) errors.push(`Leader ${leader.id} references an unknown organization.`)
    if (organization && leader.factionId !== organization.factionId) errors.push(`Leader ${leader.id} faction does not match its organization.`)
    for (const affiliatedId of leader.affiliatedOrganizationIds ?? []) {
      const affiliated = organizationsById.get(affiliatedId)
      if (!affiliated) errors.push(`Leader ${leader.id} references an unknown affiliated organization: ${affiliatedId}.`)
      else if (leader.factionId !== affiliated.factionId) errors.push(`Leader ${leader.id} faction does not match its affiliated organization.`)
    }
    if (leader.originGroupId && !originsById.has(leader.originGroupId)) errors.push(`Leader ${leader.id} references an unknown origin.`)
    const leaderOrigin = originsById.get(leader.originGroupId)
    if (leaderOrigin && leaderOrigin.organizationId !== leader.organizationId) errors.push(`Leader ${leader.id} origin belongs to another organization.`)
    if (leader.residentEvilEntryId && !entryIds.has(leader.residentEvilEntryId)) errors.push(`Leader ${leader.id} references an unknown entry.`)
    if (leader.cardType && !cardTypeIds.has(leader.cardType)) errors.push(`Leader ${leader.id} references an unknown classification.`)
    if (leader.status === 'tbd' && leader.isSelectable) errors.push(`TBD leader cannot be selectable: ${leader.id}`)
  })

  requiredFactionIds.forEach((factionId) => {
    const factionDefaults = leaders.filter((leader) => leader.factionId === factionId && leader.isDefault)
    if (factionDefaults.length !== 1) errors.push(`Faction ${factionId} must have exactly one default Leader.`)
  })

  const connectionLeaders = leaders.filter((leader) => leader.organizationId === 'connections')
  if (connectionLeaders.length !== connectionsLeaderIds.size || connectionLeaders.some((leader) => !connectionsLeaderIds.has(leader.id))) errors.push('The Connections must contain exactly Eveline, Mother Miranda, and Victor Gideon as Leaders.')
  if (connectionLeaders.filter((leader) => leader.isDefault).map((leader) => leader.id).join() !== 'connections-eveline') errors.push('Eveline must be the only default Connections Leader.')
  if (leaders.some((leader) => leader.id === 'connections-lucas-baker' || (leader.organizationId === 'connections' && leader.name === 'Lucas Baker'))) errors.push('Lucas Baker cannot be a Connections Leader.')
  ;[...requiredConnectionCardIds].forEach((id) => {
    if (!cards.some((card) => card.id === id)) errors.push(`The Connections roster is missing required card: ${id}`)
  })
  if (connectionLeaders.some((leader) => leader.status !== 'confirmed' || !leader.isSelectable)) errors.push('Confirmed Connections Leaders must be selectable.')

  cards.forEach((card) => {
    const organization = organizationsById.get(card.organizationId)
    if (!organization) errors.push(`Card ${card.id} references an unknown organization: ${card.organizationId}`)
    if (organization && card.factionId !== organization.factionId) errors.push(`Card ${card.id} faction does not match its organization.`)
    if (!originsById.has(card.originGroupId)) errors.push(`Card ${card.id} references an unknown origin.`)
    const cardOrigin = originsById.get(card.originGroupId)
    if (cardOrigin && cardOrigin.organizationId !== card.organizationId) errors.push(`Card ${card.id} origin belongs to another organization.`)
    if (!entryIds.has(card.residentEvilEntryId)) errors.push(`Card ${card.id} references an unknown entry.`)
    if (!cardTypeIds.has(card.cardType)) errors.push(`Card ${card.id} references an unknown card type.`)
    if (!validRows.has(card.row)) errors.push(`Card ${card.id} references an invalid row.`)
    if (!Number.isInteger(card.power) || card.power < 2 || card.power > 10) errors.push(`Card ${card.id} power must be an integer between 2 and 10.`)
    if (card.organizationId === 'rpd' && forbiddenRpdCardNames.has(card.name)) errors.push(`${card.name} cannot be classified as R.P.D. personnel.`)
  })

  const lucas = cards.find((card) => card.id === 'connections-lucas-baker')
  if (!lucas || lucas.organizationId !== 'connections' || lucas.originGroupId !== 'the-baker-family' || lucas.residentEvilEntryId !== 're7' || lucas.cardType !== 'human') errors.push('Lucas Baker must be a Human card under The Baker Family in Resident Evil 7.')
  const motherMirandaLeader = leaders.find((leader) => leader.id === 'connections-mother-miranda-leader')
  if (!motherMirandaLeader || motherMirandaLeader.originGroupId !== 'the-village' || motherMirandaLeader.residentEvilEntryId !== 'village' || motherMirandaLeader.cardType !== 'mutant') errors.push('Mother Miranda Leader must be a Mutant from The Village in Resident Evil Village.')
  const motherMirandaCard = cards.find((card) => card.id === 'connections-mother-miranda')
  if (!motherMirandaCard || motherMirandaCard.organizationId !== 'connections' || motherMirandaCard.originGroupId !== 'the-village' || motherMirandaCard.residentEvilEntryId !== 'village' || motherMirandaCard.cardType !== 'mutant') errors.push('Mother Miranda must have a separate normal Mutant card under The Village.')
  const eveline = leaders.find((leader) => leader.id === 'connections-eveline')
  if (!eveline || eveline.originGroupId !== 'molded' || eveline.residentEvilEntryId !== 're7' || eveline.cardType !== 'mutant') errors.push('Eveline Leader must be a Mutant from Molded in Resident Evil 7.')
  const victorGideon = leaders.find((leader) => leader.id === 'connections-victor-gideon')
  if (!victorGideon || victorGideon.originGroupId !== 'requiem' || victorGideon.residentEvilEntryId !== 're9-requiem' || victorGideon.cardType !== 'human') errors.push('Victor Gideon Leader must be a Human from Requiem in Resident Evil 9: Requiem.')

  return errors
}
