# Parcial 3 — Service Desk y CMDB

Coloque esta carpeta `doc_p3` en la raíz del repositorio. Consolida la documentación del apartado 12 y duplica las evidencias citadas dentro de `docs/evidencias`; no reemplaza el código de la aplicación ni contiene un `.env` de trabajo. Corte del código: `6fdfabf2995d7ebb9697fc2f1da9d33bfc45bcbb`, 29/10/2026, Guatemala.

| Entregable | Ubicación en esta carpeta |
|---|---|
| Ejecución y cuentas | Este README |
| Alcance, arquitectura, decisiones y limitaciones | [docs/RESOLUCION.md](docs/RESOLUCION.md) |
| ER, diccionario, CMDB y fuentes | [docs/MODELO.md](docs/MODELO.md) |
| Tipos, colas, permisos y procesos | [docs/PROCESOS.md](docs/PROCESOS.md) |
| Prompts, contexto, harness, ciclos y grafos | [docs/IA.md](docs/IA.md) |
| Matriz y resultados reales | [docs/PRUEBAS.md](docs/PRUEBAS.md) |
| Índice de evidencia y procedencia | [docs/evidencias/INDICE.md](docs/evidencias/INDICE.md) |
| Materiales originales y hashes | [fuentes/SHA256.txt](fuentes/SHA256.txt) |

## Archivos de aplicación que deben acompañar la entrega

Las rutas siguientes se miden desde la raíz del repositorio, junto a `doc_p3`:

| Entregable | Ruta |
|---|---|
| Fuente backend / frontend | `backend/src/`, `frontend/src/` |
| Migraciones | `db/migrations/001_initial.sql`, `002_backend.sql`, `003_service_desk.sql` |
| Docker y configuración | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `.dockerignore`, `.env.example` |
| Fuentes originales | `data/`; copias documentales en `doc_p3/fuentes/` |
| Importador | `backend/src/importer/` y CLI `backend/src/scripts/import-excel.ts` |
| Generador y datos demo | `backend/src/desk/seed.ts`, `backend/src/scripts/seed-desk.ts` |
| Pruebas | `backend/tests/`, `frontend/tests/` |
| Automatización | `scripts/configure.mjs`, `prepare.ps1/sh`, `verify.sh`, `check-persistence-desk.ps1/sh` |

La carpeta documental no se ejecuta directamente. Las copias de código en evidencias permiten inspeccionar decisiones; el bundle incluido permite recuperar el repositorio completo del corte y ejecutar sus archivos.

## Desde un clon limpio

Se requiere Git para clonar y Docker Engine/Desktop con Compose compatible con `--wait`. No se necesita instalar Node, npm ni PostgreSQL en el anfitrión. Clone la URL real de su repositorio y entre al directorio que contiene `docker-compose.yml`; no se incluye una URL remota inventada. El commit debe incluir los tres parches aplicados: ampliación, portal y sesión/secciones.

Si aún no dispone del repositorio completo, el bundle incluido permite crear un clon limpio del código documentado. Desde el directorio que contiene `doc_p3`, en PowerShell:

```powershell
git clone .\doc_p3\docs\evidencias\historial.bundle .\p3-limpio
Set-Location .\p3-limpio
```

En Linux/macOS:

```bash
git clone ./doc_p3/docs/evidencias/historial.bundle ./p3-limpio
cd ./p3-limpio
```

Alternativamente clone su remoto real, sin sustituir la versión validada por una rama distinta. A partir de aquí todos los comandos se ejecutan desde la raíz del clon.

PowerShell:

```powershell
docker version
docker compose version
docker run --rm --mount "type=bind,source=$((Get-Location).Path),target=/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
powershell -ExecutionPolicy Bypass -File scripts/prepare.ps1
```

Linux/macOS, desde esa raíz:

```bash
docker version
docker compose version
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
sh scripts/prepare.sh
```

El configurador crea `.env` desde `.env.example` con secretos locales aleatorios. Si `.env` ya existe, lo conserva y termina con error; revise las variables faltantes y ejecute únicamente la preparación. No cambie la contraseña de PostgreSQL en un volumen existente esperando que eso actualice la cuenta.

