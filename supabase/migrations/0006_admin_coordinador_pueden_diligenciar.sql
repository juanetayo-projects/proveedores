-- Permite que administrador/coordinador_administrativo diligencien cualquier
-- encuesta activa sin necesitar una fila de asignación (ya tienen acceso total).
drop policy "respuestas insercion" on respuestas;
create policy "respuestas insercion" on respuestas
  for insert with check (
    respondido_por = auth.uid()
    and encuesta_abierta(encuesta_id)
    and (esta_asignado(encuesta_id) or is_admin_o_coordinador())
  );

drop policy "detalle insercion" on respuestas_detalle;
create policy "detalle insercion" on respuestas_detalle
  for insert with check (
    exists (
      select 1 from respuestas r
      where r.id = respuesta_id
        and r.respondido_por = auth.uid()
    )
  );
