-- Catálogo de áreas/servicio (normalizado a partir del histórico de las 6 encuestas de proveedores).
insert into areas_servicio (nombre) values
  ('Cadena de Suministros'),
  ('UCI UCIN'),
  ('Cirugía'),
  ('Hospitalización Parcial'),
  ('Central de Esterilización'),
  ('Coordinación Médica Urgencias'),
  ('Calidad y Mejoramiento'),
  ('Gestión del Conocimiento'),
  ('Gestión Transversal'),
  ('Comité de Infecciones'),
  ('Seguridad del Paciente'),
  ('Riesgo y Contratación'),
  ('Proceso Apoyo Terapéutico Nutrición');

-- Las 7 encuestas. "alimentacion" es de paciente y siempre abierta;
-- las 6 de proveedor arrancan sin fechas -- el admin/coordinador programa
-- apertura/cierre desde "Gestión de encuesta".
insert into encuestas (codigo, nombre, proveedor, tipo, siempre_abierta) values
  ('alimentacion', 'Encuesta de Satisfacción Servicio de Alimentación', 'Servicio de Alimentación', 'paciente', true),
  ('brillaseo', 'Evaluación de Proveedores', 'Brillaseo', 'proveedor', false),
  ('ge2', 'Evaluación de Proveedores', 'GE2', 'proveedor', false),
  ('napoles', 'Evaluación de Proveedores', 'Nápoles', 'proveedor', false),
  ('san_rafael', 'Evaluación de Proveedores', 'Fundación San Rafael', 'proveedor', false),
  ('elis', 'Evaluación de Proveedores', 'Elis', 'proveedor', false),
  ('emerlili', 'Evaluación de Proveedores', 'Ambulancias Emerlili', 'proveedor', false);

-- Preguntas: Alimentación (6 escala 1-5 + recomienda si/no + sugerencia libre)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'alimentacion'), 1, 'La apariencia de la comida recibida en la Clínica es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 2, 'La temperatura de la comida que recibe en la Clínica es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 3, 'La puntualidad en la entrega de los alimentos (Desayuno-Almuerzo-Cena), es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 4, 'El sabor de la alimentación suministrada en la Clínica es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 5, 'De acuerdo con su estado de salud considera que la alimentación es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 6, 'Considera que el servicio en general de alimentación recibido en la Clínica es:', 'escala_1_5'),
  ((select id from encuestas where codigo = 'alimentacion'), 7, '¿Recomendaría el servicio de alimentación que se maneja en la Clínica Santa Bárbara?', 'si_no'),
  ((select id from encuestas where codigo = 'alimentacion'), 8, 'Sugerencia', 'texto_libre');

-- BRILLASEO (8 escala 4 niveles + observaciones)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'brillaseo'), 1, '¿Cómo calificaría la atención y amabilidad del personal de Brillaseo y supervisor?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 2, '¿Cómo calificaría el cumplimiento del personal con los protocolos y procedimientos establecidos, como limpieza y desinfección, bioseguridad, manejo de residuos, entre otros?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 3, '¿Cómo calificaría las condiciones de limpieza y desinfección permanentes en los cubículos, habitaciones, áreas comunes y superficies del servicio?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 4, '¿Cómo calificaría la dotación permanente de elementos esenciales como toallas de papel, papel higiénico, jabón, bolsas, gel antibacterial, entre otros?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 5, '¿Cómo calificaría la presentación personal y el uso de los elementos de protección de los funcionarios de Brillaseo?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 6, '¿Cómo calificaría el tiempo de respuesta del personal de aseo en relación con la necesidad o urgencia de la situación?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 7, '¿Cómo calificaría la resolución de las novedades y no conformidades referentes al proceso de limpieza y desinfección de Brillaseo?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 8, '¿Cómo calificaría su nivel de satisfacción con el servicio?', 'escala_4'),
  ((select id from encuestas where codigo = 'brillaseo'), 9, 'Observaciones', 'texto_libre');

-- GE2 (7 escala 4 niveles + observaciones)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'ge2'), 1, '¿Cómo calificaría la atención y amabilidad del personal de GE2?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 2, '¿Cómo calificaría el soporte básico en cuanto a hardware y software?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 3, '¿Cómo considera que es el soporte en cuanto al sistema de información Gomedisys?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 4, '¿Cómo considera que es el soporte en cuanto a internet e infraestructura de redes?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 5, '¿Cómo calificaría el tiempo de respuesta ante las solicitudes realizadas en relación con las necesidades que se tienen?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 6, '¿Cómo calificaría la resolución de las novedades y no conformidades entregadas a GE2?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 7, '¿Cómo calificaría su nivel de satisfacción con el servicio?', 'escala_4'),
  ((select id from encuestas where codigo = 'ge2'), 8, 'Observaciones', 'texto_libre');

