import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { cards, cardTypes, entries, factions, leaders, organizations, origins } from './catalog.js'
import { filterCards, filterLeaders, getCardView, getLeaderView } from './catalogQueries.js'
import { ARCHETYPE_WEIGHT, cardValue, effectWeight, RARITY_VALUE_BAND, SIDE_AVG_POWER_TOLERANCE, MAX_LEGENDARIES_PER_ORGANIZATION } from './balance.js'
import { validateCatalog } from './catalogValidation.js'

test('card balance stays on the side curve', () => {
  const sideAverage = (factionId) => {
    const sideCards = cards.filter((card) => card.factionId === factionId)
    return sideCards.reduce((sum, card) => sum + card.power, 0) / sideCards.length
  }
  const counterforce = sideAverage('counterforce')
  const bioterrorism = sideAverage('bioterrorism')

  assert.ok(Math.abs(counterforce - bioterrorism) <= SIDE_AVG_POWER_TOLERANCE, `side averages diverge: ${counterforce} vs ${bioterrorism}`)
})

test('card values stay inside rarity bands and use known effect weights', () => {  cards.forEach((card) => {
    if (card.evolution) {
      assert.ok(card.evolution.stages.length >= 2, `${card.id} evolution needs 2+ stages`)
      card.evolution.stages.forEach((stage, index) => {
        assert.ok(Number.isInteger(stage.power) && stage.power >= 2 && stage.power <= 15, `${card.id} stage ${index} power ${stage.power} outside 2-15`)
        assert.ok(typeof stage.artwork === 'string' && stage.artwork.length > 0, `${card.id} stage ${index} needs artwork`)
        const artFile = stage.artwork.includes('.') ? stage.artwork : `${stage.artwork}.png`
        assert.ok(existsSync(`public/images/cards/${artFile}`), `${card.id} stage ${index} art missing: ${artFile}`)
        if (index > 0) assert.ok(stage.power >= card.evolution.stages[index - 1].power, `${card.id} stages must not weaken`)
      })
      return
    }
    const band = RARITY_VALUE_BAND[card.rarity]
    const value = cardValue(card)
    assert.ok(value >= band.min && value <= band.max, `${card.id} value ${value} outside ${card.rarity} band`)
    if (card.effect) {
      assert.notEqual(ARCHETYPE_WEIGHT[card.effect.type], undefined, `${card.id} uses unknown archetype ${card.effect.type}`)
      assert.ok(effectWeight(card.effect) > 0)
    }
  })
})

test('legendary counts stay capped per organization', () => {
  organizations.forEach((organization) => {
    const legendaries = cards.filter((card) => card.organizationId === organization.id && card.rarity === 'legendary').length
    assert.ok(legendaries <= MAX_LEGENDARIES_PER_ORGANIZATION, `${organization.id} has ${legendaries} legendaries`)
  })
})

test('catalog has exactly two playable factions', () => {
  assert.equal(factions.length, 2)
  assert.deepEqual(new Set(factions.map((faction) => faction.id)), new Set(['counterforce', 'bioterrorism']))
  assert.equal(organizations.length, 7)
  assert.deepEqual(new Set(organizations.map((organization) => organization.factionId)), new Set(['counterforce', 'bioterrorism']))
  assert.equal(factions.some((faction) => faction.name === 'The Village'), false)
  assert.equal(factions.some((faction) => faction.name === 'S.T.A.R.S.'), false)
})

test('counterforce organizations own their origins', () => {
  assert.equal(organizations.find((organization) => organization.id === 'rpd')?.factionId, 'counterforce')
  assert.equal(organizations.find((organization) => organization.id === 'bsaa')?.factionId, 'counterforce')
  assert.equal(organizations.find((organization) => organization.id === 'dso')?.factionId, 'counterforce')
  assert.equal(organizations.find((organization) => organization.id === 'fbi')?.factionId, 'counterforce')
  assert.equal(origins.find((origin) => origin.id === 'rpd-officers')?.organizationId, 'rpd')
  assert.equal(origins.find((origin) => origin.id === 'stars')?.organizationId, 'rpd')
  assert.equal(origins.find((origin) => origin.id === 'survivors')?.organizationId, 'rpd')
  assert.equal(origins.find((origin) => origin.id === 'bsaa-operations')?.organizationId, 'bsaa')
})

