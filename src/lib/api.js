import { supabase } from './supabase'
import { normalizeProfileFormat, normalizeUrgency } from './contracts/profileEnums'

export async function getFeed(limit = 30, offset = 0) {
  const { data, error } = await supabase.rpc('api_get_feed', {
    p_limit: limit,
    p_offset: offset,
  })
  if (error) throw error
  return data ?? []
}

export async function submitSwipe(candidateId, direction) {
  const { data, error } = await supabase.rpc('api_submit_swipe', {
    p_to_user_id: candidateId,
    p_direction: direction,
  })
  if (error) throw error
  return data?.[0] ?? { is_match: false, match_id: null }
}

export async function getProfile(profileId) {
  const { data, error } = await supabase.rpc('api_get_profile', {
    p_profile_id: profileId,
  })
  if (error) throw error
  return data?.[0] ?? null
}

export async function getProfilesBatch(ids) {
  if (!ids?.length) return []
  const results = await Promise.all(ids.map((id) => getProfile(id).catch(() => null)))
  return results.filter(Boolean)
}

export async function upsertOnboardingProfile(userId, values) {
  const canonicalFormat = normalizeProfileFormat(values.format, { fallback: null })
  const canonicalUrgency = normalizeUrgency(values.urgency, { fallback: null })

  const payload = {
    id: userId,
    name: values.name,
    role: values.role,
    bio: values.bio,
    industry: values.industry || null,
    goal: values.goal || null,
    format: canonicalFormat,
    urgency: canonicalUrgency,
    commitment: values.commitment || null,
    tags: Array.isArray(values.tags) ? values.tags : [],
    current_level: values.current_level || null,
    availability: Number(values.availability) || 0,
    request: values.request || null,
    avatar_url: values.avatar_url ?? null,
    onboarding_completed: true,
  }

  const { error } = await supabase.from('profiles').upsert(payload)
  if (error) throw error
}

export async function getMyProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getMyMatches(userId) {
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function deleteMyAccount() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Сессия истекла. Войдите заново и повторите удаление аккаунта.')
  }

  const { data, error } = await supabase.functions.invoke('delete-my-account', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (error) {
    let details = error.message
    if (error.context && typeof error.context.json === 'function') {
      try {
        const payload = await error.context.json()
        if (typeof payload?.error === 'string') {
          details = payload.error
        } else if (payload?.error?.message) {
          details = payload.error.message
        }
      } catch { /* ignore */ }
    }
    throw new Error(details)
  }
  return data
}

// ── Avatar ────────────────────────────────────────────────────

export function getAvatarUrl(userId) {
  const { data } = supabase.storage.from('avatars').getPublicUrl(userId)
  return data?.publicUrl ?? null
}

export async function uploadAvatar(userId, file) {
  const { error } = await supabase.storage
    .from('avatars')
    .upload(userId, file, { upsert: true, contentType: file.type })
  if (error) throw error
  return getAvatarUrl(userId)
}
