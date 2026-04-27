import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

function EyeIcon({ off }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {off ? (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
          <line x1="1" y1="1" x2="23" y2="23"/>
        </>
      ) : (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </>
      )}
    </svg>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 16, height: 16,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

function Toast({ msg, type, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%',
      transform: 'translateX(-50%)',
      background: type === 'error' ? 'var(--error)' : 'var(--success)',
      color: '#fff',
      borderRadius: 10,
      padding: '11px 18px',
      fontSize: 14,
      fontWeight: 400,
      whiteSpace: 'nowrap',
      zIndex: 300,
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      animation: 'toastIn 0.2s ease',
    }}>
      {msg}
    </div>
  )
}

function Field({ label, type, value, onChange, placeholder, error, autoFocus }) {
  const [showPw, setShowPw] = useState(false)
  const isPw = type === 'password'
  const inputType = isPw ? (showPw ? 'text' : 'password') : type
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
        textTransform: 'uppercase', color: 'var(--muted)',
      }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          style={{
            width: '100%',
            fontFamily: 'inherit',
            fontSize: 16,
            fontWeight: 400,
            border: `1px solid ${error ? 'var(--error)' : 'var(--bg-soft)'}`,
            borderRadius: 8,
            padding: isPw ? '11px 40px 11px 12px' : '11px 12px',
            background: 'var(--bg)',
            color: 'var(--text)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { if (!error) e.target.style.borderColor = 'var(--accent)' }}
          onBlur={e => { if (!error) e.target.style.borderColor = 'var(--bg-soft)' }}
        />
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 11, top: '50%',
              transform: 'translateY(-50%)',
              background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              padding: 2,
            }}>
            <EyeIcon off={showPw} />
          </button>
        )}
      </div>
      {error && (
        <span style={{
          fontSize: 12, color: 'var(--error)', fontWeight: 300,
          animation: 'slideDown 0.15s ease',
        }}>{error}</span>
      )}
    </div>
  )
}

function ModeSwitcher({ mode, setMode }) {
  return (
    <div style={{
      display: 'flex',
      background: 'var(--bg-soft)',
      borderRadius: 10,
      padding: 3,
      gap: 2,
    }}>
      {[['login', 'Вход'], ['register', 'Регистрация']].map(([val, label]) => (
        <button
          key={val}
          type="button"
          onClick={() => setMode(val)}
          style={{
            flex: 1,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: mode === val ? 700 : 400,
            color: mode === val ? 'var(--text)' : 'var(--muted)',
            background: mode === val ? 'var(--bg)' : 'transparent',
            border: 'none',
            borderRadius: 8,
            padding: '8px 0',
            cursor: 'pointer',
            transition: 'all 0.18s ease',
            boxShadow: mode === val ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
          }}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function LoginPage() {
  const { user, loading, profileComplete, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [pwErr, setPwErr] = useState('')
  const [formLoading, setFormLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [pendingAuthRedirect, setPendingAuthRedirect] = useState(false)

  useEffect(() => {
    if (!pendingAuthRedirect || loading || !user) return
    if (profileComplete === true) {
      navigate('/swipe', { replace: true })
    } else if (profileComplete === false) {
      navigate('/onboarding', { replace: true })
    }
  }, [pendingAuthRedirect, loading, user, profileComplete, navigate])

  const switchMode = (m) => {
    if (m === mode) return
    setMode(m)
    setEmailErr('')
    setPwErr('')
    setFormKey(k => k + 1)
  }

  const validate = () => {
    let ok = true
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('Введите корректный email')
      ok = false
    } else {
      setEmailErr('')
    }
    if (!password) {
      setPwErr('Введите пароль')
      ok = false
    } else if (mode === 'register' && password.length < 6) {
      setPwErr('Минимум 6 символов')
      ok = false
    } else {
      setPwErr('')
    }
    return ok
  }

  const translateError = (message) => {
    if (message.includes('User already registered')) return 'Пользователь уже зарегистрирован'
    if (message.includes('Invalid login credentials')) return 'Неверный email или пароль'
    if (message.includes('For security purposes')) return 'Слишком частый запрос. Подождите около минуты.'
    return message
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setFormLoading(true)

    try {
      if (mode === 'login') {
        const { data, error: signInError } = await signIn(email, password)
        if (signInError) throw signInError
        if (!data?.session?.user?.id) throw new Error('Ошибка авторизации')
        setPendingAuthRedirect(true)
      } else {
        const signUpPromise = signUp(email, password)
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Регистрация заняла слишком долго. Попробуйте снова.')), 10000)
        )
        const { data, error: signUpError } = await Promise.race([signUpPromise, timeoutPromise])
        if (signUpError) throw signUpError
        if (data?.session) {
          navigate('/onboarding', { replace: true })
          setPendingAuthRedirect(false)
        } else {
          setToast({ msg: 'Аккаунт создан. Подтвердите email по ссылке из письма.', type: 'success' })
        }
      }
    } catch (err) {
      const message = translateError(err?.message ?? 'Ошибка авторизации')
      setToast({ msg: message, type: 'error' })
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: 'oklch(0.985 0.002 240)',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 390,
        animation: 'fadeIn 0.25s ease',
      }}>
        <div style={{
          background: 'var(--bg)',
          border: '1px solid var(--bg-soft)',
          borderRadius: 16,
          padding: '28px 28px 24px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        }}>
          <ModeSwitcher mode={mode} setMode={switchMode} />

          <form
            key={formKey}
            onSubmit={onSubmit}
            style={{
              marginTop: 24,
              display: 'flex', flexDirection: 'column', gap: 16,
              animation: 'fadeIn 0.18s ease',
            }}
            noValidate
          >
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (emailErr) setEmailErr('') }}
              placeholder="you@example.com"
              error={emailErr}
              autoFocus={true}
            />
            <Field
              label="Пароль"
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); if (pwErr) setPwErr('') }}
              placeholder={mode === 'register' ? 'Минимум 6 символов' : '••••••••'}
              error={pwErr}
            />

            <button
              type="submit"
              disabled={formLoading}
              style={{
                marginTop: 4,
                fontFamily: 'inherit',
                fontSize: 14,
                fontWeight: 700,
                background: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '13px 0',
                cursor: formLoading ? 'not-allowed' : 'pointer',
                opacity: formLoading ? 0.7 : 1,
                display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: 8,
                transition: 'opacity 0.15s, transform 0.1s',
                width: '100%',
              }}
              onMouseEnter={e => { if (!formLoading) e.currentTarget.style.opacity = '0.88' }}
              onMouseLeave={e => { if (!formLoading) e.currentTarget.style.opacity = '1' }}
              onMouseDown={e => { if (!formLoading) e.currentTarget.style.transform = 'scale(0.975)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              {formLoading ? <Spinner /> : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </form>

          <p style={{
            marginTop: 18, textAlign: 'center',
            fontSize: 13, color: 'var(--muted)', fontWeight: 300,
          }}>
            {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
              style={{
                fontFamily: 'inherit',
                fontSize: 13, fontWeight: 400,
                color: 'var(--accent)',
                background: 'none', border: 'none',
                cursor: 'pointer', padding: 0,
              }}>
              {mode === 'login' ? 'Зарегистрируйтесь' : 'Войдите'}
            </button>
          </p>
        </div>
      </div>

      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
