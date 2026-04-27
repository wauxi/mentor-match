import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(
    JSON.stringify(payload),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !/^Bearer\s+/i.test(authHeader)) {
      return jsonResponse(
        { error: { code: 'missing_authorization', message: 'Authorization required' } },
        401,
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        { error: { code: 'server_misconfigured', message: 'Function is not configured' } },
        500,
      )
    }

    // Validate JWT using Supabase Auth API. Never trust decoded payload from the client token.
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: { Authorization: authHeader },
      },
    })

    const { data: authData, error: authError } = await authClient.auth.getUser()
    const authenticatedUserId = authData?.user?.id

    if (authError || !authenticatedUserId) {
      return jsonResponse(
        { error: { code: 'invalid_token', message: 'Invalid or expired token' } },
        401,
      )
    }

    // 2. Админ клиент для удаления только текущего authenticated пользователя
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    })

    // Удаляем аватар пользователя через Storage API, без доступа к storage.objects
    const { data: avatarObjects, error: listError } = await adminClient.storage
      .from('avatars')
      .list('', { search: authenticatedUserId, limit: 100 })

    if (listError) {
      return jsonResponse(
        { error: { code: 'storage_list_failed', message: 'Failed to process account data' } },
        500,
      )
    }

    const avatarKeys = [
      authenticatedUserId,
      ...((avatarObjects ?? []).map((object: { name: string }) => object.name)),
    ]

    const uniqueAvatarKeys = [...new Set(avatarKeys)].filter(Boolean)

    if (uniqueAvatarKeys.length > 0) {
      const { error: removeError } = await adminClient.storage.from('avatars').remove(uniqueAvatarKeys)
      if (removeError) {
        return jsonResponse(
          { error: { code: 'storage_remove_failed', message: 'Failed to process account data' } },
          500,
        )
      }
    }

    // 3. Удаляем пользователя
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(authenticatedUserId)

    if (deleteError) {
      return jsonResponse(
        { error: { code: 'delete_failed', message: 'Failed to delete account' } },
        500,
      )
    }

    return jsonResponse({ ok: true }, 200)

  } catch {
    return jsonResponse(
      { error: { code: 'internal_error', message: 'Internal server error' } },
      500,
    )
  }
})