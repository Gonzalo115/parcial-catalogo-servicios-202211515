CREATE SCHEMA IF NOT EXISTS catalogo;
CREATE TABLE IF NOT EXISTS catalogo.schema_migration (
  version TEXT PRIMARY KEY, aplicado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE catalogo.empresa (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo VARCHAR(50) NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL
);
CREATE TABLE catalogo.area (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  empresa_id BIGINT NOT NULL REFERENCES catalogo.empresa(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL,
  UNIQUE(empresa_id, codigo)
);
CREATE TABLE catalogo.departamento (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_id BIGINT NOT NULL REFERENCES catalogo.area(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL,
  UNIQUE(area_id, codigo)
);
CREATE TABLE catalogo.seccion (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  departamento_id BIGINT NOT NULL REFERENCES catalogo.departamento(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL,
  UNIQUE(departamento_id, codigo)
);
CREATE TABLE catalogo.puesto (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seccion_id BIGINT NOT NULL REFERENCES catalogo.seccion(id) ON DELETE RESTRICT,
  codigo VARCHAR(50) NOT NULL CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL,
  UNIQUE(seccion_id, codigo)
);
CREATE TABLE catalogo.usuario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  puesto_id BIGINT NOT NULL REFERENCES catalogo.puesto(id) ON DELETE RESTRICT,
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  nombre_usuario VARCHAR(100) NOT NULL CHECK (nombre_usuario ~ '^[a-z0-9_.-]+$'),
  correo TEXT CHECK (correo IS NULL OR (correo = lower(btrim(correo)) AND position('@' in correo) > 1)),
  password_hash TEXT NOT NULL CHECK (password_hash ~ '^\$2[aby]\$[0-9]{2}\$'),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('administrador', 'consulta')),
  activo BOOLEAN NOT NULL
);
CREATE UNIQUE INDEX usuario_login_unique ON catalogo.usuario(lower(nombre_usuario));
CREATE UNIQUE INDEX usuario_correo_unique ON catalogo.usuario(lower(correo)) WHERE correo IS NOT NULL;
CREATE TABLE catalogo.sesion (
  id UUID PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES catalogo.usuario(id) ON DELETE RESTRICT,
  creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  expira_en TIMESTAMPTZ NOT NULL,
  revocada_en TIMESTAMPTZ,
  CHECK (expira_en > creada_en)
);
CREATE INDEX sesion_usuario_idx ON catalogo.sesion(usuario_id);
CREATE TABLE catalogo.servicio_nivel1 (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  activo BOOLEAN, requiere_revision BOOLEAN NOT NULL
);
CREATE TABLE catalogo.clase_servicio (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL
);
CREATE TABLE catalogo.criticidad (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL
);
CREATE TABLE catalogo.tipo_servicio (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE CHECK (btrim(nombre) <> ''), activo BOOLEAN NOT NULL
);
CREATE TABLE catalogo.servicio_nivel2 (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nivel1_id BIGINT NOT NULL REFERENCES catalogo.servicio_nivel1(id) ON DELETE RESTRICT,
  codigo VARCHAR(20) NOT NULL UNIQUE CHECK (btrim(codigo) <> ''),
  nombre TEXT NOT NULL CHECK (btrim(nombre) <> ''),
  activo BOOLEAN,
  clase_id BIGINT REFERENCES catalogo.clase_servicio(id) ON DELETE RESTRICT,
  criticidad_id BIGINT REFERENCES catalogo.criticidad(id) ON DELETE RESTRICT,
  tipo_id BIGINT REFERENCES catalogo.tipo_servicio(id) ON DELETE RESTRICT,
  descripcion TEXT, metrica TEXT, minimo NUMERIC, maximo NUMERIC,
  requiere_revision BOOLEAN NOT NULL,
  CONSTRAINT umbrales_validos CHECK (minimo IS NULL OR maximo IS NULL OR minimo <= maximo)
);
CREATE INDEX servicio_nivel2_nivel1_idx ON catalogo.servicio_nivel2(nivel1_id);
CREATE TABLE catalogo.servicio_responsable (
  servicio_nivel2_id BIGINT PRIMARY KEY REFERENCES catalogo.servicio_nivel2(id) ON DELETE RESTRICT,
  seccion_id BIGINT NOT NULL REFERENCES catalogo.seccion(id) ON DELETE RESTRICT,
  usuario_id BIGINT REFERENCES catalogo.usuario(id) ON DELETE RESTRICT
);
CREATE TABLE catalogo.importacion (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  archivo_nombre TEXT NOT NULL, archivo_sha256 CHAR(64) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT now(), version_reglas VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL, resumen JSONB NOT NULL
);
CREATE TABLE catalogo.importacion_detalle (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  importacion_id BIGINT NOT NULL REFERENCES catalogo.importacion(id) ON DELETE RESTRICT,
  hoja TEXT NOT NULL, fila INTEGER NOT NULL CHECK (fila > 0),
  nivel1_id BIGINT REFERENCES catalogo.servicio_nivel1(id) ON DELETE RESTRICT,
  nivel2_id BIGINT REFERENCES catalogo.servicio_nivel2(id) ON DELETE RESTRICT,
  datos_originales JSONB NOT NULL, datos_resueltos JSONB NOT NULL,
  origen_celdas JSONB NOT NULL, resultado VARCHAR(20) NOT NULL, observaciones JSONB NOT NULL
);

-- Asociaciones nuevas o reactivaciones: el padre debe estar activo.
CREATE FUNCTION catalogo.validar_padre_activo() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE padre BIGINT; habilitado BOOLEAN;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW)->>TG_ARGV[1]) IS NOT DISTINCT FROM (to_jsonb(OLD)->>TG_ARGV[1])
       AND NOT (NEW.activo AND NOT OLD.activo) THEN RETURN NEW; END IF;
  END IF;
  padre := (to_jsonb(NEW)->>TG_ARGV[1])::BIGINT;
  EXECUTE format('SELECT activo FROM catalogo.%I WHERE id=$1 FOR SHARE', TG_ARGV[0])
    INTO habilitado USING padre;
  IF habilitado IS FALSE THEN
    RAISE EXCEPTION 'No se permite asociar un registro con un padre inactivo' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER area_padre BEFORE INSERT OR UPDATE ON catalogo.area FOR EACH ROW EXECUTE FUNCTION catalogo.validar_padre_activo('empresa','empresa_id');