-- NAPOLES (7 escala 4 niveles + observaciones)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'napoles'), 1, '¿Cómo califica la atención y amabilidad del personal de Nápoles?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 2, '¿Cómo califica el cumplimiento del personal de Vigilancia de la Clínica con los protocolos y lineamientos de seguridad para la protección de las personas y los bienes?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 3, '¿Cómo califica su percepción de seguridad dentro de la Clínica?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 4, '¿Cómo califica la atención del personal de seguridad ante alguna situación de riesgo que haya involucrado a usted, a un colaborador o a un paciente?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 5, '¿Cómo califica el tiempo de respuesta del personal de vigilancia en relación con la urgencia o la necesidad de la situación?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 6, '¿Cómo califica la resolución oportuna de las novedades y no conformidades reportadas al personal de seguridad?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 7, '¿Cómo califica su nivel de satisfacción con el servicio de vigilancia?', 'escala_4'),
  ((select id from encuestas where codigo = 'napoles'), 8, 'Observaciones', 'texto_libre');

-- SAN RAFAEL (8 escala 4 niveles + observaciones)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'san_rafael'), 1, '¿Cómo califica la atención y amabilidad del personal de la Fundación San Rafael?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 2, '¿Cómo califica las condiciones en las que llegan los alimentos en cuanto a presentación, temperatura, consistencia y cantidad?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 3, '¿Cómo califica el cumplimiento de las dietas según las solicitudes y requerimientos de cada paciente?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 4, '¿Cómo califica la entrega de la alimentación con respecto al cumplimiento de los horarios establecidos?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 5, '¿Cómo califica la frecuencia de quejas recibidas sobre el servicio de alimentación por parte de pacientes y/o acompañantes?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 6, '¿Cómo considera que es la presentación personal y uso de sus elementos de protección de los funcionarios de San Rafael?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 7, '¿Cómo califica la oportunidad en la resolución de novedades y no conformes relacionadas con el proceso de alimentación?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 8, '¿Cómo califica su nivel de satisfacción con el servicio de alimentación?', 'escala_4'),
  ((select id from encuestas where codigo = 'san_rafael'), 9, 'Observaciones', 'texto_libre');

-- ELIS (4 escala 4 niveles + observaciones)
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'elis'), 1, '¿Cómo calificaría la entrega de la cantidad de prendas solicitadas por su servicio?', 'escala_4'),
  ((select id from encuestas where codigo = 'elis'), 2, '¿Cómo calificaría la resolución oportuna de las novedades y no conformidades referentes al proceso de lavandería?', 'escala_4'),
  ((select id from encuestas where codigo = 'elis'), 3, '¿Cómo calificaría su nivel de satisfacción con el servicio de lavandería?', 'escala_4'),
  ((select id from encuestas where codigo = 'elis'), 4, '¿Cómo calificaría las condiciones de presentación de la ropa en cuanto a higiene (libre de manchas, residuos biológicos o malos olores) y de integridad física (sin roturas, deshilachados o desgaste excesivo)?', 'escala_4'),
  ((select id from encuestas where codigo = 'elis'), 5, 'Observaciones', 'texto_libre');

-- EMERLILI (5 escala 4 niveles + observaciones). El formulario original evaluaba 2
-- turnos/vehículos por envío -- eso se resuelve creando 2 filas de "respuestas"
-- independientes (una por evaluación) durante la migración, no duplicando preguntas.
insert into preguntas (encuesta_id, orden, texto, tipo_respuesta) values
  ((select id from encuestas where codigo = 'emerlili'), 1, '¿El proveedor garantiza la disponibilidad de vehículos según lo pactado en el contrato (24/7 o turnos específicos)?', 'escala_4'),
  ((select id from encuestas where codigo = 'emerlili'), 2, '¿El trato del personal fue respetuoso, amable y profesional durante la atención?', 'escala_4'),
  ((select id from encuestas where codigo = 'emerlili'), 3, '¿Las ambulancias se encuentran en óptimas condiciones mecánicas, de limpieza y presentación externa?', 'escala_4'),
  ((select id from encuestas where codigo = 'emerlili'), 4, '¿Cómo califica la resolución oportuna de las novedades y no conformidades reportadas al personal de ambulancias?', 'escala_4'),
  ((select id from encuestas where codigo = 'emerlili'), 5, '¿Cómo califica su nivel de satisfacción con el servicio de ambulancias?', 'escala_4'),
  ((select id from encuestas where codigo = 'emerlili'), 6, 'Observaciones', 'texto_libre');

-- Administrador inicial (el mismo de los demás proyectos CAC Santa Bárbara).
-- El usuario en auth.users se crea con la Edge Function admin-usuarios o desde
-- el Dashboard; aquí solo se deja el perfil listo para cuando exista el uid.
-- (ver instrucciones en docs/ tras el primer signup)
