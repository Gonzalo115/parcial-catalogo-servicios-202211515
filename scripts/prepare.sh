#!/bin/sh
set -eu
# Ejecutar desde la raíz del proyecto. Cada paso debe terminar en 0.
docker compose config --quiet
docker compose up --build -d
docker compose up -d --wait --wait-timeout 180
docker compose exec -T nestjs-backend npm run seed:demo
docker compose exec -T nestjs-backend npm run import:excel
docker compose exec -T nestjs-backend npm run seed:asignaciones
docker compose exec -T nestjs-backend npm run seed:desk