CREATE TRIGGER departamento_padre BEFORE INSERT OR UPDATE ON catalogo.departamento FOR EACH ROW EXECUTE FUNCTION catalogo.validar_padre_activo('area','area_id');
CREATE TRIGGER seccion_padre BEFORE INSERT OR UPDATE ON catalogo.seccion FOR EACH ROW EXECUTE FUNCTION catalogo.validar_padre_activo('departamento','departamento_id');
CREATE TRIGGER puesto_padre BEFORE INSERT OR UPDATE ON catalogo.puesto FOR EACH ROW EXECUTE FUNCTION catalogo.validar_padre_activo('seccion','seccion_id');
CREATE TRIGGER usuario_padre BEFORE INSERT OR UPDATE ON catalogo.usuario FOR EACH ROW EXECUTE FUNCTION catalogo.validar_padre_activo('puesto','puesto_id');

CREATE FUNCTION catalogo.validar_responsable() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE seccion_usuario BIGINT; usuario_activo BOOLEAN; seccion_activa BOOLEAN;
BEGIN
  SELECT activo INTO seccion_activa FROM catalogo.seccion WHERE id=NEW.seccion_id FOR SHARE;
  IF seccion_activa IS FALSE THEN
    RAISE EXCEPTION 'La sección responsable está inactiva' USING ERRCODE='23514';
  END IF;
  IF NEW.usuario_id IS NOT NULL THEN
    SELECT p.seccion_id,u.activo INTO seccion_usuario,usuario_activo
      FROM catalogo.usuario u JOIN catalogo.puesto p ON p.id=u.puesto_id
      WHERE u.id=NEW.usuario_id FOR SHARE OF u,p;
    IF seccion_usuario IS DISTINCT FROM NEW.seccion_id OR usuario_activo IS NOT TRUE THEN
      RAISE EXCEPTION 'El usuario debe estar activo y pertenecer a la sección responsable' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER responsable_valido BEFORE INSERT OR UPDATE ON catalogo.servicio_responsable
  FOR EACH ROW EXECUTE FUNCTION catalogo.validar_responsable();

