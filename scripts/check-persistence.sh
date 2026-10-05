#!/bin/sh
set -eu
db_user="${1:-catalogo_app}"
db_name="${2:-catalogo_servicios}"
query="SELECT md5(jsonb_build_object('usuarios',(SELECT jsonb_agg(to_jsonb(u) ORDER BY u.id) FROM catalogo.usuario u),'nivel1',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id) FROM catalogo.servicio_nivel1 n),'nivel2',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id) FROM catalogo.servicio_nivel2 n),'responsables',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.servicio_nivel2_id) FROM catalogo.servicio_responsable r))::text)"
count=$(docker compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SELECT count(*) FROM catalogo.usuario')
if [ "$count" -lt 1 ]; then echo 'Crear cuentas demo antes de comprobar persistencia' >&2; exit 1; fi
services=$(docker compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc 'SELECT count(*) FROM catalogo.servicio_nivel2')
if [ "$services" -lt 46 ]; then echo 'Importar el catálogo antes de comprobar P12' >&2; exit 1; fi
before=$(docker compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc "$query")
docker compose restart postgres nestjs-backend react-frontend
docker compose up -d --wait --wait-timeout 120
after=$(docker compose exec -T postgres psql -U "$db_user" -d "$db_name" -tAc "$query")
if [ "$before" != "$after" ]; then echo 'P12 FALLÓ: datos cambiaron al reiniciar' >&2; exit 1; fi
echo 'P12 OK: usuarios, servicios y responsables conservados tras reiniciar contenedores'
