import { useState } from 'react'
import { getInitials, getProfileColor, ROLE_LABELS } from '../utils/ui'

/**
 * Static card content (bloom variant).
 * The drag wrapper is mounted by SwipePage.
 */
export default function SwipeCard({ candidate }) {
  const [avatarFailed, setAvatarFailed] = useState(false)
  const initials = getInitials(candidate.name)
  const showAvatarImage = candidate.avatar_url && !avatarFailed
  const cardColor = candidate.color || getProfileColor(candidate.id ?? candidate.name)

  return (
    <div className="swipe-card__photo" style={{ '--card-color': cardColor }}>
      {showAvatarImage ? (
        <img
          src={candidate.avatar_url}
          alt=""
          className="swipe-card__photo-img"
          onError={() => setAvatarFailed(true)}
        />
      ) : (
        <>
          <div className="swipe-card__photo-gradient" />
          <div className="swipe-card__initials-blob">{initials}</div>
        </>
      )}

      <div className="swipe-card__overlay">
        <div className="swipe-card__meta-row">
          <div style={{ minWidth: 0 }}>
            <div className="swipe-card__name">{candidate.name ?? 'Без имени'}</div>
            <div className="swipe-card__role">
              {ROLE_LABELS[candidate.role] ?? candidate.role}
              {candidate.industry && ` · ${candidate.industry}`}
              {candidate.current_level && ` · ${candidate.current_level}`}
            </div>
          </div>
          {candidate.match_score != null && (
            <div className="swipe-card__score">{candidate.match_score}%</div>
          )}
        </div>
        {candidate.tags?.length > 0 && (
          <div className="swipe-card__tags">
            {candidate.tags.slice(0, 3).map((t) => (
              <span key={t} className="swipe-card__tag">{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
