import {
  PROFILE_FORMAT_LABELS,
  PROFILE_FORMAT_LABELS_SHORT,
  URGENCY_LABELS as CONTRACT_URGENCY_LABELS,
  getProfileFormatLabel,
  getUrgencyLabel,
  normalizeProfileFormat,
  normalizeUrgency,
} from './contracts/profileEnums'

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

export function normalizeAvatarUrl(avatarUrl) {
  if (!avatarUrl) return null
  if (avatarUrl.startsWith('http')) return avatarUrl
  return null
}

export const ROLE_LABELS = {
  mentor: 'Наставник',
  mentee: 'Наставляемый',
}

export const ROLE_COPY = {
  mentor: {
    goalLabel: 'Чем помогаю',
    goalPlaceholder: 'Опишите свою экспертизу и направление работы',
    requestLabel: 'Кого ищу',
    requestPlaceholder: 'Опишите, с кем хотите работать',
  },
  mentee: {
    goalLabel: 'Цель наставничества',
    goalPlaceholder: 'Чего хотите достичь?',
    requestLabel: 'Запрос к наставнику',
    requestPlaceholder: 'С чем нужна помощь?',
  },
}

export const FORMAT_LABELS = PROFILE_FORMAT_LABELS
export const FORMAT_LABELS_SHORT = PROFILE_FORMAT_LABELS_SHORT
export const URGENCY_LABELS = CONTRACT_URGENCY_LABELS

export function resolveFormatLabel(value) {
  return getProfileFormatLabel(value, { fallback: String(value ?? '—') })
}

export function resolveFormatShortLabel(value) {
  return getProfileFormatLabel(value, {
    short: true,
    fallback: String(value ?? '—'),
  })
}

export function resolveUrgencyLabel(value) {
  return getUrgencyLabel(value, { fallback: String(value ?? '—') })
}

export function normalizeFormatValue(value, fallback = null) {
  return normalizeProfileFormat(value, { fallback })
}

export function normalizeUrgencyValue(value, fallback = null) {
  return normalizeUrgency(value, { fallback })
}
