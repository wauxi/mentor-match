import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getMyProfile } from '../lib/api'
import {
  getInitials,
  ROLE_LABELS,
  ROLE_COPY,
  normalizeAvatarUrl,
  resolveFormatLabel,
  resolveUrgencyLabel,
} from '../lib/ui'

const getMyProfileCacheKey = (userId) => `my_profile_state_${userId}`

const readMyProfileCache = (userId) => {
  if (!userId) return null

  try {
    const raw = sessionStorage.getItem(getMyProfileCacheKey(userId))
    if (!raw) return null

    const cached = JSON.parse(raw)
    return cached?.profile ?? null
  } catch {
    return null
  }
}

const writeMyProfileCache = (userId, profile) => {
  if (!userId) return

  try {
    sessionStorage.setItem(getMyProfileCacheKey(userId), JSON.stringify({ profile }))
  } catch {
    // ignore storage write errors
  }
}

export default function MyProfilePage() {
  const { user } = useAuth()
  const cachedProfile = readMyProfileCache(user.id)
  const [profile, setProfile] = useState(() => cachedProfile)
  const [loading, setLoading] = useState(() => !cachedProfile)
  const [error, setError] = useState('')
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  useEffect(() => {
    async function load() {
      setError('')
      try {
        const data = await getMyProfile(user.id)
        setProfile(data)
        setAvatarLoadFailed(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  useEffect(() => {
    writeMyProfileCache(user.id, profile)
  }, [user.id, profile])

  if (loading) return <div className="page-shell">Загрузка профиля...</div>

  return (
    <div className="page-shell">
      <div className="profile-header-row">
        <h1>Мой профиль</h1>
        <Link to="/onboarding">
          <button className="ghost">Редактировать</button>
        </Link>
      </div>

      {error && <p className="error">{error}</p>}

      {!profile ? (
        <p className="muted">Профиль не найден.</p>
      ) : (
        <div className="profile-layout">

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div className="profile-avatar">
                {normalizeAvatarUrl(profile.avatar_url) && !avatarLoadFailed ? (
                  <img
                    src={normalizeAvatarUrl(profile.avatar_url)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={() => setAvatarLoadFailed(true)}
                  />
                ) : (
                  <span className="profile-avatar-initials">{getInitials(profile.name)}</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, wordBreak: 'break-word' }}>{profile.name ?? 'Без имени'}</h2>
                <p className="muted" style={{ margin: '3px 0 0', fontSize: 13 }}>
                  {ROLE_LABELS[profile.role] ?? profile.role}
                  {profile.industry && ` · ${profile.industry}`}
                  {profile.current_level && ` · ${profile.current_level}`}
                </p>
              </div>
            </div>
            {profile.bio && <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6 }}>{profile.bio}</p>}
          </div>

          {profile.tags?.length > 0 && (
            <div className="card">
              <p className="profile-section-label">Теги</p>
              <div className="tags-grid">
                {profile.tags.map((tag) => (
                  <span key={tag} className="tag-chip selected">{tag}</span>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <p className="profile-section-label">Параметры</p>
            <div className="profile-fields">
              {profile.format && (
                <div className="profile-field">
                  <span className="profile-field-label">Формат</span>
                  <span>{resolveFormatLabel(profile.format)}</span>
                </div>
              )}
              {profile.availability > 0 && (
                <div className="profile-field">
                  <span className="profile-field-label">Часов в неделю</span>
                  <span>{profile.availability}</span>
                </div>
              )}
              {profile.urgency && (
                <div className="profile-field">
                  <span className="profile-field-label">Срочность</span>
                  <span>{resolveUrgencyLabel(profile.urgency)}</span>
                </div>
              )}
              {profile.commitment && (
                <div className="profile-field">
                  <span className="profile-field-label">Период</span>
                  <span>{profile.commitment}</span>
                </div>
              )}
            </div>
          </div>

          {(profile.goal || profile.request) && (() => {
            const copy = ROLE_COPY[profile.role] ?? ROLE_COPY.mentee
            return (
            <div className="card">
              <p className="profile-section-label">Цели</p>
              {profile.goal && (
                <div className="profile-field col">
                  <span className="profile-field-label">{copy.goalLabel}</span>
                  <span>{profile.goal}</span>
                </div>
              )}
              {profile.request && (
                <div className="profile-field col">
                  <span className="profile-field-label">{copy.requestLabel}</span>
                  <span>{profile.request}</span>
                </div>
              )}
            </div>
            )
          })()}

        </div>
      )}
    </div>
  )
}
