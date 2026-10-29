> **Actualización de permisos y diseño:** ver [docs/PARCHE_PORTAL_SOLICITANTE.md](docs/PARCHE_PORTAL_SOLICITANTE.md). Los solicitantes ya no tienen acceso al inventario completo, organización ni indicadores. Las indicaciones antiguas de lectura amplia quedan sustituidas por esa política. Cuenta adicional: solicitante2.

# Service Desk y CMDB — 202211515

Ampliación del catálogo del Parcial 2: autenticación local, organización, catálogo N1/N2, tickets, ocho colas de demostración, siete procesos, aprobaciones, CMDB y 5,000 dispositivos sintéticos.

**Comience por [GUIA_EJECUCION_Y_PRUEBAS.md](GUIA_EJECUCION_Y_PRUEBAS.md).** Contiene preparación en Windows/Linux, cuentas, funcionalidades y recorrido de los siete procesos.

Solo se necesita Docker Engine/Desktop con Compose v2.20+; no es necesario instalar Node, npm ni PostgreSQL en el equipo anfitrión. No requiere claves ni suscripción IA. Ejecución local, puertos 8080 (web) y 3100 (API), enlazados a localhost.

## Arranque limpio en PowerShell

Extraiga el ZIP y entre en la carpeta `service-desk` que contiene este README.

```powershell
docker run --rm --mount "type=bind,source=$((Get-Location).Path),target=/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
powershell -ExecutionPolicy Bypass -File scripts/prepare.ps1
```

Linux/macOS:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
sh scripts/prepare.sh
```

Si `.env` ya existe, el configurador lo conserva y termina con error. No lo borre: agregue las variables nuevas de `.env.example` y continúe con prepare. El ZIP no incluye un `.env` de trabajo.

Abra **http://localhost:8080**. API: **http://localhost:3100/api**.

| Cuenta      | Correo                 | Contraseña DEMO predeterminada | Perfil                      |
| ----------- | ---------------------- | ------------------------------ | --------------------------- |
| admin       | admin@demo.local       | SA_admin_2026                  | Configuración y supervisión |
| consulta    | consulta@demo.local    | SA_consulta_2026               | Lectura                     |
| solicitante | solicitante@demo.local | SA_desk_2026_demo              | Casos propios               |
| agente1     | agente1@demo.local     | SA_desk_2026_demo              | Atención                    |
| agente2     | agente2@demo.local     | SA_desk_2026_demo              | Atención / concurrencia     |
| aprobador   | aprobador@demo.local   | SA_desk_2026_demo              | Decisiones autorizadas      |

Contraseñas exclusivamente demostrativas, configurables localmente. El seed conserva cuentas y contraseñas ya existentes. Cambiar `.env` no cambia cuentas previamente creadas ni la contraseña del volumen PostgreSQL.

## Comandos de comprobación

```powershell
docker compose --profile pruebas run --build --rm --no-deps verificaciones
docker compose exec -T nestjs-backend npm run test:harness
powershell -ExecutionPolicy Bypass -File scripts/check-persistence-desk.ps1
```

Primera orden: dos suites aisladas con NestJS/SQL real en PostgreSQL WASM (PGlite). Segunda: harness del parcial contra PostgreSQL/API de Docker. Tercera: P18 real, compara huellas antes/después de apagar y levantar contenedores sin quitar volúmenes. No use la interfaz mientras se compara.

## Documentación

- [Guía de ejecución y pruebas manuales](GUIA_EJECUCION_Y_PRUEBAS.md)
- [Resolución de la ampliación](docs/RESOLUCION_SERVICE_DESK.md)
- [Modelo y fuentes CMDB](docs/MODELO_SERVICE_DESK.md)
- [Procesos, permisos, estados e indicadores](docs/PROCESOS.md)
- [API ampliada](docs/API_SERVICE_DESK.md)
- [Pruebas, resultados y límites](docs/PRUEBAS.md)
- [Ingeniería asistida por IA y ciclos](docs/IA.md)
- [Modelo del parcial conservado](docs/MODELO.md)

Las fuentes originales están en `data/`. Las subcategorías CMDB adicionales son propuesta explícita del proyecto: el Excel contiene Hardware/Software pero no un árbol completo, y la presentación no enumera esa taxonomía. Ver el mapeo de fuentes y la limitación documental.

No se declara verificado Docker en el entorno de construcción de esta entrega: Docker no está disponible allí. Las pruebas aisladas y compilaciones sí tienen resultados reales en docs/evidencias. No equivalen a P18 ni a un recorrido visual en navegador.

## Historial local

`VERSION.txt` identifica la fuente validada. `HISTORIAL_COMMITS.txt` lista decisiones y `historial.bundle` conserva commits, sin requerir Git para levantar Docker. Para recuperar el repositorio con Git: `git clone historial.bundle ../service-desk-con-historial`. No se publicó en un remoto.

Actualización de sesión al recargar y ficha por secciones: [aplicación y pruebas](docs/PARCHE_SESION_Y_SECCIONES.md).
