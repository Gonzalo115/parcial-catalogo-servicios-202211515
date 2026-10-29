SELECT md5(string_agg(entidad||':'||huella,E'\n' ORDER BY entidad)) FROM (
SELECT 'catalogo_n1' entidad,md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) huella FROM catalogo.servicio_nivel1 x
UNION ALL SELECT 'catalogo_n2',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.servicio_nivel2 x
UNION ALL SELECT 'ci',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.ci x
UNION ALL SELECT 'clasificacion',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.ci_clase x
UNION ALL SELECT 'tickets',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.ticket x
UNION ALL SELECT 'historial',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.bitacora x
UNION ALL SELECT 'relaciones_ci',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY origen_id,destino_id,tipo)::text,'')) FROM catalogo.ci_relacion x
UNION ALL SELECT 'comentarios',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.comentario x
UNION ALL SELECT 'adjuntos',md5(coalesce(jsonb_agg(to_jsonb(x) ORDER BY id)::text,'')) FROM catalogo.adjunto x
) hashes;
