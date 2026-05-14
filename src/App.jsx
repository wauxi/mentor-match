import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './context/useAuth'
import PrivateRoute from './components/PrivateRoute'
import ProfileRoute from './components/ProfileRoute'
import BottomNav from './layouts/BottomNav'
import LoginPage from './pages/LoginPage'
import OnboardingPage from './pages/OnboardingPage'
import SwipePage from './pages/SwipePage'
import MatchesPage from './pages/MatchesPage'
import ProfilePage from './pages/ProfilePage'
import MyProfilePage from './pages/MyProfilePage'
import SettingsPage from './pages/SettingsPage'

function App() {
  const { user, loading, profileComplete } = useAuth()
  const location = useLocation()

  const showChrome = user && profileComplete === true && !loading && location.pathname !== '/onboarding'

  return (
    <div className="app-shell">
      <div className="aurora"><div className="blob3" /></div>

      <main className="app-shell__content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/onboarding" element={<PrivateRoute><OnboardingPage /></PrivateRoute>} />
          <Route path="/swipe" element={<ProfileRoute><SwipePage /></ProfileRoute>} />
          <Route path="/matches" element={<ProfileRoute><MatchesPage /></ProfileRoute>} />
          <Route path="/profile/me" element={<ProfileRoute><MyProfilePage /></ProfileRoute>} />
          <Route path="/profile/:id" element={<ProfileRoute><ProfilePage /></ProfileRoute>} />
          <Route path="/settings" element={<ProfileRoute><SettingsPage /></ProfileRoute>} />
          <Route path="*" element={
            !user
              ? <Navigate to="/login" replace />
              : profileComplete !== true
                ? <Navigate to="/onboarding" replace />
                : <Navigate to="/swipe" replace />
          } />
        </Routes>
      </main>

      {showChrome && <BottomNav />}
    </div>
  )
}

export default App
