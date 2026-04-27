import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { upsertOnboardingProfile, getMyProfile, uploadAvatar } from '../lib/api'
import { getInitials, ROLE_COPY } from '../lib/ui'
import {
  PROFILE_FORMAT_OPTIONS,
  PROFILE_URGENCY_OPTIONS,
  normalizeProfileFormat,
  normalizeUrgency,
} from '../lib/contracts/profileEnums'

const INDUSTRIES = ['IT', 'Fintech', 'EdTech', 'Healthcare', 'Marketing', 'Design', 'Startup', 'Другое']
const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead']
const COMMITMENTS = ['1 месяц', '3 месяца', '6 месяцев', '1 год', 'Бессрочно']
const NAME_MAX = 20
const BIO_MAX = 300
const GOAL_MAX = 300
const REQUEST_MAX = 300

// All skills known to the app — superset of old and new tags so DB values always render
const BASE_SKILLS = [
  'Product', 'Agile', 'B2B', 'SaaS', 'MVP', 'Growth',
  'Strategy', 'Data', 'Design', 'Marketing', 'Leadership', 'Sales',
  'React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'Next.js',
  'CSS', 'Testing', 'Node.js', 'Python', 'PostgreSQL', 'SQL',
  'Docker', 'AWS', 'Microservices', 'REST API', 'GraphQL', 'ML',
  'Data Science', 'Analytics', 'TensorFlow',
  'Product Strategy', 'User Research', 'Roadmapping', 'Metrics',
  'Figma', 'UI/UX', 'Design Systems', 'Accessibility', 'Prototyping',
  'Architecture', 'Code Review', 'Career Growth', 'Startup',
]

const TOTAL = 3

const autoResize = (el) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const getRequiredFieldErrors = ({ name, goal, request }, role = 'mentee') => {
  const copy = ROLE_COPY[role] ?? ROLE_COPY.mentee
  const errors = {}

  if (!name.trim()) errors.name = 'Имя обязательно'
  if (!goal.trim()) errors.goal = `${copy.goalLabel} обязательна`
  if (!request.trim()) errors.request = `${copy.requestLabel} обязателен`

  return errors
}

