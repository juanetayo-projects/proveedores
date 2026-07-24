import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const authHeader = req.headers.get('Authorization') ?? ''
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const caller = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return json(401, { error: 'No autenticado' })

  const { data: perfil } = await admin.from('profiles').select('role').eq('id', user.id).single()
  if (perfil?.role !== 'administrador' && perfil?.role !== 'coordinador_administrativo') {
    return json(403, { error: 'Solo administrador o coordinador administrativo pueden gestionar usuarios' })
  }

  const body = await req.json()
  const { accion } = body

  if (accion === 'crear') {
    const { email, password, nombre, role, area_servicio_id, username } = body
    if (!username?.trim()) return json(400, { error: 'El nombre de usuario es obligatorio' })
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (error) return json(400, { error: error.message })
    const { error: errPerfil } = await admin
      .from('profiles')
      .insert({ id: data.user.id, email, nombre, role, area_servicio_id: area_servicio_id ?? null, username: username.trim() })
    if (errPerfil) {
      await admin.auth.admin.deleteUser(data.user.id)
      const msg = errPerfil.message.includes('profiles_username_unique_idx')
        ? 'Ese nombre de usuario ya está en uso'
        : errPerfil.message
      return json(400, { error: msg })
    }
    return json(200, { ok: true, id: data.user.id })
  }

  if (accion === 'eliminar') {
    const { id } = body
    await admin.auth.admin.deleteUser(id)
    return json(200, { ok: true })
  }

  if (accion === 'reset') {
    const { id, password } = body
    const { error } = await admin.auth.admin.updateUserById(id, { password })
    if (error) return json(400, { error: error.message })
    return json(200, { ok: true })
  }

  if (accion === 'actualizar') {
    const { id, nombre, role, area_servicio_id, activo, username } = body
    const cambio: Record<string, unknown> = { nombre, role, area_servicio_id: area_servicio_id ?? null, activo }
    if (username?.trim()) cambio.username = username.trim()
    const { error } = await admin.from('profiles').update(cambio).eq('id', id)
    if (error) {
      const msg = error.message.includes('profiles_username_unique_idx')
        ? 'Ese nombre de usuario ya está en uso'
        : error.message
      return json(400, { error: msg })
    }
    return json(200, { ok: true })
  }

  return json(400, { error: 'Acción inválida' })
})

const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
