# Ciclo real de harness — 2026-10-04

## Tarea y cambio
Preparar y verificar entorno/autenticación de Fase 2. Se agregaron migración inicial,
API NestJS, guards globales, sesiones revocables, frontend y pruebas aisladas.

## Primera ejecución y fallo
Comando local: `npm run test:embedded` desde backend, después de compilar.
Resultado real: salida 1, una prueba fallida.
Fallo: `ENOENT: no such file or directory, open 'migrations/001_initial.sql'`.
La imagen Docker copia las migraciones en /app/migrations; la carpeta del repositorio
las conserva en db/migrations. La prueba suponía exclusivamente la primera ubicación.
El fallo fue encontrado durante el trabajo; no se introdujo deliberadamente.

## Corrección y nueva ejecución
La prueba selecciona migrations/001_initial.sql si existe; de lo contrario usa
../db/migrations/001_initial.sql. Así conserva el mismo SQL fuente en ambos entornos.
Tras corregirlo pasó el harness. Posteriormente se actualizaron dependencias de NestJS
y Vite a versiones compatibles sin las incidencias detectadas por npm audit, y se
añadió verificación del seed. La ejecución final volvió a pasar.

Comando local final: `npm run build && npm run test:embedded`.
Resultado: salida 0, 11 pruebas aprobadas, 0 fallidas. Ver resultados-harness.txt.
Runtime de esta verificación: Node 24.19.0; runtime configurado en Docker: Node 22.22.0.
La prueba usa API NestJS real por HTTP y PostgreSQL embebido PGlite; no usa Docker.

## Límites de evidencia
Docker/Compose no están instalados en el entorno de esta verificación.
No se ejecutaron build/up de contenedores, test:harness contra PostgreSQL de Docker,
ni P12. Los scripts están preparados, pero sus resultados están pendientes.
El YAML se analizó sintácticamente; esto no sustituye `docker compose config`.
No existe un SHA de entrega porque no se creó ni se vinculó un repositorio Git.
El commit deberá registrarse al incorporar estos archivos al repositorio del estudiante.
