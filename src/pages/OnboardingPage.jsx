import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../context/useAuth'
import { upsertOnboardingProfile, getMyProfile, uploadAvatar } from '../utils/api'
import { getInitials, ROLE_COPY } from '../utils/ui'
import {
  PROFILE_FORMAT_OPTIONS,
  normalizeProfileFormat,
} from '../constants/profileEnums'

const INDUSTRIES = ['IT', 'Fintech', 'EdTech', 'Healthcare', 'Marketing', 'Design', 'Startup', 'Другое']
const LEVELS = ['Junior', 'Middle', 'Senior', 'Lead']
const COMMITMENTS = ['1 месяц', '3 месяца', '6 месяцев', '1 год', 'Бессрочно']
const NAME_MAX = 20
const BIO_MAX = 300
const GOAL_MAX = 300
const REQUEST_MAX = 300

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
const STEP_TITLES = ['О себе', 'Параметры', 'Цели']

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

  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [role, setRole] = useState('mentee')
  const [name, setName] = useState('')
  const [bio, setBio] = useState('')

  const [industry, setIndustry] = useState('')
  const [level, setLevel] = useState('')
  const [format, setFormat] = useState('')
  const [skills, setSkills] = useState([])
  const [extraSkills, setExtraSkills] = useState([])

  const [availability, setAvailability] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')

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
          if (existing.commitment) setCommitment(existing.commitment)
          if (existing.current_level) setLevel(existing.current_level)
          if (existing.request) setRequest(existing.request)
          if (existing.tags?.length) {
            setSkills(existing.tags)
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
          if (typeof draft.goal === 'string') setGoal(draft.goal)
          if (typeof draft.request === 'string') setRequest(draft.request)
          if (typeof draft.commitment === 'string') setCommitment(draft.commitment)
        }
      } catch {
        // first-time user
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
      step, role, name, bio, industry, level, format,
      availability, skills, goal, request, commitment,
    }
    localStorage.setItem(storageKey, JSON.stringify(draft))
  }, [step, role, name, bio, industry, level, format, availability, skills, goal, request, commitment, storageKey])

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
      setStep((s) => s + 1)
    } else {
      handleSave()
    }
  }

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1)
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

      await upsertOnboardingProfile(user.id, {
        name: trimmedName,
        role,
        bio,
        industry,
        goal: trimmedGoal,
        format: format || null,
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

  const stepOneValid = !getRequiredFieldErrors({ name, goal: 'ok', request: 'ok' }, role).name
  const stepThreeErrors = getRequiredFieldErrors({ name: 'ok', goal, request }, role)
  const stepThreeValid = !stepThreeErrors.goal && !stepThreeErrors.request
  const isPrimaryDisabled = loading || (step === 1 && !stepOneValid) || (step === TOTAL && !stepThreeValid)
  const copy = ROLE_COPY[role] ?? ROLE_COPY.mentee

  if (profileLoading) {
    return (
      <div className="onboarding">
        <div className="onboarding__loading">
          <div className="loading-spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding">
      {/* Progress */}
      <div className="onboarding__progress">
        <div className="onboarding__progress-bars">
          {STEP_TITLES.map((_, i) => (
            <div
              key={i}
              className={
                'onboarding__progress-bar' +
                (i < step ? ' onboarding__progress-bar--filled' : '')
              }
            />
          ))}
        </div>
        <p className="onboarding__progress-label">
          Шаг {step} из {TOTAL} · {STEP_TITLES[step - 1]}
        </p>
      </div>

      {/* Scroll */}
      <div className="onboarding__scroll" ref={scrollRef}>
        {step === 1 && (
          <div className="onboarding__step" key="step1">
            <h1 className="onboarding__heading">
              {profileComplete === true ? 'Редактирование профиля' : 'Расскажите о себе'}
            </h1>

            {/* Avatar */}
            <div className="onboarding__avatar-wrap">
              <div className="onboarding__avatar">
                <div className="onboarding__avatar-circle">
                  {photoPreview ? (
                    <img src={photoPreview} alt="" />
                  ) : (
                    <span>{name ? getInitials(name) : '?'}</span>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={onPhotoChange}
                />
                <button
                  type="button"
                  className="onboarding__avatar-btn"
                  onClick={() => fileRef.current?.click()}
                  aria-label="Загрузить фото"
                >
                  <Plus size={14} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {/* Role */}
            <div className="onboarding__field">
              <span className="onboarding__field-label">Я являюсь</span>
              <div className="onboarding__toggle-row">
                {[
                  { value: 'mentor', label: 'Наставник' },
                  { value: 'mentee', label: 'Наставляемый' },
                ].map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    className={
                      'onboarding__chip' + (role === r.value ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => setRole(r.value)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Name */}
            <div className="onboarding__field">
              <span className="onboarding__field-label">Имя</span>
              <input
                className={
                  'onboarding__input' + (fieldErrors.name ? ' onboarding__input--error' : '')
                }
                placeholder="Ваше имя"
                value={name}
                maxLength={NAME_MAX}
                autoCapitalize="words"
                autoComplete="name"
                aria-invalid={Boolean(fieldErrors.name)}
                onChange={(e) => {
                  const v = e.target.value
                  setName(v)
                  if (v.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.name) return prev
                      const { name: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div className="onboarding__field-counter">{name.length}/{NAME_MAX}</div>
              {fieldErrors.name && (
                <p className="onboarding__field-error">{fieldErrors.name}</p>
              )}
            </div>

            {/* Bio */}
            <div className="onboarding__field">
              <span className="onboarding__field-label">
                О себе <span className="onboarding__field-label-muted">(необязательно)</span>
              </span>
              <textarea
                ref={bioRef}
                rows={3}
                className="onboarding__input onboarding__input--textarea"
                placeholder="Расскажите о своём опыте..."
                value={bio}
                maxLength={BIO_MAX}
                onChange={(e) => setBio(e.target.value)}
              />
              <div className="onboarding__field-counter">{bio.length}/{BIO_MAX}</div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding__step" key="step2">
            <h1 className="onboarding__heading">Параметры подбора</h1>

            <div className="onboarding__field">
              <span className="onboarding__field-label">Индустрия</span>
              <div className="onboarding__chips">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    className={
                      'onboarding__chip' + (industry === ind ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => setIndustry(industry === ind ? '' : ind)}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">Уровень</span>
              <div className="onboarding__chips">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    className={
                      'onboarding__chip' + (level === l ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => setLevel(l)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">Формат</span>
              <div className="onboarding__chips">
                {PROFILE_FORMAT_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    className={
                      'onboarding__chip' + (format === f.value ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => setFormat(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">Часов в неделю</span>
              <input
                className={
                  'onboarding__input' +
                  (availabilityError ? ' onboarding__input--error' : '')
                }
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                placeholder="Например, 4"
                value={availability}
                aria-invalid={Boolean(availabilityError)}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '')
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
                <p className="onboarding__field-error">{availabilityError}</p>
              )}
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">
                Навыки
                {skills.length > 0 && (
                  <span className="onboarding__field-label-muted"> · выбрано {skills.length}/8</span>
                )}
              </span>
              <div className="onboarding__chips">
                {allSkills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={
                      'onboarding__chip' + (skills.includes(s) ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => toggleSkill(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding__step" key="step3">
            <h1 className="onboarding__heading">
              {role === 'mentor' ? 'О вашей работе' : 'Ваши цели'}
            </h1>

            <div className="onboarding__field">
              <span className="onboarding__field-label">{copy.goalLabel}</span>
              <textarea
                ref={goalRef}
                rows={4}
                className={
                  'onboarding__input onboarding__input--textarea' +
                  (fieldErrors.goal ? ' onboarding__input--error' : '')
                }
                placeholder={copy.goalPlaceholder}
                value={goal}
                maxLength={GOAL_MAX}
                aria-invalid={Boolean(fieldErrors.goal)}
                onChange={(e) => {
                  const v = e.target.value
                  setGoal(v)
                  if (v.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.goal) return prev
                      const { goal: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div className="onboarding__field-counter">{goal.length}/{GOAL_MAX}</div>
              {fieldErrors.goal && (
                <p className="onboarding__field-error">{fieldErrors.goal}</p>
              )}
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">{copy.requestLabel}</span>
              <textarea
                ref={requestRef}
                rows={4}
                className={
                  'onboarding__input onboarding__input--textarea' +
                  (fieldErrors.request ? ' onboarding__input--error' : '')
                }
                placeholder={copy.requestPlaceholder}
                value={request}
                maxLength={REQUEST_MAX}
                aria-invalid={Boolean(fieldErrors.request)}
                onChange={(e) => {
                  const v = e.target.value
                  setRequest(v)
                  if (v.trim()) {
                    setFieldErrors((prev) => {
                      if (!prev.request) return prev
                      const { request: _omit, ...rest } = prev
                      return rest
                    })
                  }
                }}
              />
              <div className="onboarding__field-counter">{request.length}/{REQUEST_MAX}</div>
              {fieldErrors.request && (
                <p className="onboarding__field-error">{fieldErrors.request}</p>
              )}
            </div>

            <div className="onboarding__field">
              <span className="onboarding__field-label">Срок сотрудничества</span>
              <div className="onboarding__chips">
                {COMMITMENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={
                      'onboarding__chip' + (commitment === c ? ' onboarding__chip--active' : '')
                    }
                    onClick={() => setCommitment(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="onboarding__field-error">{error}</p>}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="onboarding__footer glass">
        {step > 1 && (
          <button type="button" className="onboarding__btn-ghost" onClick={goBack}>
            Назад
          </button>
        )}
        <button
          type="button"
          className="onboarding__btn-primary"
          onClick={goNext}
          disabled={isPrimaryDisabled}
        >
          {step === TOTAL ? (loading ? 'Сохраняем…' : 'Сохранить') : 'Далее →'}
        </button>
      </div>
    </div>
  )
}
