-- El orientador solo puede asignarse a encuestas tipo 'paciente' (Alimentación)
-- y el encuestado solo a encuestas tipo 'proveedor' -- se valida también a
-- nivel de base de datos, no solo en la UI de Gestión de encuesta.
create or replace function validar_asignacion_rol() returns trigger
language plpgsql as $$
declare
  v_role text;
  v_tipo text;
begin
  select role into v_role from profiles where id = new.profile_id;
  select tipo into v_tipo from encuestas where id = new.encuesta_id;

  if v_role = 'orientador' and v_tipo <> 'paciente' then
    raise exception 'Un orientador solo puede asignarse a encuestas de tipo paciente (ej. Alimentación)';
  end if;

  if v_role = 'encuestado' and v_tipo <> 'proveedor' then
    raise exception 'Un encuestado solo puede asignarse a encuestas de tipo proveedor';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_asignacion_rol on asignaciones_encuestado;
create trigger trg_validar_asignacion_rol
  before insert or update on asignaciones_encuestado
  for each row execute function validar_asignacion_rol();
