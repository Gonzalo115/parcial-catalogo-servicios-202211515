#!/bin/sh
set -eu
# No usar la interfaz mientras se compara la huella.
snapshot() { docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At' < scripts/snapshot.sql; }
before=$(snapshot)
docker compose down
docker compose up -d --wait --wait-timeout 180
after=$(snapshot)
[ "$before" = "$after" ] || { echo 'P18 FALLÓ: huellas distintas'; exit 1; }
echo "P18 OK: catálogo, CMDB, tickets e historial conservados ($after)"
