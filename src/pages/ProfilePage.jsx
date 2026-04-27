import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../lib/api'
import {
  getInitials,
  ROLE_LABELS,
  ROLE_COPY,
  normalizeAvatarUrl,
  resolveFormatLabel,
  resolveUrgencyLabel,
} from '../lib/ui'

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

  if (loading) return <div className="page-shell">Загрузка профиля...</div>

  return (
    <div className="page-shell">
      <h1>Профиль</h1>
      {error && <p className="error">{error}</p>}

      {!profile ? (
        <p className="muted">Профиль недоступен.</p>
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
