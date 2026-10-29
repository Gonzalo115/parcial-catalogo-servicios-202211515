CREATE TABLE catalogo.usuario_rol (
 usuario_id bigint NOT NULL REFERENCES catalogo.usuario(id),
 rol text NOT NULL CHECK(rol IN ('solicitante','agente','aprobador')),
 PRIMARY KEY(usuario_id,rol)
);
CREATE TABLE catalogo.proceso (codigo text PRIMARY KEY,nombre text NOT NULL,tipo text NOT NULL);
INSERT INTO catalogo.proceso VALUES
 ('nuevos','Nuevos servicios','requisicion_servicio'),('cambios','Cambios','solicitud_cambio'),
 ('incidentes','Incidentes','incidente'),('eventos','Eventos','evento'),('problemas','Problemas','problema'),
 ('accesos','Accesos','solicitud_acceso'),('servicios','Servicios de tecnología','requisicion_servicio');
CREATE TABLE catalogo.cola (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo text NOT NULL UNIQUE,nombre text NOT NULL,
 descripcion text NOT NULL DEFAULT '',activo boolean NOT NULL DEFAULT true,
 proceso text NOT NULL REFERENCES catalogo.proceso(codigo),nivel integer NOT NULL DEFAULT 1 CHECK(nivel BETWEEN 0 AND 4),
 orden text NOT NULL DEFAULT 'prioridad_antiguedad' CHECK(orden IN ('prioridad_antiguedad','antiguedad')),
 primera_min integer NOT NULL DEFAULT 60 CHECK(primera_min>0),resolucion_min integer NOT NULL DEFAULT 1440 CHECK(resolucion_min>0),
 responsable_id bigint NOT NULL REFERENCES catalogo.usuario(id)
);
CREATE TABLE catalogo.cola_permiso (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,cola_id bigint NOT NULL REFERENCES catalogo.cola(id),
 usuario_id bigint REFERENCES catalogo.usuario(id),rol text CHECK(rol IN ('agente','aprobador','solicitante','consulta')),
 permisos text[] NOT NULL CHECK(permisos <@ ARRAY['consultar','atender','transferir','aprobar','administrar']::text[]),
 CHECK((usuario_id IS NULL)<>(rol IS NULL))
);
CREATE TABLE catalogo.ubicacion (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,nombre text NOT NULL UNIQUE,activo boolean NOT NULL DEFAULT true);
CREATE TABLE catalogo.ci_clase (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo text NOT NULL UNIQUE,nombre text NOT NULL,
 padre_id bigint REFERENCES catalogo.ci_clase(id),activo boolean NOT NULL DEFAULT true,
 origen text NOT NULL DEFAULT 'proyecto',CHECK(padre_id IS NULL OR padre_id<>id)
);
CREATE FUNCTION catalogo.clase_sin_ciclos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.padre_id IS NOT NULL AND EXISTS(WITH RECURSIVE p AS (
 SELECT id,padre_id FROM catalogo.ci_clase WHERE id=NEW.padre_id
 UNION SELECT c.id,c.padre_id FROM catalogo.ci_clase c JOIN p ON c.id=p.padre_id)
 SELECT 1 FROM p WHERE id=NEW.id) THEN RAISE EXCEPTION 'Ciclo de clasificación' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER clase_ciclo BEFORE INSERT OR UPDATE ON catalogo.ci_clase FOR EACH ROW EXECUTE FUNCTION catalogo.clase_sin_ciclos();
