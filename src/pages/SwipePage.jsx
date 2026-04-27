import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion'
import { X, Heart } from 'lucide-react'
import { getFeed, getMyProfile, submitSwipe } from '../lib/api'
import { rankFeed } from '../lib/matching'
import { useAuth } from '../context/useAuth'
import { getInitials, ROLE_LABELS, ROLE_COPY, resolveFormatShortLabel } from '../lib/ui'

const getSwipeCacheKey = (userId) => `swipe_state_${userId}`

const readSwipeCache = (userId) => {
  if (!userId) return null

  try {
    const raw = sessionStorage.getItem(getSwipeCacheKey(userId))
    if (!raw) return null

    const cached = JSON.parse(raw)
    if (!Array.isArray(cached?.feed)) return null

    const nextIndex = Number.isInteger(cached.index) ? cached.index : 0
    const safeIndex = Math.max(0, Math.min(nextIndex, cached.feed.length))

    return {
      feed: cached.feed,
      index: safeIndex,
      cardKey: Number.isInteger(cached.cardKey) ? cached.cardKey : 0,
    }
  } catch {
    return null
  }
}

const writeSwipeCache = (userId, payload) => {
  if (!userId) return

  try {
    sessionStorage.setItem(getSwipeCacheKey(userId), JSON.stringify(payload))
  } catch {
    // ignore storage write errors
  }
}

