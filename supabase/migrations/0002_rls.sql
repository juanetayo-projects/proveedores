alter table profiles enable row level security;
alter table areas_servicio enable row level security;
alter table encuestas enable row level security;
alter table preguntas enable row level security;
alter table asignaciones_encuestado enable row level security;
alter table respuestas enable row level security;
alter table respuestas_detalle enable row level security;

-- profiles: cada quien ve su propio perfil; admin/coordinador ven todos.
-- solo la Edge Function admin-usuarios (service_role) crea/edita/elimina perfiles.
create policy "perfil propio lectura" on profiles
  for select using (auth.uid() = id or is_admin_o_coordinador());

-- areas_servicio: catálogo de lectura para autenticados, escritura admin/coordinador.
create policy "areas lectura" on areas_servicio
  for select using (auth.role() = 'authenticated');
create policy "areas escritura" on areas_servicio
  for all using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());

-- encuestas: lectura para autenticados (para poder listar/filtrar), escritura admin/coordinador.
create policy "encuestas lectura" on encuestas
  for select using (auth.role() = 'authenticated');
create policy "encuestas escritura" on encuestas
  for all using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());

-- preguntas: igual que encuestas.
create policy "preguntas lectura" on preguntas
  for select using (auth.role() = 'authenticated');
create policy "preguntas escritura" on preguntas
  for all using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());

-- asignaciones: el encuestado/orientador ve las suyas; admin/coordinador ven y gestionan todas.
create policy "asignaciones lectura propia" on asignaciones_encuestado
  for select using (profile_id = auth.uid() or is_admin_o_coordinador());
create policy "asignaciones escritura admin" on asignaciones_encuestado
  for all using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());

-- respuestas: solo se insertan si el usuario está asignado a esa encuesta y está abierta.
-- lectura: el propio encuestado/orientador ve lo que registró; admin/coordinador ven todo.
create policy "respuestas lectura" on respuestas
  for select using (respondido_por = auth.uid() or is_admin_o_coordinador());
create policy "respuestas insercion" on respuestas
  for insert with check (
    respondido_por = auth.uid()
    and esta_asignado(encuesta_id)
    and encuesta_abierta(encuesta_id)
  );
-- correcciones posteriores quedan solo para admin/coordinador (integridad de la evaluación).
create policy "respuestas actualizacion admin" on respuestas
  for update using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());
create policy "respuestas borrado admin" on respuestas
  for delete using (is_admin_o_coordinador());

create policy "detalle lectura" on respuestas_detalle
  for select using (
    exists (select 1 from respuestas r where r.id = respuesta_id
            and (r.respondido_por = auth.uid() or is_admin_o_coordinador()))
  );
create policy "detalle insercion" on respuestas_detalle
  for insert with check (
    exists (select 1 from respuestas r where r.id = respuesta_id and r.respondido_por = auth.uid())
  );
create policy "detalle actualizacion admin" on respuestas_detalle
  for update using (is_admin_o_coordinador()) with check (is_admin_o_coordinador());
create policy "detalle borrado admin" on respuestas_detalle
  for delete using (is_admin_o_coordinador());
