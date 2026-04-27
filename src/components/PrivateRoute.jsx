import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-shell">Загрузка...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}
