import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../utils/api'
import {
  getInitials,
  getProfileColor,
  ROLE_LABELS,
  ROLE_COPY,
  normalizeAvatarUrl,
  resolveFormatLabel,
  resolveUrgencyLabel,
} from '../utils/ui'

export default function ProfilePage() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)

  useEffect(() => {
    async function load() {
      if (!id) return
      setLoading(true)
      setError('')
      try {
        const data = await getProfile(id)
        setProfile(data)
        setAvatarLoadFailed(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

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
        <div className="profile-view__status">Профиль недоступен.</div>
      </div>
    )
  }

  const avatarUrl = normalizeAvatarUrl(profile.avatar_url)
  const showAvatarImage = avatarUrl && !avatarLoadFailed
  const profileColor = profile.color || getProfileColor(profile.id ?? id)
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
          style={{ '--profile-color': profileColor }}
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