// ── Profile Sheet ──────────────────────────────────────────────
function ProfileSheet({ candidate, onClose }) {
  const [sheetOffset, setSheetOffset] = useState(0)
  const [isHandleDragging, setIsHandleDragging] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const dragStartY = useRef(0)
  const sheetBaseOffset = isVisible ? '0%' : '100%'

  useEffect(() => {
    const frameId = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    const mainContent = document.querySelector('.main-content')
    if (!mainContent) return undefined

    const prevOverflowY = mainContent.style.overflowY
    const prevTouchAction = mainContent.style.touchAction
    mainContent.style.overflowY = 'hidden'
    mainContent.style.touchAction = 'none'

    return () => {
      mainContent.style.overflowY = prevOverflowY
      mainContent.style.touchAction = prevTouchAction
    }
  }, [])

  const initials = getInitials(candidate.name)

  const onHandlePointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartY.current = e.clientY
    setIsHandleDragging(true)
  }
  const onHandlePointerMove = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    const offset = e.clientY - dragStartY.current
    setSheetOffset(Math.max(0, offset))
  }
  const onHandlePointerUp = (e) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsHandleDragging(false)
    const offset = e.clientY - dragStartY.current
    if (offset > 100) onClose()
    else setSheetOffset(0)
  }

  return (
    <AnimatePresence>
      <motion.div
        key="sheet-backdrop"
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.4)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <div
        key="sheet-panel"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          maxWidth: 430,
          margin: '0 auto',
          zIndex: 201,
          transform: `translate3d(0, calc(${sheetBaseOffset} + ${sheetOffset}px), 0)`,
          transition: isHandleDragging ? 'none' : 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'transform',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '20px 20px 0 0',
            maxHeight: '85svh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
        {/* Handle — drag zone only */}
        <div
          style={{
            display: 'flex', justifyContent: 'center',
            padding: '12px 0 4px', flexShrink: 0, cursor: 'grab',
            touchAction: 'none',
          }}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
        >
          <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e8ebed' }} />
        </div>

        {/* Scroll content */}
        <div style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '8px 20px 20px',
          display: 'flex', flexDirection: 'column', gap: 16,
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: '#e8ebed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#9BA3AF', flexShrink: 0,
            }}>
              {candidate.avatar_url && !avatarFailed ? (
                <img
                  src={candidate.avatar_url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                  onError={() => setAvatarFailed(true)}
                />
              ) : initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#181d2a' }}>
                {candidate.name}
              </div>
              <div style={{ fontSize: 12, fontWeight: 300, color: '#9BA3AF' }}>
                {ROLE_LABELS[candidate.role] ?? candidate.role}
                {candidate.industry && ` · ${candidate.industry}`}
                {candidate.current_level && ` · ${candidate.current_level}`}
              </div>
            </div>
            {candidate.match_score != null && (
              <div style={{
                flexShrink: 0, marginLeft: 8, background: '#e8ebed',
                borderRadius: 8, padding: '4px 10px',
                fontSize: 13, fontWeight: 700, color: '#181d2a',
              }}>
                {candidate.match_score}%
              </div>
            )}
          </div>

          {/* Bio */}
          {candidate.bio && (
            <div>
              <div className="sheet-section-label">О себе</div>
              <p style={{ fontSize: 14, color: '#181d2a', lineHeight: 1.6, margin: 0 }}>
                {candidate.bio}
              </p>
            </div>
          )}

          {/* Detail boxes */}
          {(candidate.availability || candidate.format) && (
            <div style={{ display: 'flex', gap: 10 }}>
              {candidate.availability ? (
                <div className="sheet-detail-box">
                  <div className="sheet-detail-label">Доступность</div>
                  <div className="sheet-detail-value">{candidate.availability} ч/нед</div>
                </div>
              ) : null}
              {candidate.format ? (
                <div className="sheet-detail-box">
                  <div className="sheet-detail-label">Формат</div>
                  <div className="sheet-detail-value">
                    {resolveFormatShortLabel(candidate.format)}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Goal */}
          {candidate.goal && (
            <div>
              <div className="sheet-section-label">
                {(ROLE_COPY[candidate.role] ?? ROLE_COPY.mentee).goalLabel}
              </div>
              <p style={{ fontSize: 14, color: '#181d2a', margin: 0 }}>{candidate.goal}</p>
            </div>
          )}

          {/* Request */}
          {candidate.request && (
            <div>
              <div className="sheet-section-label">
                {(ROLE_COPY[candidate.role] ?? ROLE_COPY.mentee).requestLabel}
              </div>
              <p style={{ fontSize: 14, color: '#181d2a', margin: 0 }}>{candidate.request}</p>
            </div>
          )}

          {/* Reasons */}
          {candidate.match_reasons?.length > 0 && (
            <div className="reasons-block-sheet">
              <div className="reasons-title">Почему этот кандидат</div>
              <ul className="reasons-list-sheet">
                {candidate.match_reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {candidate.tags?.length > 0 && (
            <div>
              <div className="sheet-section-label">Теги</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {candidate.tags.map((tag) => (
                  <span key={tag} className="card-tag">{tag}</span>
                ))}
              </div>
            </div>
          )}

        </div>

        <div style={{
          flexShrink: 0,
          padding: '12px 20px calc(16px + env(safe-area-inset-bottom, 0px))',
          background: '#fff',
        }}>
          <button className="sheet-btn-close" onClick={onClose}>Закрыть</button>
        </div>
        </div>
      </div>
    </AnimatePresence>
  )
}

// ── Match Popup ────────────────────────────────────────────────
function MatchPopup({ matchedName, onClose, onGoMatches }) {
  return (
    <div className="match-overlay">
      <div className="match-popup">
        <div className="match-emoji">🎉</div>
        <div className="match-title">Это мэтч!</div>
        {matchedName && <div className="match-name">{matchedName}</div>}
        <p className="match-text">
          Вы подходите друг другу по целям и опыту. Можете начать общение.
        </p>
        <button className="match-btn-primary" onClick={onGoMatches}>
          Перейти к мэтчам
        </button>
        <button className="match-btn-secondary" onClick={onClose}>
          Продолжить просмотр
        </button>
      </div>
    </div>
  )
}

// ── Swipe Page ─────────────────────────────────────────────────
export default function SwipePage() {
  const { user, userRole } = useAuth()
  const navigate = useNavigate()
  const cachedSwipeState = readSwipeCache(user.id)
  const [feed, setFeed] = useState(() => cachedSwipeState?.feed ?? [])
  const [index, setIndex] = useState(() => cachedSwipeState?.index ?? 0)
  const [cardKey, setCardKey] = useState(() => cachedSwipeState?.cardKey ?? 0)
  const [loading, setLoading] = useState(() => !cachedSwipeState)
  const [error, setError] = useState('')
  const [matchPopup, setMatchPopup] = useState(false)
  const [matchedName, setMatchedName] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  const [isSwiping, setIsSwiping] = useState(false)
  const [cardAvatarFailed, setCardAvatarFailed] = useState(false)
  const suppressSheetOpenRef = useRef(false)
  const suppressTimerRef = useRef(null)

  const suppressSheetOpenFor = useCallback((ms) => {
    suppressSheetOpenRef.current = true
    if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current)
    suppressTimerRef.current = setTimeout(() => {
      suppressSheetOpenRef.current = false
    }, ms)
  }, [])

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) clearTimeout(suppressTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (cachedSwipeState) return

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [myProfile, data] = await Promise.all([
          getMyProfile(user.id),
          getFeed(30, 0),
        ])
        setFeed(rankFeed(myProfile, data))
        setIndex(0)
        setCardAvatarFailed(false)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id, cachedSwipeState])

  useEffect(() => {
    writeSwipeCache(user.id, { feed, index, cardKey })
  }, [user.id, feed, index, cardKey])

  const candidate = useMemo(() => feed[index] ?? null, [feed, index])

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const likeOverlayOp = useTransform(x, [0, 150], [0, 0.45])
  const passOverlayOp = useTransform(x, [-150, 0], [0.45, 0])
  const sheenRightOp = useTransform(x, [0, 150], [0, 0.8])
  const sheenLeftOp = useTransform(x, [-150, 0], [0.8, 0])

  const handleSwipeAction = useCallback(
    async (direction) => {
      if (!candidate || isSwiping) return

      const effectiveDirection =
        direction === 'like' && userRole && userRole === candidate.role
          ? 'pass'
          : direction

      suppressSheetOpenFor(650)
      setIsSwiping(true)
      setShowSheet(false)

      const snap = candidate

      const [swipeResult] = await Promise.allSettled([
        submitSwipe(snap.id, effectiveDirection),
        animate(x, effectiveDirection === 'like' ? 480 : -480, { duration: 0.28, ease: 'easeIn' }),
      ])

      x.set(0)
      setIndex((i) => i + 1)
      setCardKey((k) => k + 1)
      setCardAvatarFailed(false)
      setIsSwiping(false)

      if (swipeResult.status === 'fulfilled' && swipeResult.value?.is_match) {
        setMatchedName(snap.name ?? '')
        setMatchPopup(true)
      } else if (swipeResult.status === 'rejected') {
        setError(swipeResult.reason?.message ?? 'Ошибка свайпа')
      }
    },
    [candidate, isSwiping, suppressSheetOpenFor, x, userRole],
  )

  const handleDragEnd = useCallback(
    (_, { offset, velocity }) => {
      suppressSheetOpenFor(420)

      if (offset.x > 80 || velocity.x > 400) handleSwipeAction('like')
      else if (offset.x < -80 || velocity.x < -400) handleSwipeAction('pass')
    },
    [handleSwipeAction, suppressSheetOpenFor],
  )

  const handleCardClick = useCallback(() => {
    if (isSwiping) return
    if (suppressSheetOpenRef.current) return
    setShowSheet(true)
  }, [isSwiping])

  if (loading) {
    return (
      <div className="swipe-loading">
        <div className="loading-spinner" />
        <p>Подбираем кандидатов...</p>
      </div>
    )
  }

  const initials = candidate ? getInitials(candidate.name) : ''

  return (
    <div className="swipe-screen">
      {error && <p className="swipe-error">{error}</p>}

      <div className="swipe-content">
        {!candidate ? (
          <div className="swipe-empty">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#9BA3AF" strokeWidth="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <div className="swipe-empty-title">Кандидаты закончились</div>
            <div className="swipe-empty-text">Загляните позже</div>
          </div>
        ) : (
          <motion.div
            key={cardKey}
            className="swipe-card"
            style={{ x, rotate, position: 'relative' }}
            drag={showSheet ? false : 'x'}
            dragMomentum={false}
            dragElastic={0.6}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={() => {
              suppressSheetOpenFor(420)
            }}
            onDragEnd={handleDragEnd}
            onClick={handleCardClick}
            whileDrag={{ cursor: 'grabbing' }}
          >
            {/* Photo — top 50% */}
            <div className="card-photo-area">
              {candidate.avatar_url && !cardAvatarFailed ? (
                <img
                  src={candidate.avatar_url}
                  alt=""
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={() => setCardAvatarFailed(true)}
                />
              ) : (
                <div className="card-photo-avatar">{initials}</div>
              )}
            </div>

            {/* Content — flexible middle zone */}
            <div className="card-content">
              <div>
                <div className="card-name">{candidate.name ?? 'Без имени'}</div>
                <div className="card-role">
                  {ROLE_LABELS[candidate.role] ?? candidate.role}
                  {candidate.industry && ` · ${candidate.industry}`}
                </div>
              </div>

              {candidate.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {candidate.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="card-tag">{tag}</span>
                  ))}
                </div>
              )}

              {candidate.format && (
                <div className="card-format">
                  {resolveFormatShortLabel(candidate.format)}
                </div>
              )}

              {candidate.match_reasons?.length > 0 && (
                <div className="reasons-block">
                  <div className="reasons-title">Почему этот кандидат</div>
                  <ul className="reasons-list">
                    {candidate.match_reasons.slice(0, 3).map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card-actions">
              <button
                className="card-btn-pass"
                onClick={(e) => { e.stopPropagation(); handleSwipeAction('pass') }}
                disabled={isSwiping}
              >
                <X size={22} color="#181d2a" strokeWidth={2} />
              </button>
              <button
                className="card-btn-like"
                onClick={(e) => { e.stopPropagation(); handleSwipeAction('like') }}
                disabled={isSwiping}
              >
                <Heart size={22} color="#fff" fill="#fff" strokeWidth={0} />
              </button>
            </div>

            {/* Card-level overlays */}
            <motion.div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, #2D6A4F 0%, transparent 60%)',
              opacity: likeOverlayOp,
              pointerEvents: 'none',
              zIndex: 5,
            }} />
            <motion.div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(to top, #FF4D4D 0%, transparent 60%)',
              opacity: passOverlayOp,
              pointerEvents: 'none',
              zIndex: 5,
            }} />
            <motion.div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, transparent 55%)',
              opacity: sheenRightOp,
              pointerEvents: 'none',
              zIndex: 6,
            }} />
            <motion.div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(225deg, rgba(255,255,255,0.28) 0%, transparent 55%)',
              opacity: sheenLeftOp,
              pointerEvents: 'none',
              zIndex: 6,
            }} />
          </motion.div>
        )}
      </div>

      {/* Profile Sheet — rendered outside the card */}
      {showSheet && candidate && (
        <ProfileSheet candidate={candidate} onClose={() => setShowSheet(false)} />
      )}

      {/* Match Popup */}
      <AnimatePresence>
        {matchPopup && (
          <motion.div
            key="match-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MatchPopup
              matchedName={matchedName}
              onClose={() => setMatchPopup(false)}
              onGoMatches={() => { setMatchPopup(false); navigate('/matches') }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