export default function OnboardingPage() {
  const { user, profileComplete, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const scrollRef = useRef(null)
  const draftHydratedRef = useRef(false)
  const bioRef = useRef(null)
  const goalRef = useRef(null)
  const requestRef = useRef(null)

  const [profileLoading, setProfileLoading] = useState(true)
  const [step, setStep] = useState(1)
  const [slideDir, setSlideDir] = useState('forward')

  // Step 1
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [role, setRole] = useState('mentee')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')

  // Step 2
  const [industry, setIndustry] = useState('')
  const [level, setLevel] = useState('')
  const [format, setFormat] = useState('')
  const [skills, setSkills] = useState([])
  const [extraSkills, setExtraSkills] = useState([]) // DB tags not in BASE_SKILLS

  // Step 2 — availability
  const [availability, setAvailability] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')

  // Step 3
  const [urgency, setUrgency] = useState('')
  const [goal, setGoal] = useState('')
  const [request, setRequest] = useState('')
  const [commitment, setCommitment] = useState('')

  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const storageKey = `onboarding_draft_${user.id}`

  useEffect(() => {
    async function loadExisting() {
      try {
        const existing = await getMyProfile(user.id)
        if (existing) {
          if (existing.name) setName(existing.name)
          if (existing.role) setRole(existing.role)
          if (existing.bio) setBio(existing.bio)
          if (existing.industry) setIndustry(existing.industry)
          if (existing.goal) setGoal(existing.goal)
          if (existing.format) setFormat(normalizeProfileFormat(existing.format, { fallback: '' }))
          if (existing.urgency) setUrgency(normalizeUrgency(existing.urgency, { fallback: '' }))
          if (existing.commitment) setCommitment(existing.commitment)
          if (existing.current_level) setLevel(existing.current_level)
          if (existing.request) setRequest(existing.request)
          if (existing.tags?.length) {
            setSkills(existing.tags)
            // Surface any DB tags that aren't in our preset list as extra chips
            const extra = existing.tags.filter((t) => !BASE_SKILLS.includes(t))
            if (extra.length) setExtraSkills(extra)
          }
          if (existing.availability > 0) setAvailability(existing.availability)
          setAvatarUrl(existing.avatar_url ?? null)
          setPhotoPreview(existing.avatar_url ?? null)
        }

        const draftRaw = localStorage.getItem(storageKey)
        if (draftRaw) {
          const draft = JSON.parse(draftRaw)
          if (draft.step) setStep(Math.min(Math.max(draft.step, 1), TOTAL))
          if (typeof draft.role === 'string') setRole(draft.role)
          if (typeof draft.name === 'string') setName(draft.name)
          if (typeof draft.bio === 'string') setBio(draft.bio)
          if (typeof draft.industry === 'string') setIndustry(draft.industry)
          if (typeof draft.level === 'string') setLevel(draft.level)
          if (typeof draft.format === 'string') setFormat(normalizeProfileFormat(draft.format, { fallback: '' }))
          if (draft.availability !== undefined) {
            const digits = String(draft.availability).replace(/\D/g, '')
            if (!digits) setAvailability('')
            else setAvailability(String(Math.min(40, Number.parseInt(digits, 10))))
          }
          if (Array.isArray(draft.skills)) setSkills(draft.skills)
          if (typeof draft.urgency === 'string') setUrgency(normalizeUrgency(draft.urgency, { fallback: '' }))
          if (typeof draft.goal === 'string') setGoal(draft.goal)
          if (typeof draft.request === 'string') setRequest(draft.request)
          if (typeof draft.commitment === 'string') setCommitment(draft.commitment)
        }
      } catch {
        // first-time user — no profile row yet, that's fine
      } finally {
        draftHydratedRef.current = true
        setProfileLoading(false)
      }
    }
    loadExisting()
  }, [user.id, storageKey])

  useEffect(() => {
    if (!draftHydratedRef.current) return
    const draft = {
      step,
      role,
      name,
      bio,
      industry,
      level,
      format,
      availability,
      skills,
      urgency,
      goal,
      request,
      commitment,
    }
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [step, role, name, bio, industry, level, format, availability, skills, urgency, goal, request, commitment, storageKey])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
  }, [step])

  useEffect(() => { autoResize(bioRef.current) }, [bio])
  useEffect(() => { autoResize(goalRef.current) }, [goal])
  useEffect(() => { autoResize(requestRef.current) }, [request])

  const onPhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const allSkills = [...BASE_SKILLS, ...extraSkills.filter((t) => !BASE_SKILLS.includes(t))]

  const toggleSkill = (skill) => {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length >= 8 ? prev : [...prev, skill]
    )
  }

  const goNext = () => {
    const requiredErrors = getRequiredFieldErrors({ name, goal, request }, role)

    if (step === 1 && requiredErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: requiredErrors.name }))
      return
    }

    if (step === TOTAL && (requiredErrors.goal || requiredErrors.request)) {
      setFieldErrors((prev) => ({
        ...prev,
        ...(requiredErrors.goal ? { goal: requiredErrors.goal } : {}),
        ...(requiredErrors.request ? { request: requiredErrors.request } : {}),
      }))
      return
    }

    if (step < TOTAL) {
      setSlideDir('forward')
      setStep((s) => s + 1)
    } else {
      handleSave()
    }
  }

  const goBack = () => {
    if (step > 1) {
      setSlideDir('back')
      setStep((s) => s - 1)
    }
  }

  const handleSave = async () => {
    const trimmedName = name.trim()
    const trimmedGoal = goal.trim()
    const trimmedRequest = request.trim()
    const requiredErrors = getRequiredFieldErrors({
      name: trimmedName,
      goal: trimmedGoal,
      request: trimmedRequest,
    }, role)

    if (Object.keys(requiredErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...requiredErrors }))
      return
    }

    setError('')
    setLoading(true)
    try {
      let nextAvatarUrl = avatarUrl
      if (photoFile) {
        nextAvatarUrl = await uploadAvatar(user.id, photoFile)
        setAvatarUrl(nextAvatarUrl)
      }
      
      const safeSkills = [...skills]

      console.log("FINAL SKILLS:", safeSkills) // 👈 дебаг

      await upsertOnboardingProfile(user.id, {
        name: trimmedName,
        role,
        bio,
        industry,
        goal: trimmedGoal,
        format: format || null,
        urgency: urgency || null,
        commitment,
        tags: skills,
        current_level: level,
        availability,
        request: trimmedRequest,
        avatar_url: nextAvatarUrl ?? null,
      })
      localStorage.removeItem(storageKey)
      await refreshProfile()
      sessionStorage.removeItem(`swipe_state_${user.id}`)
      sessionStorage.removeItem(`matches_state_${user.id}`)
      navigate('/swipe', { replace: true })
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }

  const progress = `${(step / TOTAL) * 100}%`
  const stepOneValid = !getRequiredFieldErrors({ name, goal: 'ok', request: 'ok' }, role).name
  const stepThreeErrors = getRequiredFieldErrors({ name: 'ok', goal, request }, role)
  const stepThreeValid = !stepThreeErrors.goal && !stepThreeErrors.request
  const isPrimaryDisabled = loading || (step === 1 && !stepOneValid) || (step === TOTAL && !stepThreeValid)

  if (profileLoading) {
    return (
      <div className="ob2-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="ob2-shell">
      {/* Progress */}
      <div className="ob2-progress-wrap">
        <p className="ob2-step-label">Шаг {step} из {TOTAL}</p>
        <div className="ob2-progress-bar">
          <div className="ob2-progress-fill" style={{ width: progress }} />
        </div>
      </div>

      {/* Scroll area */}
      <div className="ob2-scroll" ref={scrollRef}>
        {step === 1 && (
          <div className={`ob2-step ob2-step--${slideDir}`} key="step1">
            <h1 className="ob2-heading">
              {profileComplete === true ? 'Редактирование профиля' : 'Расскажите о себе'}
            </h1>

            <div className="ob2-avatar-picker">
              <div className="ob2-avatar-main">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="ob2-avatar-main-img" />
                ) : (
                  <div
                    className="ob2-avatar-main-img"
                    style={{
                      background: '#e8ebed',
                      color: '#9BA3AF',
                      fontSize: 28,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getInitials(name)}
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={onPhotoChange}
                />
                <button
                  type="button"
                  className="ob2-avatar-upload-btn"
                  onClick={() => fileRef.current?.click()}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Я являюсь</span>
              <div className="ob2-toggle-group">
                {[
                  { value: 'mentor', label: 'Наставник' },
                  { value: 'mentee', label: 'Наставляемый' },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={`ob2-toggle ob2-toggle--flex${role === r.value ? ' active' : ''}`}
                    onClick={() => setRole(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Имя</span>
              <input
                className={`ob2-input${fieldErrors.name ? ' ob2-input--error' : ''}`}
                placeholder="Ваше имя"
                value={name}
                maxLength={NAME_MAX}
                autoCapitalize="words"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setName(nextValue)
                  if (nextValue.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.name) return prev
                      const { name: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{name.length}/{NAME_MAX}</div>
              {fieldErrors.name && (
                <p style={{ color: 'var(--error)', fontSize: 13, margin: '6px 0 0' }}>{fieldErrors.name}</p>
              )}
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">О себе</span>
              <textarea
                ref={bioRef}
                className="ob2-input"
                placeholder="Расскажите о себе..."
                value={bio}
                maxLength={BIO_MAX}
                onChange={(e) => setBio(e.target.value)}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{bio.length}/{BIO_MAX}</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={`ob2-step ob2-step--${slideDir}`} key="step2">
            <h1 className="ob2-heading">Параметры подбора</h1>

            <div className="ob2-field">
              <span className="ob2-field-label">Индустрия</span>
              <div className="ob2-toggle-group">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    className={`ob2-toggle${industry === ind ? ' active' : ''}`}
                    onClick={() => setIndustry(industry === ind ? '' : ind)}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Уровень</span>
              <div className="ob2-toggle-group">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={`ob2-toggle${level === l ? ' active' : ''}`}
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Формат</span>
              <div className="ob2-toggle-group">
                {PROFILE_FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={`ob2-toggle${format === f.value ? ' active' : ''}`}
                    onClick={() => setFormat(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Часов в неделю</span>
              <input
                className={`ob2-input${availabilityError ? ' ob2-input--error' : ''}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="Например, 4"
                value={availability}
                aria-invalid={Boolean(availabilityError)}
                onChange={(e) => {
                  const raw = e.target.value
                  const digits = raw.replace(/\D/g, '')
                  if (!digits) {
                    setAvailability('')
                    setAvailabilityError('')
                    return
                  }

                  const parsed = Number.parseInt(digits, 10)
                  if (parsed > 40) {
                    setAvailability('40')
                    setAvailabilityError('Максимум 40 часов в неделю')
                    return
                  }

                  setAvailability(String(parsed))
                  setAvailabilityError('')
                }}
                onBlur={() => {
                  if (availability === '') return
                  const parsed = Number.parseInt(String(availability), 10)
                  if (Number.isNaN(parsed)) {
                    setAvailability('')
                    setAvailabilityError('Введите число от 0 до 40')
                    return
                  }
                  if (parsed > 40) {
                    setAvailability('40')
                    setAvailabilityError('Максимум 40 часов в неделю')
                    return
                  }
                  if (parsed < 0) {
                    setAvailability('0')
                    setAvailabilityError('Минимум 0 часов в неделю')
                    return
                  }
                  setAvailabilityError('')
                }}
              />
              {availabilityError && (
                <p style={{ color: 'var(--error)', fontSize: 13, margin: '6px 0 0' }}>{availabilityError}</p>
              )}
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">
                Навыки
                {skills.length > 0 && (
                  <span className="ob2-field-label-muted"> · выбрано {skills.length}/8</span>
                )}
              </span>
              <div className="ob2-chips-group">
                {allSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`ob2-chip${skills.includes(s) ? ' active' : ''}`}
                    onClick={() => toggleSkill(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (() => {
          const copy = ROLE_COPY[role] ?? ROLE_COPY.mentee
          return (
          <div className={`ob2-step ob2-step--${slideDir}`} key="step3">
            <h1 className="ob2-heading">{role === 'mentor' ? 'О вашей работе' : 'Ваши цели'}</h1>

            <div className="ob2-field">
              <span className="ob2-field-label">Срочность</span>
              <div className="ob2-toggle-group">
                {PROFILE_URGENCY_OPTIONS.map((u) => (
                  <button
                    key={u.value}
                    type="button"
                    className={`ob2-toggle${urgency === u.value ? ' active' : ''}`}
                    onClick={() => setUrgency(u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">{copy.goalLabel}</span>
              <textarea
                ref={goalRef}
                className={`ob2-input${fieldErrors.goal ? ' ob2-input--error' : ''}`}
                placeholder={copy.goalPlaceholder}
                value={goal}
                maxLength={GOAL_MAX}
                aria-invalid={Boolean(fieldErrors.goal)}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setGoal(nextValue)
                  if (nextValue.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.goal) return prev
                      const { goal: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{goal.length}/{GOAL_MAX}</div>
              {fieldErrors.goal && (
                <p style={{ color: 'var(--error)', fontSize: 13, margin: '6px 0 0' }}>{fieldErrors.goal}</p>
              )}
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">{copy.requestLabel}</span>
              <textarea
                ref={requestRef}
                className={`ob2-input${fieldErrors.request ? ' ob2-input--error' : ''}`}
                placeholder={copy.requestPlaceholder}
                value={request}
                maxLength={REQUEST_MAX}
                aria-invalid={Boolean(fieldErrors.request)}
                onChange={(e) => {
                  const nextValue = e.target.value
                  setRequest(nextValue)
                  if (nextValue.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.request) return prev
                      const { request: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right' }}>{request.length}/{REQUEST_MAX}</div>
              {fieldErrors.request && (
                <p style={{ color: 'var(--error)', fontSize: 13, margin: '6px 0 0' }}>{fieldErrors.request}</p>
              )}
            </div>

            <div className="ob2-field">
              <span className="ob2-field-label">Срок сотрудничества</span>
              <div className="ob2-toggle-group">
                {COMMITMENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`ob2-toggle${commitment === c ? ' active' : ''}`}
                    onClick={() => setCommitment(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p style={{ color: 'var(--error)', fontSize: 13, margin: 0 }}>{error}</p>
            )}
          </div>
          )
        })()}
      </div>

      {/* Footer */}
      <div className="ob2-footer">
        {step > 1 && (
          <button type="button" className="ob2-btn-ghost" onClick={goBack}>
            Назад
          </button>
        )}
        <button
          type="button"
          className="ob2-btn-primary"
          onClick={goNext}
          disabled={isPrimaryDisabled}
        >
          {step === TOTAL ? (loading ? 'Сохраняем...' : 'Сохранить') : 'Далее'}
        </button>
      </div>
    </div>
  )
}
