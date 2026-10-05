CREATE TABLE catalogo.importacion_snapshot (
 entidad VARCHAR(20) NOT NULL CHECK (entidad IN ('nivel1','nivel2')),
 codigo VARCHAR(20) NOT NULL,
 payload JSONB NOT NULL,
 editado_manualmente BOOLEAN NOT NULL DEFAULT false,
 PRIMARY KEY(entidad,codigo)
);
CREATE FUNCTION catalogo.validar_baja_nivel1() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.activo IS FALSE AND OLD.activo IS DISTINCT FROM FALSE AND EXISTS(
  SELECT 1 FROM catalogo.servicio_nivel2 WHERE nivel1_id=OLD.id AND activo IS TRUE
 ) THEN RAISE EXCEPTION 'Desactivar los servicios hijos activos antes del nivel 1' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER nivel1_baja BEFORE UPDATE ON catalogo.servicio_nivel1 FOR EACH ROW EXECUTE FUNCTION catalogo.validar_baja_nivel1();

-- Alias auditados: una corrección de etiqueta no crea una nueva identidad al importar.
CREATE TABLE catalogo.opcion_mapeo (
 entidad VARCHAR(20) NOT NULL CHECK(entidad IN ('clases','criticidades','tipos')),
 nombre_origen TEXT NOT NULL CHECK(btrim(nombre_origen)<>''),
 clase_id BIGINT REFERENCES catalogo.clase_servicio(id) ON DELETE RESTRICT,
 criticidad_id BIGINT REFERENCES catalogo.criticidad(id) ON DELETE RESTRICT,
 tipo_id BIGINT REFERENCES catalogo.tipo_servicio(id) ON DELETE RESTRICT,
 fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(entidad,nombre_origen),
 CHECK ((entidad='clases' AND clase_id IS NOT NULL AND criticidad_id IS NULL AND tipo_id IS NULL)
 OR (entidad='criticidades' AND criticidad_id IS NOT NULL AND clase_id IS NULL AND tipo_id IS NULL)
 OR (entidad='tipos' AND tipo_id IS NOT NULL AND clase_id IS NULL AND criticidad_id IS NULL))
);
