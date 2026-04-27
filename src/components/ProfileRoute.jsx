import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProfileRoute({ children }) {
  const { user, loading, profileComplete } = useAuth()

  if (loading) return <div className="page-shell">Загрузка...</div>
  if (!user) return <Navigate to="/login" replace />
  if (profileComplete === null) return <div className="page-shell">Загрузка...</div>
  if (profileComplete === false) return <Navigate to="/onboarding" replace />
  return children
}
