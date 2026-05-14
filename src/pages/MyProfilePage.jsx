import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { getMyProfile } from '../utils/api'
import {
  getInitials,
  ROLE_LABELS,
  ROLE_COPY,
  normalizeAvatarUrl,
  resolveFormatLabel,
  resolveUrgencyLabel,
} from '../utils/ui'

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
    // ignore
  }
}

export default function MyProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
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

  if (loading) {
    return (
      <div className="profile-view">
        <div className="profile-view__status">Загрузка профиля…</div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-view">
        {error && <div className="profile-view__status profile-view__status--error">{error}</div>}
        <div className="profile-view__status">Профиль не найден.</div>
      </div>
    )
  }

  const avatarUrl = normalizeAvatarUrl(profile.avatar_url)
  const showAvatarImage = avatarUrl && !avatarLoadFailed
  const copy = ROLE_COPY[profile.role] ?? ROLE_COPY.mentee

  const params = [
    profile.format && ['Формат', resolveFormatLabel(profile.format)],
    profile.availability > 0 && ['Часов в неделю', profile.availability],
    profile.urgency && ['Срочность', resolveUrgencyLabel(profile.urgency)],
    profile.commitment && ['Период', profile.commitment],
  ].filter(Boolean)

  return (
    <div className="profile-view">
      <div className="profile-view__scroll">
        {/* Hero */}
        <section
          className="glass profile-view__hero"
          
        >
          <div className="profile-view__hero-halo" />

          <div className="profile-view__avatar">
            {showAvatarImage ? (
              <img
                src={avatarUrl}
                alt=""
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <span>{getInitials(profile.name)}</span>
            )}
          </div>

          <div className="profile-view__hero-text">
            <h1 className="profile-view__name">{profile.name ?? 'Без имени'}</h1>
            <p className="profile-view__meta">
              {ROLE_LABELS[profile.role] ?? profile.role}
              {profile.industry && ` · ${profile.industry}`}
              {profile.current_level && ` · ${profile.current_level}`}
            </p>
          </div>

          <button
            type="button"
            className="glass profile-view__edit-btn"
            onClick={() => navigate('/onboarding')}
          >
            Редактировать
          </button>
        </section>

        {error && <div className="profile-view__status profile-view__status--error">{error}</div>}

        {/* Content */}
        <div className="profile-view__content">
          {profile.bio && (
            <section className="glass profile-view__section">
              <h2 className="profile-view__section-title">О себе</h2>
              <p className="profile-view__bio">{profile.bio}</p>
            </section>
          )}

          {profile.tags?.length > 0 && (
            <section className="glass profile-view__section">
              <h2 className="profile-view__section-title">Навыки</h2>
              <div className="profile-view__tags">
                {profile.tags.map((tag) => (
                  <span key={tag} className="profile-view__tag">{tag}</span>
                ))}
              </div>
            </section>
          )}

          {params.length > 0 && (
            <section className="glass profile-view__section">
              <h2 className="profile-view__section-title">Параметры</h2>
              <div className="profile-view__rows">
                {params.map(([label, value]) => (
                  <div key={label} className="profile-view__row">
                    <span className="profile-view__row-label">{label}</span>
                    <span className="profile-view__row-value">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(profile.goal || profile.request) && (
            <section className="glass profile-view__section">
              <h2 className="profile-view__section-title">Цели</h2>
              {profile.goal && (
                <div className="profile-view__goal-block">
                  <p className="profile-view__goal-label">{copy.goalLabel}</p>
                  <p className="profile-view__goal-text">{profile.goal}</p>
                </div>
              )}
              {profile.request && (
                <div className="profile-view__goal-block">
                  <p className="profile-view__goal-label">{copy.requestLabel}</p>
                  <p className="profile-view__goal-text">{profile.request}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
