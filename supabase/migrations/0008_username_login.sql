-- Login por nombre de usuario en vez de correo electrónico.
alter table profiles add column username text;
update profiles set username = split_part(email, '@', 1) where username is null;
alter table profiles alter column username set not null;
create unique index profiles_username_unique_idx on profiles (lower(username));

-- Resuelve el correo asociado a un usuario para poder autenticar con
-- signInWithPassword (que requiere email). SECURITY DEFINER porque se llama
-- antes de autenticar (rol anon no puede leer profiles por RLS).
create or replace function email_por_usuario(p_username text)
returns text
language sql
security definer
set search_path = public
as $$
  select email from profiles where lower(username) = lower(p_username) and activo = true limit 1;
$$;

grant execute on function email_por_usuario(text) to anon, authenticated;
