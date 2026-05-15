import { useEffect, useRef, useState } from 'react'
import { getInitials, getProfileColor, ROLE_LABELS, ROLE_COPY, resolveFormatShortLabel } from '../utils/ui'

function scoreVariant(score) {
  if (score >= 90) return 'profile-sheet__score--high'
  if (score >= 75) return 'profile-sheet__score--mid'
  return 'profile-sheet__score--low'
}

/**
 * Bottom sheet with full profile view.
 * Props:
 *  - profile: profile object
 *  - onClose: () => void
 *  - showActions: bool — show Like/Pass footer
 *  - onLike: () => void
 *  - onPass: () => void
 */
export default function ProfileSheet({ profile, onClose, showActions = false, onLike, onPass }) {
  const [visible, setVisible] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const dragStartY = useRef(0)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const close = () => {
    setVisible(false)
    setTimeout(onClose, 260)
  }

  const onHandlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
    setDragging(true)
  }
  const onHandlePointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const offset = e.clientY - dragStartY.current
    setDragOffset(Math.max(0, offset))
  }
  const onHandlePointerUp = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setDragging(false)
    const offset = e.clientY - dragStartY.current
    if (offset > 100) close()
    else setDragOffset(0)
  }

  const initials = getInitials(profile.name)
  const copy = ROLE_COPY[profile.role] ?? ROLE_COPY.mentee
  const showAvatarImage = profile.avatar_url && !avatarFailed
  const profileColor = profile.color || getProfileColor(profile.id ?? profile.name)

  const baseOffset = visible ? '0px' : '100%'
  const panelStyle = {
    transform: dragging || dragOffset
      ? `translateY(calc(${baseOffset} + ${dragOffset}px))`
      : `translateY(${baseOffset})`,
    transition: dragging ? 'none' : 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
  }

  return (
    <div className="profile-sheet">
      <div
        className="profile-sheet__backdrop"
        onClick={close}
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.26s ease' }}
      />
      <div className="profile-sheet__panel sheet-card" style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div
          className="profile-sheet__handle-zone"
          onClick={close}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <div className="profile-sheet__handle" />
        </div>

        <div className="profile-sheet__scroll">
          <div className="profile-sheet__header">
            <div
              className="profile-sheet__avatar avatar-tinted"
              style={{ '--avatar-color': profileColor }}
            >
              {showAvatarImage ? (
                <img src={profile.avatar_url} alt="" onError={() => setAvatarFailed(true)} />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-sheet__heading">
              <h2 className="profile-sheet__name">{profile.name ?? 'Без имени'}</h2>
              <p className="profile-sheet__meta">
                {ROLE_LABELS[profile.role] ?? profile.role}
                {profile.industry && ` · ${profile.industry}`}
                {profile.current_level && ` · ${profile.current_level}`}
              </p>
            </div>
            {profile.match_score != null && (
              <div className={'profile-sheet__score ' + scoreVariant(profile.match_score)}>
                {profile.match_score}%
              </div>
            )}
          </div>

          {profile.bio && (
            <div>
              <p className="profile-sheet__label">О себе</p>
              <p className="profile-sheet__text">{profile.bio}</p>
            </div>
          )}

          {(profile.availability || profile.format) && (
            <div className="profile-sheet__details-row">
              {profile.availability ? (
                <div className="profile-sheet__detail tile-glass">
                  <p className="profile-sheet__detail-label">Доступность</p>
                  <p className="profile-sheet__detail-value">{profile.availability} ч/нед</p>
                </div>
              ) : null}
              {profile.format ? (
                <div className="profile-sheet__detail tile-glass">
                  <p className="profile-sheet__detail-label">Формат</p>
                  <p className="profile-sheet__detail-value">{resolveFormatShortLabel(profile.format)}</p>
                </div>
              ) : null}
            </div>
          )}

          {profile.goal && (
            <div>
              <p className="profile-sheet__label">{copy.goalLabel}</p>
              <p className="profile-sheet__text">{profile.goal}</p>
            </div>
          )}

          {profile.request && (
            <div>
              <p className="profile-sheet__label">{copy.requestLabel}</p>
              <p className="profile-sheet__text">{profile.request}</p>
            </div>
          )}

          {profile.match_reasons?.length > 0 && (
            <div className="profile-sheet__reasons">
              <p className="profile-sheet__reasons-title">Почему этот кандидат</p>
              <ul className="profile-sheet__reasons-list">
                {profile.match_reasons.map((r, i) => (
                  <li key={i} className="profile-sheet__reason">
                    <span className="profile-sheet__reason-text">{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.tags?.length > 0 && (
            <div>
              <p className="profile-sheet__label">Навыки</p>
              <div className="profile-sheet__tags">
                {profile.tags.map((t) => (
                  <span key={t} className="profile-sheet__tag tile-glass">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {showActions ? (
          <div className="profile-sheet__footer">
            <button
              type="button"
              className="profile-sheet__btn profile-sheet__btn--ghost tile-glass"
              onClick={() => { close(); onPass && onPass() }}
            >
              Пропустить
            </button>
            <button
              type="button"
              className="profile-sheet__btn profile-sheet__btn--primary"
              onClick={() => { close(); onLike && onLike() }}
            >
              Нравится
            </button>
          </div>
        ) : (
          <div className="profile-sheet__footer">
            <button
              type="button"
              className="profile-sheet__btn profile-sheet__btn--ghost tile-glass"
              onClick={close}
            >
              Закрыть
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