test('The Village remains an origin under The Connections organization', () => {
  assert.equal(organizations.find((organization) => organization.id === 'connections')?.factionId, 'bioterrorism')
  assert.equal(origins.find((origin) => origin.id === 'the-village')?.organizationId, 'connections')
})

test('B.O.W. is a card type and not a faction or organization', () => {
  assert.equal(cardTypes.some((type) => type.id === 'bow'), true)
  assert.equal(factions.some((faction) => faction.id === 'bow'), false)
  assert.equal(organizations.some((organization) => organization.id === 'bow'), false)
})

test('faction-wide Leader pools span organizations', () => {
  const counterforceLeaders = leaders.filter((leader) => leader.factionId === 'counterforce')
  const bioterrorismLeaders = leaders.filter((leader) => leader.factionId === 'bioterrorism')

  assert.equal(counterforceLeaders.length, 8)
  assert.ok(new Set(counterforceLeaders.map((leader) => leader.organizationId)).size >= 2)
  assert.equal(leaders.find((leader) => leader.id === 'rpd-leon-kennedy')?.isDefault, true)
  assert.equal(counterforceLeaders.filter((leader) => leader.isDefault).length, 1)
  assert.equal(bioterrorismLeaders.filter((leader) => leader.isDefault).length, 1)
  assert.equal(leaders.some((leader) => leader.id === 'rpd-claire-redfield'), false)
  assert.equal(leaders.some((leader) => leader.id === 'stars-wesker-captain'), true)
  assert.equal(leaders.some((leader) => leader.id === 'umbrella-wesker'), true)
})

test('DSO and FBI launch with starter cards', () => {
  const dsoCards = cards.filter((card) => card.organizationId === 'dso')
  const fbiCards = cards.filter((card) => card.organizationId === 'fbi')

  assert.ok(dsoCards.length >= 4)
  assert.ok(dsoCards.some((card) => card.name === 'Leon S. Kennedy - D.S.O Agent'))
  assert.ok(leaders.some((leader) => leader.id === 'dso-leon-kennedy-requiem' && leader.organizationId === 'dso' && leader.residentEvilEntryId === 're9-requiem'))
  assert.ok(leaders.some((leader) => leader.id === 'fbi-leon-kennedy-re4' && leader.organizationId === 'fbi' && leader.residentEvilEntryId === 're4'))
  assert.ok(dsoCards.some((card) => card.name === 'Helena Harper' && card.residentEvilEntryId === 're6'))
  assert.ok(fbiCards.some((card) => card.name === 'Grace Ashcroft'))
  assert.equal(cards.find((card) => card.name === 'Grace Ashcroft')?.factionId, 'counterforce')
})

test('The Connections keeps its locked Leader roster and Lucas stays a normal card', () => {
  const connectionLeaderIds = leaders.filter((leader) => leader.organizationId === 'connections').map((leader) => leader.id).sort()
  assert.deepEqual(connectionLeaderIds, ['connections-eveline', 'connections-mother-miranda-leader', 'connections-victor-gideon'])
  assert.equal(leaders.some((leader) => leader.id === 'connections-lucas-baker'), false)

  const motherMirandaLeader = leaders.find((leader) => leader.id === 'connections-mother-miranda-leader')
  assert.equal(motherMirandaLeader?.originGroupId, 'the-village')
  assert.equal(motherMirandaLeader?.residentEvilEntryId, 'village')
  assert.equal(motherMirandaLeader?.cardType, 'mutant')
  assert.equal(motherMirandaLeader?.isSelectable, true)

  const eveline = leaders.find((leader) => leader.id === 'connections-eveline')
  assert.equal(eveline?.originGroupId, 'molded')
  assert.equal(eveline?.cardType, 'mutant')
  assert.equal(eveline?.isDefault, true)

  const lucas = cards.find((card) => card.id === 'connections-lucas-baker')
  assert.deepEqual(lucas && { organizationId: lucas.organizationId, originGroupId: lucas.originGroupId, residentEvilEntryId: lucas.residentEvilEntryId, cardType: lucas.cardType }, { organizationId: 'connections', originGroupId: 'the-baker-family', residentEvilEntryId: 're7', cardType: 'human' })
})

