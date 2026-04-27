import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { getMyMatches, getProfilesBatch } from '../lib/api'
import { getInitials, ROLE_LABELS } from '../lib/ui'

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
    // ignore storage write errors
  }
}

function MatchAvatar({ profile, name }) {
  const [failed, setFailed] = useState(false)
  const ts = profile?.updated_at ? new Date(profile.updated_at).getTime() : ''

  if (profile?.avatar_url && !failed) {
    return (
      <img
        src={ts ? `${profile.avatar_url}?v=${ts}` : profile.avatar_url}
        alt=""
        className="match-avatar"
        style={{ objectFit: 'cover' }}
        onError={() => setFailed(true)}
      />
    )
  }

  return <div className="match-avatar">{getInitials(name)}</div>
}

export default function MatchesPage() {
  const { user } = useAuth()
  const rawCached = readMatchesCache(user.id)
  const cachedMatches = rawCached?.some((m) => !m.profile) ? null : rawCached
  const [matches, setMatches] = useState(() => cachedMatches ?? [])
  const [loading, setLoading] = useState(() => !cachedMatches)
  const [error, setError] = useState('')

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
          return { matchId: row.id, otherId, profile: profileMap[otherId] ?? null }
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

  if (loading) {
    return (
      <div className="matches-loading">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="matches-screen">
      <div className="matches-title">Мэтчи</div>

      {error && <p className="error" style={{ marginBottom: 12 }}>{error}</p>}

      {matches.length === 0 ? (
        <div className="matches-empty">
          <MessageCircle size={44} color="#9BA3AF" strokeWidth={1.5} />
          <div>Пока нет мэтчей</div>
        </div>
      ) : (
        <ul className="matches-list">
          {matches.map((match) => {
            const name = match.profile?.name ?? 'Без имени'
            const role = ROLE_LABELS[match.profile?.role] ?? match.profile?.role ?? ''

            return (
              <li key={match.matchId}>
                <Link to={`/profile/${match.otherId}`} className="match-card">
                  <MatchAvatar profile={match.profile} name={name} />
                  <div className="match-info">
                    <div className="match-name">{name}</div>
                    <div className="match-meta">
                      {role}
                      {match.profile?.industry && ` · ${match.profile.industry}`}
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
