import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Info, Users, X } from 'lucide-react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion'
import { getFeed, getMyProfile, submitSwipe } from '../utils/api'
import { rankFeed } from '../utils/matching'
import { useAuth } from '../context/useAuth'
import ProfileSheet from '../sections/ProfileSheet'
import MatchPopup from '../sections/MatchPopup'
import SwipeCard from '../sections/SwipeCard'

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
    // ignore
  }
}

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
  const remaining = feed.length - index

  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-12, 0, 12])
  const likeOp = useTransform(x, [0, 150], [0, 0.45])
  const passOp = useTransform(x, [-150, 0], [0.45, 0])

  const handleSwipeAction = useCallback(
    async (direction) => {
      if (!candidate || isSwiping) return

      const apiAction = direction === 'right' ? 'like' : 'pass'
      const effectiveAction =
        apiAction === 'like' && userRole && userRole === candidate.role ? 'pass' : apiAction

      suppressSheetOpenFor(650)
      setIsSwiping(true)
      setShowSheet(false)
      const snap = candidate

      const [swipeResult] = await Promise.allSettled([
        submitSwipe(snap.id, effectiveAction),
        animate(x, apiAction === 'like' ? 500 : -500, { duration: 0.3, ease: 'easeIn' }),
      ])

      x.set(0)
      setIndex((i) => i + 1)
      setCardKey((k) => k + 1)
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
      if (offset.x > 80 || velocity.x > 400) handleSwipeAction('right')
      else if (offset.x < -80 || velocity.x < -400) handleSwipeAction('left')
    },
    [handleSwipeAction, suppressSheetOpenFor],
  )

  const handleCardClick = useCallback(() => {
    if (isSwiping) return
    if (suppressSheetOpenRef.current) return
    setShowSheet(true)
  }, [isSwiping])

  const reloadFeed = async () => {
    setLoading(true)
    setError('')
    try {
      const [myProfile, data] = await Promise.all([
        getMyProfile(user.id),
        getFeed(30, 0),
      ])
      setFeed(rankFeed(myProfile, data))
      setIndex(0)
      setCardKey((k) => k + 1)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="swipe">
      {/* Floating glass header */}
      <div className="swipe__header glass">
        <div>
          <h1 className="swipe__header-title">Лента</h1>
          {remaining > 0 && (
            <div className="swipe__header-count">{remaining} кандидатов</div>
          )}
        </div>
      </div>

      {error && <p className="swipe__error">{error}</p>}

      {/* Card layer */}
      <div className="swipe__card-layer">
        {loading ? (
          <div className="swipe__loading">
            <div className="loading-spinner" />
            <p>Подбираем кандидатов…</p>
          </div>
        ) : !candidate ? (
          <div className="swipe__empty">
            <div className="swipe__empty-icon">
              <Users size={32} strokeWidth={1.5} />
            </div>
            <div className="swipe__empty-text">
              <div className="swipe__empty-title">Кандидаты закончились</div>
              <div className="swipe__empty-hint">Загляните позже — появятся новые</div>
            </div>
            <button type="button" className="swipe__empty-btn" onClick={reloadFeed}>
              Обновить ленту
            </button>
          </div>
        ) : (
          <motion.div
            key={cardKey}
            className="swipe-card"
            style={{ x, rotate }}
            drag={showSheet ? false : 'x'}
            dragMomentum={false}
            dragElastic={0.6}
            dragConstraints={{ left: 0, right: 0 }}
            onDragStart={() => suppressSheetOpenFor(420)}
            onDragEnd={handleDragEnd}
            onClick={handleCardClick}
            whileDrag={{ cursor: 'grabbing' }}
          >
            <SwipeCard candidate={candidate} />

            {/* Like/Pass overlay washes */}
            <motion.div 
              className="swipe-card__wash swipe-card__wash--like"
              style={{ opacity: likeOp }}
            />
            <motion.div 
              className="swipe-card__wash swipe-card__wash--pass"
              style={{ opacity: passOp }}
            />
          </motion.div>
        )}
      </div>

      {/* Floating action buttons */}
      {candidate && !loading && (
        <div className="swipe__actions">
          <button
            type="button"
            className="swipe__action"
            onClick={() => handleSwipeAction('left')}
            disabled={isSwiping}
            aria-label="Пропустить"
          >
            <X size={24} strokeWidth={2.2} />
          </button>
          <button
            type="button"
            className="swipe__action swipe__action--info"
            onClick={() => setShowSheet(true)}
            disabled={isSwiping}
            aria-label="Подробнее"
          >
            <Info size={18} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="swipe__action swipe__action--like"
            onClick={() => handleSwipeAction('right')}
            disabled={isSwiping}
            aria-label="Нравится"
          >
            <Heart size={24} fill="#fff" strokeWidth={0} />
          </button>
        </div>
      )}

      {/* Profile Sheet */}
      {showSheet && candidate && (
        <ProfileSheet
          profile={candidate}
          onClose={() => setShowSheet(false)}
          showActions
          onLike={() => handleSwipeAction('right')}
          onPass={() => handleSwipeAction('left')}
        />
      )}

      {/* Match Popup */}
      <AnimatePresence>
        {matchPopup && (
          <motion.div
            key="match-popup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <MatchPopup
              name={matchedName}
              onClose={() => setMatchPopup(false)}
              onGoMatches={() => { setMatchPopup(false); navigate('/matches') }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