test('Victor Gideon carries dual Umbrella and Connections ties', () => {
  const gideon = leaders.find((leader) => leader.id === 'connections-victor-gideon')
  assert.deepEqual(gideon?.affiliatedOrganizationIds, ['umbrella'])
  assert.equal(getLeaderView(gideon).organizationDisplayName, 'Umbrella Corporation | The Connections')
  assert.equal(filterLeaders(leaders, { organizationId: 'umbrella' }).some((leader) => leader.id === 'connections-victor-gideon'), true)
  assert.equal(filterLeaders(leaders, { organizationId: 'connections' }).some((leader) => leader.id === 'connections-victor-gideon'), true)

  const bogusTies = leaders.map((leader) => leader.id === 'connections-victor-gideon' ? { ...leader, affiliatedOrganizationIds: ['unknown-org'] } : leader)
  assert.equal(validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders: bogusTies, cards }).some((error) => error.includes('unknown-org')), true)
})

test('catalog validation rejects forbidden primary entries and invalid hierarchy', () => {
  assert.deepEqual(validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders, cards }), [])

  const invalidCards = [...cards, { ...cards[0], id: 'invalid-bow', factionId: 'bow' }]
  const errors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders, cards: invalidCards })
  assert.equal(errors.some((error) => error.includes('invalid-bow')), true)

  const invalidEntries = [...entries, { id: 'legacy-entry', name: 'Resident Evil 5', isPrimary: true }]
  const entryErrors = validateCatalog({ factions, organizations, origins, entries: invalidEntries, cardTypes, leaders, cards })
  assert.equal(entryErrors.some((error) => error.includes('legacy-entry')), true)

  const invalidOrigins = [...origins, { id: 'wrong-origin', name: 'Wrong Origin', organizationId: 'unknown-org' }]
  const originErrors = validateCatalog({ factions, organizations, origins: invalidOrigins, entries, cardTypes, leaders, cards: [{ ...cards[0], id: 'wrong-origin-card', originGroupId: 'wrong-origin' }] })
  assert.equal(originErrors.some((error) => error.includes('wrong-origin-card')), true)

  const missingEntryErrors = validateCatalog({ factions, organizations, origins, entries: entries.filter((entry) => entry.id !== 're4'), cardTypes, leaders, cards })
  assert.equal(missingEntryErrors.some((error) => error.includes('six locked primary')), true)

  const fourthConnectionsLeader = { ...leaders.find((leader) => leader.id === 'connections-victor-gideon'), id: 'connections-extra-leader' }
  const fourthLeaderErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders: [...leaders, fourthConnectionsLeader], cards })
  assert.equal(fourthLeaderErrors.some((error) => error.includes('exactly Eveline')), true)

  const lucasLeader = { ...leaders.find((leader) => leader.id === 'connections-eveline'), id: 'connections-lucas-leader', name: 'Lucas Baker' }
  const lucasLeaderErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders: [...leaders, lucasLeader], cards })
  assert.equal(lucasLeaderErrors.some((error) => error.includes('Lucas Baker cannot')), true)

  const invalidDefaultLeaders = leaders.map((leader) => leader.id === 'connections-eveline' ? { ...leader, isDefault: false } : leader)
  const defaultErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders: invalidDefaultLeaders, cards })
  assert.equal(defaultErrors.some((error) => error.includes('Eveline must be the only default')), true)

  const missingMotherMirandaCardErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders, cards: cards.filter((card) => card.id !== 'connections-mother-miranda') })
  assert.equal(missingMotherMirandaCardErrors.some((error) => error.includes('separate normal Mutant')), true)

  const missingConnectionsCardErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders, cards: cards.filter((card) => card.id !== 'connections-molded') })
  assert.equal(missingConnectionsCardErrors.some((error) => error.includes('missing required card')), true)

  const invalidVictorGideon = leaders.map((leader) => leader.id === 'connections-victor-gideon' ? { ...leader, cardType: 'unknown' } : leader)
  const invalidVictorGideonErrors = validateCatalog({ factions, organizations, origins, entries, cardTypes, leaders: invalidVictorGideon, cards })
  assert.equal(invalidVictorGideonErrors.some((error) => error.includes('connections-victor-gideon')), true)
})