CREATE FUNCTION catalogo.validar_traslado_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE nueva_seccion BIGINT;
BEGIN
  IF NEW.puesto_id IS DISTINCT FROM OLD.puesto_id THEN
    SELECT seccion_id INTO nueva_seccion FROM catalogo.puesto WHERE id=NEW.puesto_id FOR SHARE;
    IF EXISTS(SELECT 1 FROM catalogo.servicio_responsable WHERE usuario_id=OLD.id AND seccion_id<>nueva_seccion) THEN
      RAISE EXCEPTION 'Resolver asignaciones antes de trasladar al usuario' USING ERRCODE='23514';
    END IF;
  END IF;
  IF OLD.activo AND NOT NEW.activo AND EXISTS(SELECT 1 FROM catalogo.servicio_responsable WHERE usuario_id=OLD.id) THEN
    RAISE EXCEPTION 'Resolver asignaciones antes de desactivar al usuario' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER usuario_traslado BEFORE UPDATE ON catalogo.usuario FOR EACH ROW EXECUTE FUNCTION catalogo.validar_traslado_usuario();

CREATE FUNCTION catalogo.validar_baja_unidad() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dependencias BOOLEAN;
BEGIN
  IF OLD.activo AND NOT NEW.activo THEN
    EXECUTE format('SELECT EXISTS(SELECT 1 FROM catalogo.%I WHERE %I=$1 AND activo)',TG_ARGV[0],TG_ARGV[1])
      INTO dependencias USING OLD.id;
    IF dependencias THEN RAISE EXCEPTION 'Resolver descendientes activos antes de desactivar' USING ERRCODE='23514'; END IF;
    IF TG_TABLE_NAME='seccion' AND EXISTS(SELECT 1 FROM catalogo.servicio_responsable WHERE seccion_id=OLD.id) THEN
      RAISE EXCEPTION 'Resolver asignaciones antes de desactivar la sección' USING ERRCODE='23514';
    END IF;
  END IF;
  IF TG_TABLE_NAME='puesto' THEN
    IF NEW.seccion_id IS DISTINCT FROM OLD.seccion_id AND EXISTS(
      SELECT 1 FROM catalogo.servicio_responsable r JOIN catalogo.usuario u ON u.id=r.usuario_id
      WHERE u.puesto_id=OLD.id AND r.seccion_id<>NEW.seccion_id
    ) THEN RAISE EXCEPTION 'Resolver asignaciones antes de trasladar el puesto' USING ERRCODE='23514'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER empresa_baja BEFORE UPDATE ON catalogo.empresa FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_unidad('area','empresa_id');
CREATE TRIGGER area_baja BEFORE UPDATE ON catalogo.area FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_unidad('departamento','area_id');
CREATE TRIGGER departamento_baja BEFORE UPDATE ON catalogo.departamento FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_unidad('seccion','departamento_id');
CREATE TRIGGER seccion_baja BEFORE UPDATE ON catalogo.seccion FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_unidad('puesto','seccion_id');
CREATE TRIGGER puesto_baja BEFORE UPDATE ON catalogo.puesto FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_unidad('usuario','puesto_id');

-- Disponibilidad administrativa de opciones: decisión explícita, no estado de servicios.
INSERT INTO catalogo.clase_servicio(nombre,activo) VALUES ('A DEMANDA',true),('RECURRENTE',true);
INSERT INTO catalogo.criticidad(nombre,activo) VALUES ('Very Low',true),('Low',true),('Normal',true),('High',true),('Very High',true);
INSERT INTO catalogo.tipo_servicio(nombre,activo) VALUES
 ('Back End',true),('Demostration',true),('End User Service',true),('Front End',true),
 ('IT Management',true),('IT Operational',true),('Other',true),('Project',true),
 ('Reporting',true),('Training',true),('Underpinning Contract',true);
INSERT INTO catalogo.schema_migration(version) VALUES ('001');
