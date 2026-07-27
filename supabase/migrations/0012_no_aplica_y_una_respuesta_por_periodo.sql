-- 1) Opción "No aplica" en la escala Excelente/Bueno/Regular/Deficiente.
--    `respuestas_detalle.valor` es texto libre (no hay CHECK), así que el valor
--    nuevo no requiere cambio de esquema; lo que sí hay que ajustar es que no
--    contamine los indicadores: "No aplica" no es una calificación.
--    - panel_promedio_pregunta ya lo excluye solo (el CASE no lo mapea a un
--      número, así que avg() lo ignora).
--    - panel_tendencia_mensual sí lo contaba en el denominador: se corrige.
--    - panel_distribucion lo devuelve como un valor más (el Panel Ejecutivo lo
--      muestra en gris y lo descuenta del % de satisfacción).

create or replace function panel_tendencia_mensual(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(mes text, pct numeric, total bigint)
language sql stable set search_path = public as $$
  select
    to_char(r.fecha_respuesta, 'YYYY-MM') as mes,
    100.0 * count(*) filter (
      where (e.tipo = 'paciente' and rd.valor::numeric >= 4)
         or (e.tipo != 'paciente' and rd.valor in ('Excelente', 'Bueno'))
    ) / count(*) as pct,
    count(*)::bigint as total
  from respuestas_detalle rd
  join preguntas pr on pr.id = rd.pregunta_id
  join respuestas r on r.id = rd.respuesta_id
  join encuestas e on e.id = r.encuesta_id
  where r.encuesta_id = p_encuesta_id
    and pr.tipo_respuesta = case when e.tipo = 'paciente' then 'escala_1_5' else 'escala_4' end
    and rd.valor <> 'No aplica'
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by mes
  order by mes;
$$;

-- 2) Una sola encuesta por usuario dentro del período abierto.
--    Aplica a las encuestas con período programado (apertura/cierre). Las
--    marcadas "siempre abierta" -- hoy solo Servicio de Alimentación, que un
--    orientador aplica a muchos pacientes -- no tienen período y no se limitan.
--    La regla vale para todos los roles: administrador y coordinador también
--    diligencian con su propia cuenta.

create or replace function ya_respondio_en_periodo(p_encuesta_id bigint, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from respuestas r
    join encuestas e on e.id = r.encuesta_id
    where r.encuesta_id = p_encuesta_id
      and r.respondido_por = p_profile_id
      and e.siempre_abierta = false
      and e.fecha_apertura is not null
      and e.fecha_cierre is not null
      and r.fecha_respuesta between e.fecha_apertura and e.fecha_cierre
  );
$$;

grant execute on function ya_respondio_en_periodo(bigint, uuid) to authenticated;

create or replace function validar_una_respuesta_por_periodo()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- respondido_por es null en las respuestas migradas del histórico: ahí no
  -- hay usuario al cual aplicarle la restricción.
  if new.respondido_por is not null
     and ya_respondio_en_periodo(new.encuesta_id, new.respondido_por) then
    raise exception 'Ya existe una encuesta diligenciada para este período.'
      using errcode = 'unique_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists respuestas_una_por_periodo on respuestas;
create trigger respuestas_una_por_periodo
  before insert on respuestas
  for each row execute function validar_una_respuesta_por_periodo();