test('card and leader queries share normalized filters', () => {
  const counterforceCards = filterCards(cards, { factionId: 'counterforce' })
  const dsoCards = filterCards(cards, { organizationId: 'dso' })
  const re4Leaders = filterLeaders(leaders, { residentEvilEntryId: 're4' })

  assert.equal(counterforceCards.length >= 54, true)
  assert.equal(dsoCards.length >= 4, true)
  assert.equal(counterforceCards.some((card) => card.originGroupId === 'stars'), true)
  assert.equal(counterforceCards.some((card) => card.originGroupId === 'rpd-officers'), true)
  assert.equal(counterforceCards.every((card) => card.factionId === 'counterforce'), true)
  const nonOfficerNames = ['Alyssa Ashcroft', 'Cindy Lennox', 'Ben Bertolucci', 'Robert Kendo', 'Sherry Birkin', 'Ada Wong - Raccoon City', 'Mayor Warren']
  nonOfficerNames.forEach((name) => assert.equal(counterforceCards.some((card) => card.name === name && card.organizationId === 'rpd'), false, `${name} must not be classified as R.P.D. personnel`))
  ;['Marvin Branagh', 'Brian Irons'].forEach((name) => assert.equal(counterforceCards.some((card) => card.name === name && card.originGroupId === 'rpd-officers'), true, `${name} should be an R.P.D. Officers card`))
  assert.equal(counterforceCards.some((card) => card.name === 'Kevin Dooley'), false)
  assert.equal(counterforceCards.some((card) => card.name === 'Elliot Edward'), false)
  assert.equal(re4Leaders.every((leader) => leader.residentEvilEntryId === 're4'), true)

  assert.equal(getCardView(cards.find((card) => card.id === 'connections-lucas-baker')).originGroupName, 'The Baker Family')
  assert.equal(getLeaderView(leaders.find((leader) => leader.id === 'connections-victor-gideon')).cardTypeName, 'Human')
})

test('fact-checked card assignments preserve canon affiliations', () => {
  const rpdCards = cards.filter((card) => card.organizationId === 'rpd')
  const forbiddenRpdNames = ['Alyssa Ashcroft', 'Cindy Lennox', 'Ben Bertolucci', 'Robert Kendo', 'Sherry Birkin', 'Ada Wong - Raccoon City', 'Mayor Warren']
  forbiddenRpdNames.forEach((name) => assert.equal(rpdCards.some((card) => card.name === name), false))
  assert.equal(rpdCards.some((card) => card.residentEvilEntryId === 'outbreak' && card.cardType === 'human'), false)
  assert.equal(cards.some((card) => card.name === "Barry's Colt Python" && card.organizationId === 'rpd'), true)

  const houndWolfCards = cards.filter((card) => card.originGroupId === 'hound-wolf-squad')
  assert.equal(houndWolfCards.some((card) => card.name === 'Night Howl' && card.cardType === 'human'), true)
  assert.equal(houndWolfCards.some((card) => card.name === 'Tundra'), true)
  assert.equal(cards.find((card) => card.name === 'Cerberus')?.residentEvilEntryId, 're1')
  assert.equal(cards.find((card) => card.name === 'Drain Deimos')?.cardType, 'creature')
  assert.equal(cards.find((card) => card.name === 'Ganado')?.cardType, 'human')
  assert.equal(cards.find((card) => card.name === 'Bitores Mendez')?.originGroupId, 'las-plagas')
  assert.equal(cards.find((card) => card.name === 'R.P.D. Shotgun')?.metadata.canonStatus, 'prototype-original')
})

test('unit extras survive catalog assembly (effects, recurring, hideTypeChip)', () => {
  // ponytail: regression for the silent unit() drop — Sturm's flame and Saddler's plagas boost vanished in real matches while tests bypassed unit()
  const joe = cards.find((card) => card.id === 'bsaa-joe-baker')
  assert.deepEqual(joe.effect, { type: 'boost-self', amount: 2 })
  assert.deepEqual(joe.recurring, { every: 2, effect: { type: 'damage-random-opponent', amount: 2 } })
  const saddler = cards.find((card) => card.id === 'los-iluminados-saddler-mutated')
  assert.ok((saddler.effects ?? []).some((effect) => effect.type === 'boost-allied-origin'))
  const sturm = cards.find((card) => card.id.endsWith('sturm'))
  assert.ok(sturm.recurring)
  assert.equal(cards.find((card) => card.id === 'bsaa-chris-bsaa-card').holdout, true)
})
