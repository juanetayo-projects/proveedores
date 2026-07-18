-- Esquema base: perfiles, catálogo de áreas, encuestas dinámicas (EAV) y respuestas.

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nombre text not null,
  role text not null default 'encuestado'
    check (role in ('administrador', 'coordinador_administrativo', 'encuestado', 'orientador')),
  area_servicio_id bigint,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create table areas_servicio (
  id bigserial primary key,
  nombre text not null unique,
  activo boolean not null default true
);

alter table profiles
  add constraint profiles_area_servicio_fkey
  foreign key (area_servicio_id) references areas_servicio(id);

-- tipo: 'paciente' (responde el paciente, un orientador la aplica/registra)
--       'proveedor' (responde personal interno = encuestado, evaluando al proveedor)
create table encuestas (
  id bigserial primary key,
  codigo text not null unique,
  nombre text not null,
  proveedor text,
  tipo text not null check (tipo in ('paciente', 'proveedor')),
  siempre_abierta boolean not null default false,
  fecha_apertura date,
  fecha_cierre date,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

create table preguntas (
  id bigserial primary key,
  encuesta_id bigint not null references encuestas(id) on delete cascade,
  orden int not null default 0,
  texto text not null,
  tipo_respuesta text not null
    check (tipo_respuesta in ('escala_1_5', 'escala_4', 'si_no', 'texto_libre')),
  requerida boolean not null default true,
  activa boolean not null default true
);
create index on preguntas (encuesta_id, orden);

-- a qué encuestas tiene acceso cada encuestado/orientador (muchos a muchos)
create table asignaciones_encuestado (
  id bigserial primary key,
  profile_id uuid not null references profiles(id) on delete cascade,
  encuesta_id bigint not null references encuestas(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (profile_id, encuesta_id)
);

create table respuestas (
  id bigserial primary key,
  encuesta_id bigint not null references encuestas(id),
  respondido_por uuid references profiles(id),
  area_servicio_id bigint references areas_servicio(id),
  identificador_evaluado text,
  -- datos del paciente (solo encuestas tipo 'paciente'; PII, nunca a git)
  paciente_nombre text,
  paciente_identificacion text,
  paciente_municipio text,
  paciente_genero text,
  paciente_numero_habitacion text,
  paciente_tipo_afiliacion text,
  fecha_respuesta date not null default current_date,
  created_at timestamptz not null default now()
);
create index on respuestas (encuesta_id, fecha_respuesta);
create index on respuestas (respondido_por);

create table respuestas_detalle (
  id bigserial primary key,
  respuesta_id bigint not null references respuestas(id) on delete cascade,
  pregunta_id bigint not null references preguntas(id),
  valor text not null,
  unique (respuesta_id, pregunta_id)
);

create or replace function is_admin() returns boolean
language sql security definer set search_path = public as $$
  select exists(
    select 1 from profiles where id = auth.uid() and role = 'administrador'
  );
$$;

create or replace function is_admin_o_coordinador() returns boolean
language sql security definer set search_path = public as $$
  select exists(
    select 1 from profiles
    where id = auth.uid() and role in ('administrador', 'coordinador_administrativo')
  );
$$;

create or replace function esta_asignado(p_encuesta_id bigint) returns boolean
language sql security definer set search_path = public as $$
  select exists(
    select 1 from asignaciones_encuestado
    where profile_id = auth.uid() and encuesta_id = p_encuesta_id
  );
$$;

create or replace function encuesta_abierta(p_encuesta_id bigint) returns boolean
language sql security definer set search_path = public as $$
  select siempre_abierta
    or (fecha_apertura is not null and fecha_cierre is not null
        and current_date between fecha_apertura and fecha_cierre)
  from encuestas where id = p_encuesta_id;
$$;