`prepare` valida Compose, construye, espera la salud de los servicios, ejecuta `seed:demo`, `import:excel`, `seed:asignaciones` y `seed:desk`, y se detiene ante un error. Las migraciones se ejecutan al iniciar el backend. También pueden ejecutarse explícitamente:

```powershell
docker compose exec -T nestjs-backend npm run migrate
```

Web: **http://localhost:8080**. API: **http://localhost:3100/api**. Salud: **http://localhost:3100/api/health**. Los puertos provienen de `.env.example`; si se cambian localmente, use esos valores.

## Cuentas locales de demostración

| Usuario | Correo | Contraseña predeterminada | Uso |
|---|---|---|---|
| admin | admin@demo.local | SA_admin_2026 | Configuración y supervisión |
| consulta | consulta@demo.local | SA_consulta_2026 | Lectura funcional |
| solicitante | solicitante@demo.local | SA_desk_2026_demo | Solicitudes propias, incluidas las DEMO |
| solicitante2 | solicitante2@demo.local | SA_desk_2026_demo | Probar separación de identidades; sin tickets iniciales |
| agente1 | agente1@demo.local | SA_desk_2026_demo | Atención en colas autorizadas |
| agente2 | agente2@demo.local | SA_desk_2026_demo | Segundo agente, concurrencia y transferencias |
| aprobador | aprobador@demo.local | SA_desk_2026_demo | Aprobar/rechazar en colas autorizadas |

Son credenciales de demostración. Las tres variables `DEMO_ADMIN_PASSWORD`, `DEMO_CONSULTA_PASSWORD` y `DEMO_DESK_PASSWORD` permiten configurarlas antes de crear las cuentas. Repetir el seed conserva las contraseñas existentes; cambiar `.env` no las restablece. El nombre agente2 no significa automáticamente «nivel de soporte 2»; los permisos dependen de las colas.

La sesión se conserva al recargar la misma pestaña, se valida con `/auth/me` y vence 15 minutos después del login. Recargar no renueva ese plazo. Cerrar sesión revoca la sesión en la base de datos.

## Carga repetible

```powershell
docker compose exec -T nestjs-backend npm run import:excel
docker compose exec -T nestjs-backend npm run seed:asignaciones
docker compose exec -T nestjs-backend npm run seed:desk
docker compose exec -T nestjs-backend npm run generate:cmdb
```

El catálogo original debe producir 12 códigos N1 y 46 N2. El seed prepara ocho colas, 37 tickets principales DEMO y los incidentes derivados de eventos E2/E3. El total de tickets puede superar 37. El generador utiliza `CMDB_SEED=202211515` y `CMDB_COUNT=5000`: produce 5000 dispositivos sintéticos, además de los dos CI originales. Una semilla diferente agrega otro conjunto; la misma no duplica ni sobrescribe las correcciones.

Ejemplo de otra semilla, que agrega datos:

```powershell
docker compose exec -T -e CMDB_SEED=evaluacion-p3 -e CMDB_COUNT=5000 nestjs-backend npm run generate:cmdb
```

## Pruebas, logs y apagado

```powershell
docker compose --profile pruebas run --build --rm --no-deps verificaciones
docker compose exec -T nestjs-backend npm run test:harness
powershell -ExecutionPolicy Bypass -File scripts/check-persistence-desk.ps1
docker compose ps
docker compose logs --tail=100 nestjs-backend react-frontend postgres
docker compose down
docker compose up -d --wait --wait-timeout 180
```

En Linux, P18 se ejecuta con `sh scripts/check-persistence-desk.sh`. No utilice la aplicación durante su comparación. `down` sin `-v` conserva el volumen; no eliminarlo como parte del arranque o de una corrección.

Las pruebas frontend se ejecutan durante su build. Para repetirlas aisladamente desde PowerShell, sin Node en el anfitrión:

```powershell
docker run --rm --mount "type=bind,source=$((Get-Location).Path),target=/work,readonly" node:22.22.0-alpine sh -c "cp -R /work/frontend /tmp/frontend && cd /tmp/frontend && npm ci && npm test && npm run build"
```

La verificación aislada backend utiliza PGlite; el harness live y P18 requieren Compose real. Resultados comprobados y pendientes en [PRUEBAS.md](docs/PRUEBAS.md).
