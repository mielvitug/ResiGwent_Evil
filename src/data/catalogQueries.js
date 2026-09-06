import { cardTypes } from './cardTypes.js'
import { entries } from './entries.js'
import { factions } from './factions.js'
import { organizations } from './organizations.js'
import { origins } from './origins.js'

const factionNames = new Map(factions.map((faction) => [faction.id, faction.name]))
const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]))
const organizationShortNames = new Map(organizations.map((organization) => [organization.id, organization.shortName]))
const originNames = new Map(origins.map((origin) => [origin.id, origin.name]))
const entryNames = new Map(entries.map((entry) => [entry.id, entry.name]))
const cardTypeNames = new Map(cardTypes.map((type) => [type.id, type.name]))

export function getCardView(card) {
  return {
    ...card,
    factionName: factionNames.get(card.factionId) ?? card.factionId,
    organizationName: organizationNames.get(card.organizationId) ?? card.organizationId,
    organizationShortName: organizationShortNames.get(card.organizationId) ?? card.organizationId,
    originGroupName: originNames.get(card.originGroupId) ?? card.originGroupId,
    residentEvilEntryName: entryNames.get(card.residentEvilEntryId) ?? card.residentEvilEntryId,
    cardTypeName: cardTypeNames.get(card.cardType) ?? card.cardType,
  }
}

export function getLeaderView(leader) {
  const affiliatedIds = leader.affiliatedOrganizationIds ?? []
  const affiliatedNames = affiliatedIds.map((id) => organizationNames.get(id) ?? id)
  return {
    ...leader,
    factionName: factionNames.get(leader.factionId) ?? leader.factionId,
    organizationName: organizationNames.get(leader.organizationId) ?? leader.organizationId,
    organizationShortName: organizationShortNames.get(leader.organizationId) ?? leader.organizationId,
    affiliatedOrganizationIds: affiliatedIds,
    affiliatedOrganizationNames: affiliatedNames,
    organizationDisplayName: [...affiliatedNames, organizationNames.get(leader.organizationId) ?? leader.organizationId].join(' | '),
    originGroupName: originNames.get(leader.originGroupId) ?? leader.originGroupId,
    residentEvilEntryName: entryNames.get(leader.residentEvilEntryId) ?? leader.residentEvilEntryId,
    cardTypeName: cardTypeNames.get(leader.cardType) ?? leader.cardType,
  }
}

export function getFilterOptions(records, allLabel) {
  return {
    options: ['all', ...records.map((record) => record.id)],
    optionLabels: { all: allLabel, ...Object.fromEntries(records.map((record) => [record.id, record.uiName ?? record.name])) },
  }
}

function matchesSearch(record, search, fields) {
  const normalizedSearch = search.trim().toLowerCase()
  return !normalizedSearch || fields.some((field) => String(field ?? '').toLowerCase().includes(normalizedSearch))
}

export function filterCards(cardList, filters = {}) {
  const { search = '', factionId = 'all', organizationId = 'all', originGroupId = 'all', residentEvilEntryId = 'all', cardType = 'all', row = 'all' } = filters

  return cardList.filter((card) => {
    return (factionId === 'all' || card.factionId === factionId)
      && (organizationId === 'all' || card.organizationId === organizationId)
      && (originGroupId === 'all' || card.originGroupId === originGroupId)
      && (residentEvilEntryId === 'all' || card.residentEvilEntryId === residentEvilEntryId)
      && (cardType === 'all' || card.cardType === cardType)
      && (row === 'all' || card.row === row)
      && matchesSearch(card, search, [card.name, card.ability, organizationNames.get(card.organizationId), originNames.get(card.originGroupId), entryNames.get(card.residentEvilEntryId), cardTypeNames.get(card.cardType), card.row])
  })
}

export function filterLeaders(leaderList, filters = {}) {
  const { search = '', factionId = 'all', organizationId = 'all', originGroupId = 'all', residentEvilEntryId = 'all', includeUnavailable = true } = filters

  return leaderList.filter((leader) => {
    return (factionId === 'all' || leader.factionId === factionId)
      && (organizationId === 'all' || leader.organizationId === organizationId || (leader.affiliatedOrganizationIds ?? []).includes(organizationId))
      && (originGroupId === 'all' || leader.originGroupId === originGroupId)
      && (residentEvilEntryId === 'all' || leader.residentEvilEntryId === residentEvilEntryId)
      && (includeUnavailable || leader.isSelectable)
      && matchesSearch(leader, search, [leader.name, leader.version, leader.ability, organizationNames.get(leader.organizationId), ...(leader.affiliatedOrganizationIds ?? []).map((id) => organizationNames.get(id)), originNames.get(leader.originGroupId), entryNames.get(leader.residentEvilEntryId)])
  })
}
