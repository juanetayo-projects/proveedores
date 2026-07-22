-- Agregaciones en el servidor para el Panel Ejecutivo.
-- Antes: el cliente traía TODA `respuestas_detalle` paginando de a 1000 filas
-- (tope de PostgREST) y agregaba en JS -- hasta 24 páginas secuenciales para
-- Alimentación (~15-30s). Ahora se agrega con GROUP BY en Postgres: una sola
-- consulta liviana por gráfica, y el detalle fila-por-fila solo se trae bajo
-- demanda al abrir un popover (ver Reportes/PanelEjecutivo.tsx).

create or replace function panel_distribucion(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(valor text, cantidad bigint)
language sql stable set search_path = public as $$
  select rd.valor, count(*)::bigint as cantidad
  from respuestas_detalle rd
  join preguntas pr on pr.id = rd.pregunta_id
  join respuestas r on r.id = rd.respuesta_id
  join encuestas e on e.id = r.encuesta_id
  where r.encuesta_id = p_encuesta_id
    and pr.tipo_respuesta = case when e.tipo = 'paciente' then 'escala_1_5' else 'escala_4' end
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by rd.valor;
$$;

create or replace function panel_por_categoria(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(categoria text, categoria_area_id bigint, cantidad bigint)
language sql stable set search_path = public as $$
  select
    coalesce(
      case when e.tipo = 'paciente' then r.paciente_tipo_afiliacion else a.nombre end,
      case when e.tipo = 'paciente' then 'Sin dato' else 'Sin área' end
    ) as categoria,
    case when e.tipo = 'paciente' then null else r.area_servicio_id end as categoria_area_id,
    count(*)::bigint as cantidad
  from respuestas_detalle rd
  join preguntas pr on pr.id = rd.pregunta_id
  join respuestas r on r.id = rd.respuesta_id
  join encuestas e on e.id = r.encuesta_id
  left join areas_servicio a on a.id = r.area_servicio_id
  where r.encuesta_id = p_encuesta_id
    and pr.tipo_respuesta = case when e.tipo = 'paciente' then 'escala_1_5' else 'escala_4' end
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by categoria, categoria_area_id
  order by cantidad desc
  limit 10;
$$;

create or replace function panel_conteo_diario(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(dia date, cantidad bigint)
language sql stable set search_path = public as $$
  select r.fecha_respuesta as dia, count(*)::bigint as cantidad
  from respuestas r
  where r.encuesta_id = p_encuesta_id
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by r.fecha_respuesta
  order by dia;
$$;

-- Las 3 funciones son `security invoker` (default): corren con el rol y las
-- políticas RLS del usuario autenticado, igual que cualquier consulta normal
-- del cliente (admin/coordinador ven todo; los demás roles no usan este panel).
grant execute on function panel_distribucion(bigint, date, date) to authenticated;
grant execute on function panel_por_categoria(bigint, date, date) to authenticated;
grant execute on function panel_conteo_diario(bigint, date, date) to authenticated;
