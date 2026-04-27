import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { deleteMyAccount } from '../lib/api'
import { useAuth } from '../context/useAuth'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    <div className="page-shell">
      <h1>Настройки</h1>

      <article className="card" style={{ marginBottom: 12 }}>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Выйти из текущего аккаунта. Данные сохранятся.
        </p>
        <button
          onClick={onSignOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'var(--bg-soft)',
            color: 'var(--text)',
            border: 'none',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
          }}
        >
          <LogOut size={18} strokeWidth={1.8} />
          Выйти из аккаунта
        </button>
      </article>

      <article className="card">
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
          Удаление аккаунта необратимо — все данные, свайпы и мэтчи будут удалены.
        </p>
        {error && <p className="error">{error}</p>}
        <button
          className="danger"
          style={{ width: '100%', padding: '12px 16px', fontSize: 14, fontWeight: 600, borderRadius: 10 }}
          onClick={onDeleteAccount}
          disabled={loading}
        >
          {loading ? 'Удаляем...' : 'Удалить аккаунт'}
        </button>
      </article>
    </div>
  )
}
