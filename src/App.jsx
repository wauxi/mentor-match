import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom'
import { Settings, User, Layers, MessageCircle } from 'lucide-react'
import { useAuth } from './context/useAuth'
import PrivateRoute from './components/PrivateRoute'
import ProfileRoute from './components/ProfileRoute'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import SwipePage from './pages/SwipePage'
import MatchesPage from './pages/MatchesPage'
import ProfilePage from './pages/ProfilePage'
import MyProfilePage from './pages/MyProfilePage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { user, loading, profileComplete } = useAuth()
  const navigate = useNavigate()

  const showChrome = user && profileComplete === true && !loading

  return (
    <div className="app-layout">
      {showChrome && (
        <header className="topbar">
          <button className="icon-btn" onClick={() => navigate('/settings')}>
            <Settings size={20} color="#181d2a" strokeWidth={1.5} />
          </button>
          <button className="icon-btn" onClick={() => navigate('/profile/me')}>
            <User size={20} color="#181d2a" strokeWidth={1.5} />
          </button>
        </header>
      )}

      <main className={showChrome ? 'main-content' : 'main-content main-content--bare'}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
          <Route path="/swipe"      element={<ProfileRoute><SwipePage /></ProfileRoute>} />
          <Route path="/matches"    element={<ProfileRoute><MatchesPage /></ProfileRoute>} />
          <Route path="/profile/me" element={<ProfileRoute><MyProfilePage /></ProfileRoute>} />
          <Route path="/profile/:id" element={<ProfileRoute><ProfilePage /></ProfileRoute>} />
          <Route path="/settings"   element={<ProfileRoute><SettingsPage /></ProfileRoute>} />
          <Route path="*" element={
            !user
              ? <Navigate to="/login" replace />
              : profileComplete !== true
                ? <Navigate to="/onboarding" replace />
                : <Navigate to="/swipe" replace />
          } />
        </Routes>
      </main>

      {showChrome && (
        <nav className="bottom-nav">
          <NavLink
            to="/swipe"
            className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
          >
            <Layers size={22} strokeWidth={1.5} />
            <span className="bottom-nav-label">Лента</span>
          </NavLink>
          <NavLink
            to="/matches"
            className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
          >
            <MessageCircle size={22} strokeWidth={1.5} />
            <span className="bottom-nav-label">Мэтчи</span>
          </NavLink>
        </nav>
      )}
    </div>
  )
}

export default App
