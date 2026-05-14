import { useEffect, useState } from 'react'
import { ChevronRight, MessageCircle } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { getMyMatches, getProfilesBatch } from '../utils/api'
import { getInitials, getProfileColor, ROLE_LABELS } from '../utils/ui'
import ProfileSheet from '../sections/ProfileSheet'

const NEW_MATCH_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const getMatchesCacheKey = (userId) => `matches_state_${userId}`

const readMatchesCache = (userId) => {
  if (!userId) return null

  try {
    const raw = sessionStorage.getItem(getMatchesCacheKey(userId))
    if (!raw) return null

    const cached = JSON.parse(raw)
    return Array.isArray(cached?.matches) ? cached.matches : null
  } catch {
    return null
  }
}

const writeMatchesCache = (userId, matches) => {
  if (!userId) return

  try {
    sessionStorage.setItem(getMatchesCacheKey(userId), JSON.stringify({ matches }))
  } catch {
    // ignore
  }
}

function MatchAvatar({ profile, name, size = 'lg' }) {
  const [failed, setFailed] = useState(false)
  const ts = profile?.updated_at ? new Date(profile.updated_at).getTime() : ''
  const url = profile?.avatar_url
    ? (ts ? `${profile.avatar_url}?v=${ts}` : profile.avatar_url)
    : null

  const className = size === 'sm' ? 'matches__avatar' : 'matches__new-avatar'
  const color = profile?.color || getProfileColor(profile?.id ?? name)

  const baseClass = `${className} avatar-tinted`
  if (url && !failed) {
    return (
      <div className={baseClass} style={{ '--avatar-color': color }}>
        <img src={url} alt="" onError={() => setFailed(true)} />
      </div>
    )
  }
  return (
    <div className={baseClass} style={{ '--avatar-color': color }}>
      {getInitials(name)}
    </div>
  )
}

export default function MatchesPage() {
  const { user } = useAuth()
  const rawCached = readMatchesCache(user.id)
  const cachedMatches = rawCached?.some((m) => !m.profile) ? null : rawCached
  const [matches, setMatches] = useState(() => cachedMatches ?? [])
  const [loading, setLoading] = useState(() => !cachedMatches)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (cachedMatches) return

    async function load() {
      setLoading(true)
      setError('')
      try {
        const rows = await getMyMatches(user.id)
        const otherIds = rows.map((row) => row.user1_id === user.id ? row.user2_id : row.user1_id)
        const profiles = await getProfilesBatch(otherIds)
        const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
        const enriched = rows.map((row) => {
          const otherId = row.user1_id === user.id ? row.user2_id : row.user1_id
          return {
            matchId: row.id,
            otherId,
            createdAt: row.created_at,
            profile: profileMap[otherId] ?? null,
          }
        })
        setMatches(enriched)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id, cachedMatches])

  useEffect(() => {
    writeMatchesCache(user.id, matches)
  }, [user.id, matches])

  const now = Date.now()
  const isNew = (match) => {
    if (!match.createdAt) return false
    return now - new Date(match.createdAt).getTime() < NEW_MATCH_WINDOW_MS
  }
  const newMatches = matches.filter(isNew)

  if (loading) {
    return (
      <div className="matches">
        <div className="matches__header">
          <h1 className="matches__title">Мэтчи</h1>
        </div>
        <div className="matches__status">Загрузка…</div>
      </div>
    )
  }

  return (
    <div className="matches">
      <div className="matches__header">
        <h1 className="matches__title">Мэтчи</h1>
        {matches.length > 0 && (
          <p className="matches__count">{matches.length} совпадений</p>
        )}
      </div>

      <div className="matches__scroll">
        {error && <div className="matches__status matches__status--error">{error}</div>}

        {matches.length === 0 ? (
          <div className="matches__empty">
            <div className="matches__empty-icon">
              <MessageCircle size={32} strokeWidth={1.5} />
            </div>
            <div>
              <div className="matches__empty-title">Пока нет мэтчей</div>
              <div className="matches__empty-hint">Возвращайтесь в ленту и свайпайте</div>
            </div>
          </div>
        ) : (
          <>
            {newMatches.length > 0 && (
              <div className="matches__new-strip-wrap">
                <div className="matches__section-label">
                  Новые — {newMatches.length}
                </div>
                <div className="matches__new-strip">
                  {newMatches.map((match) => {
                    const name = match.profile?.name ?? 'Без имени'
                    const firstName = name.split(' ')[0]
                    return (
                      <button
                        key={match.matchId}
                        type="button"
                        className="matches__new-item"
                        onClick={() => match.profile && setSelected(match.profile)}
                      >
                        <div className="matches__new-avatar-wrap">
                          <MatchAvatar profile={match.profile} name={name} size="lg" />
                          <div className="matches__new-dot" />
                        </div>
                        <span className="matches__new-name">{firstName}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="matches__section-label">Все мэтчи</div>

            <ul className="matches__list">
              {matches.map((match) => {
                const name = match.profile?.name ?? 'Без имени'
                const role = ROLE_LABELS[match.profile?.role] ?? match.profile?.role ?? ''
                const tags = match.profile?.tags ?? []
                return (
                  <li key={match.matchId}>
                    <button
                      type="button"
                      className="matches__row"
                      onClick={() => match.profile && setSelected(match.profile)}
                    >
                      <div className="matches__avatar-wrap">
                        <MatchAvatar profile={match.profile} name={name} size="sm" />
                        {isNew(match) && <div className="matches__avatar-dot" />}
                      </div>
                      <div className="matches__row-body">
                        <div className="matches__row-name">{name}</div>
                        <div className="matches__row-meta">
                          {role}
                          {match.profile?.industry && ` · ${match.profile.industry}`}
                        </div>
                        {tags.length > 0 && (
                          <div className="matches__row-tags">
                            {tags.slice(0, 2).map((t) => (
                              <span key={t} className="matches__row-tag">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight size={16} className="matches__row-chevron" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {selected && (
        <ProfileSheet profile={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
