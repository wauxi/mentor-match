const CANONICAL_FORMATS = ['regular', 'case_review', 'one_time']
const CANONICAL_URGENCY = ['low', 'medium', 'high']

export const DEFAULT_PROFILE_FORMAT = 'case_review'
export const DEFAULT_URGENCY = 'medium'

const FORMAT_ALIASES = {
  regular: 'regular',
  case_review: 'case_review',
  one_time: 'one_time',
  онлайн: 'regular',
  офлайн: 'case_review',
  любой: 'one_time',
}

const URGENCY_ALIASES = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  'не горит': 'low',
  'не срочно': 'low',
  'в течение месяца': 'medium',
  срочно: 'high',
}

function normalizeKey(value) {
  return String(value ?? '').trim().toLowerCase()
}

export function formatFromAvailability(availability) {
  const hours = Number(availability ?? 0)
  if (Number.isNaN(hours) || hours <= 0) return null
  if (hours >= 8) return 'regular'
  if (hours >= 3) return 'case_review'
  return 'one_time'
}

export function normalizeProfileFormat(value, { fallback = DEFAULT_PROFILE_FORMAT } = {}) {
  const normalized = normalizeKey(value)
  if (!normalized) return fallback

  const mapped = FORMAT_ALIASES[normalized]
  if (mapped && CANONICAL_FORMATS.includes(mapped)) return mapped

  return fallback
}

export function normalizeUrgency(value, { fallback = DEFAULT_URGENCY } = {}) {
  const normalized = normalizeKey(value)
  if (!normalized) return fallback

  const mapped = URGENCY_ALIASES[normalized]
  if (mapped && CANONICAL_URGENCY.includes(mapped)) return mapped

  return fallback
}

export const PROFILE_FORMAT_OPTIONS = [
  { value: 'regular', label: 'Онлайн' },
  { value: 'case_review', label: 'Офлайн' },
  { value: 'one_time', label: 'Любой' },
]

export const PROFILE_URGENCY_OPTIONS = [
  { value: 'high', label: 'Срочно' },
  { value: 'medium', label: 'В течение месяца' },
  { value: 'low', label: 'Не горит' },
]

export const PROFILE_FORMAT_LABELS = {
  regular: 'Онлайн',
  case_review: 'Офлайн',
  one_time: 'Любой',
}

export const PROFILE_FORMAT_LABELS_SHORT = {
  regular: 'Онлайн',
  case_review: 'Офлайн',
  one_time: 'Любой',
}

export const URGENCY_LABELS = {
  low: 'Не горит',
  medium: 'В течение месяца',
  high: 'Срочно',
}

export function getProfileFormatLabel(value, { short = false, fallback = '—' } = {}) {
  const normalized = normalizeProfileFormat(value, { fallback: null })
  if (!normalized) return fallback
  return (short ? PROFILE_FORMAT_LABELS_SHORT : PROFILE_FORMAT_LABELS)[normalized] ?? fallback
}

export function getUrgencyLabel(value, { fallback = '—' } = {}) {
  const normalized = normalizeUrgency(value, { fallback: null })
  if (!normalized) return fallback
  return URGENCY_LABELS[normalized] ?? fallback
}
