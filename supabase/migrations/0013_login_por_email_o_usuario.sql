-- Permite iniciar sesión y recuperar contraseña usando el username o el correo
-- completo indistintamente (los usuarios suelen escribir el correo).
create or replace function email_por_usuario(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles
  where activo = true
    and (lower(username) = lower(p_username) or lower(email) = lower(p_username))
  limit 1;
$$;
