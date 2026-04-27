import {
  DEFAULT_PROFILE_FORMAT,
  formatFromAvailability,
  getProfileFormatLabel,
  normalizeProfileFormat,
} from './contracts/profileEnums'

const WEIGHTS = {
  category: 30,
  tags: 25,
  goal: 20,
  format: 15,
  level: 10,
}

function normalizeText(value) {
  return String(value ?? '').trim().toLowerCase()
}

function toArray(value) {
  if (Array.isArray(value)) return value
  if (!value) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function buildSet(values) {
  return new Set(values.map((item) => normalizeText(item)).filter(Boolean))
}

function jaccard(aSet, bSet) {
  if (aSet.size === 0 && bSet.size === 0) return 0
  const intersection = [...aSet].filter((value) => bSet.has(value)).length
  const union = new Set([...aSet, ...bSet]).size
  return union === 0 ? 0 : intersection / union
}

function levelToNumber(level) {
  const map = {
    junior: 1,
    beginner: 1,
    trainee: 1,
    middle: 2,
    intermediate: 2,
    senior: 3,
    lead: 4,
    principal: 5,
  }
  return map[normalizeText(level)] ?? 2
}

function getGoalText(profile) {
  const fromRequest = normalizeText(profile?.request)
  if (fromRequest) return fromRequest

  const fromGoal = normalizeText(profile?.goal)
  if (fromGoal) return fromGoal

  const goals = toArray(profile?.goals)
  return normalizeText(goals.join(' '))
}

function extractKeywords(goalText) {
  return goalText
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zа-я0-9+#]/gi, ''))
    .filter((word) => word.length >= 3)
}

function getFormatBucket(profile) {
  const normalized = normalizeProfileFormat(profile?.format, { fallback: null })
  if (normalized) return normalized

  const byAvailability = formatFromAvailability(profile?.availability)
  if (byAvailability) return byAvailability

  // Safe default to keep matching deterministic even with legacy/corrupt values.
  return DEFAULT_PROFILE_FORMAT
}

function getCategory(profile) {
  return normalizeText(profile?.industry)
}

export function isRelevantCategory(myProfile, candidate) {
  const myCategory = getCategory(myProfile)
  const candidateCategory = getCategory(candidate)

  if (!myCategory || !candidateCategory) return false
  return myCategory === candidateCategory
}

export function scoreCandidate(myProfile, candidate) {
  const reasons = []

  let categoryScore = 0
  if (isRelevantCategory(myProfile, candidate)) {
    categoryScore = 1
    reasons.push(`Совпадает категория: ${candidate.industry}`)
  }

  const myTags = buildSet(toArray(myProfile?.tags))
  const candidateTags = buildSet(toArray(candidate?.tags))
  const tagScore = jaccard(myTags, candidateTags)
  if (tagScore > 0) {
    const commonTags = [...myTags].filter((tag) => candidateTags.has(tag)).slice(0, 3)
    if (commonTags.length) {
      reasons.push(`Общие теги: ${commonTags.join(', ')}`)
    }
  }

  const goalKeywords = extractKeywords(getGoalText(myProfile))
  const candidateGoalBlob = normalizeText(`${candidate?.bio ?? ''} ${(candidate?.tags ?? []).join(' ')}`)
  const matchedKeywords = goalKeywords.filter((keyword) => candidateGoalBlob.includes(keyword))
  const goalScore = goalKeywords.length ? matchedKeywords.length / goalKeywords.length : 0
  if (goalScore > 0) {
    reasons.push('Кандидат релевантен вашей цели')
  }

  const myFormat = getFormatBucket(myProfile)
  const candidateFormat = getFormatBucket(candidate)
  const formatScore = myFormat === candidateFormat ? 1 : 0
  if (formatScore > 0) {
    reasons.push(`Подходящий формат: ${getProfileFormatLabel(myFormat, { short: true, fallback: 'Любой' })}`)
  }

  const myLevel = levelToNumber(myProfile?.current_level)
  const candidateLevel = levelToNumber(candidate?.current_level)
  const levelDiff = Math.abs(myLevel - candidateLevel)
  const levelScore = Math.max(0, 1 - levelDiff / 3)
  if (levelScore >= 0.66) {
    reasons.push('Близкий уровень взаимодействия')
  }

  const rawScore =
    categoryScore * WEIGHTS.category +
    tagScore * WEIGHTS.tags +
    goalScore * WEIGHTS.goal +
    formatScore * WEIGHTS.format +
    levelScore * WEIGHTS.level

  return {
    score: Math.round(Math.min(100, rawScore)),
    reasons: reasons.slice(0, 3),
  }
}

export function rankFeed(myProfile, feed) {
  const enriched = (feed ?? []).map((candidate) => {
    const { score, reasons } = scoreCandidate(myProfile, candidate)
    return {
      ...candidate,
      match_score: score,
      match_reasons: reasons,
      category_relevant: isRelevantCategory(myProfile, candidate),
    }
  })

  const relevant = enriched
    .filter((item) => item.category_relevant)
    .sort((a, b) => b.match_score - a.match_score)

  const fallback = enriched
    .filter((item) => !item.category_relevant)
    .sort((a, b) => b.match_score - a.match_score)

  return [...relevant, ...fallback]
}
