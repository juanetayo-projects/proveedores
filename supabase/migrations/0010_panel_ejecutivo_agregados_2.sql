-- Dos agregaciones más para el Panel Ejecutivo (2 gráficas nuevas junto a
-- "Respuestas por área/servicio"): promedio numérico por pregunta y
-- tendencia mensual de % de satisfacción. Mismo patrón que 0009: agregación
-- en Postgres, security invoker (respeta RLS), search_path fijo.

create or replace function panel_promedio_pregunta(
  p_encuesta_id bigint,
  p_desde date default null,
  p_hasta date default null
)
returns table(pregunta_id bigint, pregunta_texto text, orden int, promedio numeric, escala_max int)
language sql stable set search_path = public as $$
  select
    pr.id as pregunta_id,
    pr.texto as pregunta_texto,
    pr.orden,
    avg(
      case
        when pr.tipo_respuesta = 'escala_4' then
          case rd.valor when 'Excelente' then 4 when 'Bueno' then 3 when 'Regular' then 2 when 'Deficiente' then 1 end
        when pr.tipo_respuesta = 'escala_1_5' then rd.valor::numeric
      end
    ) as promedio,
    case when e.tipo = 'paciente' then 5 else 4 end as escala_max
  from respuestas_detalle rd
  join preguntas pr on pr.id = rd.pregunta_id
  join respuestas r on r.id = rd.respuesta_id
  join encuestas e on e.id = r.encuesta_id
  where r.encuesta_id = p_encuesta_id
    and pr.tipo_respuesta = case when e.tipo = 'paciente' then 'escala_1_5' else 'escala_4' end
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by pr.id, pr.texto, pr.orden, e.tipo
  order by pr.orden;
$$;

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
    and (p_desde is null or r.fecha_respuesta >= p_desde)
    and (p_hasta is null or r.fecha_respuesta <= p_hasta)
  group by mes
  order by mes;
$$;

grant execute on function panel_promedio_pregunta(bigint, date, date) to authenticated;
grant execute on function panel_tendencia_mensual(bigint, date, date) to authenticated;
