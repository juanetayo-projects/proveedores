-- Comparativo de encuestas realizadas por cada orientador/encuestado en el
-- período filtrado, para el Panel Ejecutivo (objetivo: comparar niveles de
-- eficacia entre orientadores). Cuenta filas de `respuestas` (1 por envío),
-- no `respuestas_detalle`, así que es una consulta liviana.

create or replace function panel_por_encuestador(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(profile_id uuid, nombre text, cantidad bigint)
language sql stable set search_path = public as $$
  -- join (no left join): las respuestas históricas sin cuenta vinculada
  -- (respondido_por null) no aportan al comparativo entre personas reales.
  select r.respondido_por, p.nombre, count(*)::bigint as cantidad
  from respuestas r
  join profiles p on p.id = r.respondido_por
  where r.encuesta_id = p_encuesta_id
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by r.respondido_por, p.nombre
  order by cantidad desc;
$$;

grant execute on function panel_por_encuestador(bigint, date, date) to authenticated;
