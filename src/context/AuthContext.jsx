import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../utils/supabase'
import { getMyProfile } from '../utils/api'

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext(null)

const getProfileCacheKey = (userId) => `auth_profile_state_${userId}`

const readCachedProfileState = (userId) => {
  if (!userId) return null

  try {
    const raw = sessionStorage.getItem(getProfileCacheKey(userId))
    if (!raw) return null
    const cached = JSON.parse(raw)

    if (typeof cached?.profileExists === 'boolean' && typeof cached?.onboardingCompleted === 'boolean') {
      return cached
    }
  } catch {
    // ignore broken cache value
  }

  return null
}

const writeCachedProfileState = (userId, profileExists, onboardingCompleted, role = null) => {
  if (!userId) return

  try {
    sessionStorage.setItem(
      getProfileCacheKey(userId),
      JSON.stringify({ profileExists, onboardingCompleted, role }),
    )
  } catch {
    // ignore storage write errors
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileExists, setProfileExists] = useState(null)
  const [onboardingCompleted, setOnboardingCompleted] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const hydrateProfileStateFromCache = useCallback((userId) => {
    const cached = readCachedProfileState(userId)
    if (!cached) return false

    setProfileExists(cached.profileExists)
    setOnboardingCompleted(cached.onboardingCompleted)
    setUserRole(cached.role ?? null)
    return true
  }, [])

  const loadProfile = useCallback(async (userId, throwOnError = false) => {
    let timerId
    const timeout = new Promise((_, reject) => {
      timerId = setTimeout(() => reject(new Error('Profile load timeout')), 8000)
    })

    try {
      const data = await Promise.race([getMyProfile(userId), timeout])
      const nextProfileExists = !!data
      const nextOnboardingCompleted = data?.onboarding_completed === true
      const nextRole = data?.role ?? null

      setProfileExists(nextProfileExists)
      setOnboardingCompleted(nextOnboardingCompleted)
      setUserRole(nextRole)
      writeCachedProfileState(userId, nextProfileExists, nextOnboardingCompleted, nextRole)
    } catch (error) {
      const hydrated = hydrateProfileStateFromCache(userId)
      if (!hydrated && throwOnError) {
        setProfileExists(null)
        setOnboardingCompleted(null)
        setUserRole(null)
      }
      if (throwOnError) throw error
    } finally {
      clearTimeout(timerId)
      setProfileLoading(false)
    }
  }, [hydrateProfileStateFromCache])

  const signIn = useCallback(
    (email, password) => supabase.auth.signInWithPassword({ email, password }),
    []
  )
  const signUp = useCallback(
    (email, password) => supabase.auth.signUp({ email, password }),
    []
  )
  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const refreshProfile = useCallback(async () => {
    const userId = session?.user?.id
    if (!userId) return
    setProfileLoading(true)
    await loadProfile(userId, true)
  }, [session, loadProfile])

  useEffect(() => {
    let mounted = true

    async function bootstrap() {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted) return
      if (error) console.error(error)
      const nextSession = data.session ?? null
      setSession(nextSession)

      if (nextSession?.user?.id) {
        hydrateProfileStateFromCache(nextSession.user.id)
        setProfileLoading(true)
        void loadProfile(nextSession.user.id)
      } else {
        setProfileExists(false)
        setOnboardingCompleted(false)
      }
      setAuthLoading(false)
    }

    bootstrap()

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!mounted) return
      setSession(nextSession ?? null)
      setAuthLoading(false)

      if (!nextSession?.user) {
        setProfileExists(false)
        setOnboardingCompleted(false)
        return
      }

      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        hydrateProfileStateFromCache(nextSession.user.id)
        setProfileLoading(true)
        void loadProfile(nextSession.user.id)
      }
    })

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [loadProfile, hydrateProfileStateFromCache])

  const value = useMemo(() => {
    const user = session?.user ?? null
    const loading = authLoading || profileLoading
    const profileComplete = !user
      ? null
      : profileLoading
        ? null
        : profileExists && onboardingCompleted

    return {
      user,
      session,
      loading,
      profileComplete,
      userRole,
      refreshProfile,
      signIn,
      signUp,
      signOut,
    }
  }, [authLoading, profileLoading, session, profileExists, onboardingCompleted, userRole, refreshProfile, signIn, signUp, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