CREATE TABLE catalogo.ci (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,codigo text NOT NULL UNIQUE,nombre text NOT NULL,
 clase_id bigint NOT NULL REFERENCES catalogo.ci_clase(id),activo boolean NOT NULL DEFAULT true,
 estado text NOT NULL DEFAULT 'Activo',ubicacion_id bigint NOT NULL REFERENCES catalogo.ubicacion(id),
 responsable_id bigint NOT NULL REFERENCES catalogo.usuario(id),es_dispositivo boolean NOT NULL DEFAULT true,
 atributos jsonb NOT NULL DEFAULT '{}',fuente jsonb,conjunto text,
 actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ci_clase_idx ON catalogo.ci(clase_id);
CREATE INDEX ci_nombre_idx ON catalogo.ci(lower(nombre));
CREATE TABLE catalogo.ci_relacion (
 origen_id bigint NOT NULL REFERENCES catalogo.ci(id),destino_id bigint NOT NULL REFERENCES catalogo.ci(id),
 tipo text NOT NULL CHECK(tipo IN ('depende_de','alojado_en','conectado_a')),
 PRIMARY KEY(origen_id,destino_id,tipo),CHECK(origen_id<>destino_id)
);
CREATE TABLE catalogo.ci_servicio (
 ci_id bigint NOT NULL REFERENCES catalogo.ci(id),servicio_id bigint NOT NULL REFERENCES catalogo.servicio_nivel2(id),PRIMARY KEY(ci_id,servicio_id)
);
CREATE TABLE catalogo.ticket (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,titulo text NOT NULL CHECK(btrim(titulo)<>''),descripcion text NOT NULL,
 solicitante_id bigint NOT NULL REFERENCES catalogo.usuario(id),creador_id bigint NOT NULL REFERENCES catalogo.usuario(id),
 servicio_id bigint NOT NULL REFERENCES catalogo.servicio_nivel2(id),cola_id bigint NOT NULL REFERENCES catalogo.cola(id),
 responsable_id bigint REFERENCES catalogo.usuario(id),estado text NOT NULL DEFAULT 'registrado',
 prioridad integer NOT NULL DEFAULT 2 CHECK(prioridad BETWEEN 1 AND 3),impacto text NOT NULL CHECK(impacto IN ('bajo','medio','alto')),
 urgencia text NOT NULL CHECK(urgencia IN ('baja','media','alta')),canal text NOT NULL CHECK(canal IN ('web','telefono','correo','monitoreo')),
 sin_ci_motivo text,detalle jsonb NOT NULL DEFAULT '{}',resolucion text,
 creado_en timestamptz NOT NULL DEFAULT now(),actualizado_en timestamptz NOT NULL DEFAULT now(),
 primera_atencion timestamptz,resuelto_en timestamptz,cerrado_en timestamptz,
 pausa_desde timestamptz,pausa_segundos numeric NOT NULL DEFAULT 0,estado_anterior text,
 origen_evento_id bigint UNIQUE REFERENCES catalogo.ticket(id),clave_externa text UNIQUE,demo_clave text UNIQUE
);
CREATE INDEX ticket_cola_estado_idx ON catalogo.ticket(cola_id,estado,prioridad,creado_en);
CREATE INDEX ticket_solicitante_idx ON catalogo.ticket(solicitante_id);
CREATE TABLE catalogo.ticket_ci (ticket_id bigint REFERENCES catalogo.ticket(id),ci_id bigint REFERENCES catalogo.ci(id),PRIMARY KEY(ticket_id,ci_id));
CREATE TABLE catalogo.ticket_relacion (
 origen_id bigint REFERENCES catalogo.ticket(id),destino_id bigint REFERENCES catalogo.ticket(id),tipo text NOT NULL,
 PRIMARY KEY(origen_id,destino_id,tipo),CHECK(origen_id<>destino_id)
);
CREATE TABLE catalogo.bitacora (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,entidad text NOT NULL,registro_id text NOT NULL,
 actor_id bigint NOT NULL REFERENCES catalogo.usuario(id),accion text NOT NULL,fecha timestamptz NOT NULL DEFAULT now(),
 anterior jsonb,nuevo jsonb,motivo text
);
CREATE FUNCTION catalogo.historial_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Historial inmutable' USING ERRCODE='23514'; END $$;
CREATE TRIGGER bitacora_inmutable BEFORE UPDATE OR DELETE ON catalogo.bitacora FOR EACH ROW EXECUTE FUNCTION catalogo.historial_inmutable();
CREATE TABLE catalogo.comentario (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,ticket_id bigint NOT NULL REFERENCES catalogo.ticket(id),
 actor_id bigint NOT NULL REFERENCES catalogo.usuario(id),texto text NOT NULL,interno boolean NOT NULL DEFAULT false,fecha timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalogo.adjunto (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,ticket_id bigint NOT NULL REFERENCES catalogo.ticket(id),
 actor_id bigint NOT NULL REFERENCES catalogo.usuario(id),nombre text NOT NULL,mime text NOT NULL,
 contenido bytea NOT NULL CHECK(octet_length(contenido)<=2097152),interno boolean NOT NULL DEFAULT false,fecha timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalogo.notificacion (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,ticket_id bigint NOT NULL REFERENCES catalogo.ticket(id),
 mensaje text NOT NULL,fecha timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE catalogo.faq (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,titulo text NOT NULL,contenido text NOT NULL,activo boolean NOT NULL DEFAULT true
);
CREATE FUNCTION catalogo.proteger_baja_sd() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.activo AND NOT NEW.activo THEN
  IF TG_TABLE_NAME='usuario' AND (EXISTS(SELECT 1 FROM catalogo.ticket WHERE responsable_id=OLD.id AND estado NOT IN ('cerrado','rechazado')) OR EXISTS(SELECT 1 FROM catalogo.cola WHERE responsable_id=OLD.id AND activo) OR EXISTS(SELECT 1 FROM catalogo.ci WHERE responsable_id=OLD.id AND activo)) THEN
   RAISE EXCEPTION 'Reasigne tickets, colas y CI antes de desactivar usuario' USING ERRCODE='23514';
  ELSIF TG_TABLE_NAME='cola' AND EXISTS(SELECT 1 FROM catalogo.ticket WHERE cola_id=OLD.id AND estado NOT IN ('cerrado','rechazado')) THEN
   RAISE EXCEPTION 'Transfiera tickets abiertos antes de desactivar cola' USING ERRCODE='23514';
  ELSIF TG_TABLE_NAME='ci_clase' AND (EXISTS(SELECT 1 FROM catalogo.ci_clase WHERE padre_id=OLD.id AND activo) OR EXISTS(SELECT 1 FROM catalogo.ci WHERE clase_id=OLD.id AND activo)) THEN
   RAISE EXCEPTION 'Clasificación con dependencias activas' USING ERRCODE='23514';
  END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER usuario_baja_sd BEFORE UPDATE ON catalogo.usuario FOR EACH ROW EXECUTE FUNCTION catalogo.proteger_baja_sd();
CREATE TRIGGER cola_baja_sd BEFORE UPDATE ON catalogo.cola FOR EACH ROW EXECUTE FUNCTION catalogo.proteger_baja_sd();
CREATE TRIGGER clase_baja_sd BEFORE UPDATE ON catalogo.ci_clase FOR EACH ROW EXECUTE FUNCTION catalogo.proteger_baja_sd();
