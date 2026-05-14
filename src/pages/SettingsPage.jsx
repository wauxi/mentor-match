import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Globe, LogOut, Moon, Trash2, User } from 'lucide-react'
import { deleteMyAccount } from '../utils/api'
import { useAuth } from '../context/useAuth'
import { useTheme } from '../context/useTheme'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onEditProfile = () => navigate('/onboarding')

  const onSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const onDeleteAccount = async () => {
    const confirmed = window.confirm('Удалить аккаунт без возможности восстановления?')
    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      await deleteMyAccount()
      await signOut()
      navigate('/login', { replace: true })
    } catch (deleteError) {
      const message = deleteError?.message ?? 'Ошибка удаления аккаунта'

      if (message.includes('Failed to send a request to the Edge Function')) {
        setError(
          'Edge Function не отвечает. Убедитесь, что delete-my-account задеплоена в Supabase.',
        )
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="settings-page__header">
        <h1 className="settings-page__title">Настройки</h1>
      </div>

      <div className="settings-page__scroll">
        {/* Аккаунт */}
        <div>
          <h2 className="settings-group__title">Аккаунт</h2>
          <div className="glass settings-group__card">
            <button type="button" className="settings-item" onClick={onEditProfile}>
              <span className="settings-item__icon settings-item__icon--profile">
                <User size={16} strokeWidth={2.2} />
              </span>
              <span className="settings-item__label">Редактировать профиль</span>
              <ChevronRight size={16} className="settings-item__chevron" />
            </button>
          </div>
        </div>

        {/* Приложение */}
        <div>
          <h2 className="settings-group__title">Приложение</h2>
          <div className="glass settings-group__card">
            <button
              type="button"
              className="settings-item"
              onClick={toggleTheme}
              aria-pressed={isDark}
            >
              <span className="settings-item__icon settings-item__icon--theme">
                <Moon fill="#fff" size={14} strokeWidth={1} />
              </span>
              <span className="settings-item__label">Тёмная тема</span>
              <span className={'settings-toggle' + (isDark ? ' settings-toggle--on' : '')}>
                <span className="settings-toggle__thumb" />
              </span>
            </button>

            <button type="button" className="settings-item" disabled>
              <span className="settings-item__icon settings-item__icon--lang">
                <Globe size={16} strokeWidth={2.2} />
              </span>
              <span className="settings-item__label">Язык</span>
              <span className="settings-item__value">Русский</span>
              <ChevronRight size={16} className="settings-item__chevron" />
            </button>
          </div>
        </div>

        {/* Опасная зона */}
        <div>
          <div className="glass settings-group__card">
            <button type="button" className="settings-item" onClick={onSignOut}>
              <span className="settings-item__icon settings-item__icon--logout">
                <LogOut size={16} strokeWidth={2.2} />
              </span>
              <span className="settings-item__label">Выйти из аккаунта</span>
            </button>

            <button
              type="button"
              className="settings-item"
              onClick={onDeleteAccount}
              disabled={loading}
            >
              <span className="settings-item__icon settings-item__icon--delete">
                <Trash2 size={16} strokeWidth={2.2} />
              </span>
              <span className="settings-item__label settings-item__label--danger">
                {loading ? 'Удаляем…' : 'Удалить аккаунт'}
              </span>
            </button>
          </div>
          {error && <p className="settings-page__error">{error}</p>}
        </div>

        <div className="settings-page__version">Mentor Match v1.0.0</div>
      </div>
    </div>
  )
}
