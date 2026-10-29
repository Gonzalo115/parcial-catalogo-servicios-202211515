#!/bin/sh
set -eu
docker compose --profile pruebas run --build --rm --no-deps verificaciones
docker compose exec -T nestjs-backend npm run test:harness
sh scripts/check-persistence-desk.sh
