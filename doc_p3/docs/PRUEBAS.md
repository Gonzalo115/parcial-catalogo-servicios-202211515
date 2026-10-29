# Pruebas

## Corte y entorno

Fecha de ejecución: 29/10/2026, Guatemala. Código: `6fdfabf2995d7ebb9697fc2f1da9d33bfc45bcbb`. Entorno observado: Ubuntu 24.04.3 LTS, Linux 6.18.55 x86_64, Node v24.22.1. Backend: NestJS/TypeORM, PGlite WASM y HTTP local. Frontend: React con LinkeDOM y respuestas API simuladas; no navegador real. Objetivo Docker: Node 22.22.0, PostgreSQL 17.9 y Nginx 1.28.2. No se equiparan esos entornos.

La matriz se refiere a los fixtures y aserciones de [embedded.test.cjs](evidencias/codigo/backend/tests/embedded.test.cjs), [desk.test.cjs](evidencias/codigo/backend/tests/desk.test.cjs), [session.test.js](evidencias/codigo/frontend/tests/session.test.js) y [ui-cases.jsx](evidencias/codigo/frontend/tests/ui-cases.jsx). Allí se conservan las entradas exactas de cada caso.

## Resultados ejecutados

| Comando y directorio | Obtenido | Código de salida | Evidencia |
|---|---|---|---|
| backend: npm run test:embedded | 23 tests, 23 aprobados, 0 fallos | 0 | [regresion.txt](evidencias/regresion.txt) |
| backend: npm run test:desk | 24 tests, 24 aprobados, 0 fallos | 0 | [service-desk.txt](evidencias/service-desk.txt) |
| frontend: npm test | 9 tests, 9 aprobados, 0 fallos | 0 | [frontend.txt](evidencias/frontend.txt) |
| backend: npm run build | Compilación TypeScript completa | 0 | [build-backend.txt](evidencias/build-backend.txt) |
| frontend: npm run build | 34 módulos; artefacto estático generado | 0 | [build-frontend.txt](evidencias/build-frontend.txt) |

Total reportado por Node: **56 tests aprobados**, incluyendo las pruebas contenedoras de las dos suites backend. No equivale a 56 requisitos distintos ni incluye Docker/P18. Registro de ejecución: [EJECUCION.json](evidencias/EJECUCION.json).

## Matriz requisito → implementación → prueba → evidencia

| Requisito / caso | Implementación y entrada de prueba | Resultado obtenido y alcance | Evidencia |
|---|---|---|---|
| P01 | Auth/guards, sin token, consulta escribiendo, logout | 401/403; logout invalida; base cubre inactivo/hash | [Service Desk](evidencias/service-desk.txt) y [regresión](evidencias/regresion.txt) |
| P02 | Importación Excel original dos veces | 12/46, SE.12, sin duplicación | [Service Desk](evidencias/service-desk.txt) y [regresión](evidencias/regresion.txt) |
| P03 | seed TEST5000, repetir | 5000 únicos y 37 tickets demo principales | [Service Desk](evidencias/service-desk.txt) |
| P04 | Clase A→B, intentar B→A y padre inexistente | Rechazo 400, origen Hardware CMDB!C5 | [Service Desk](evidencias/service-desk.txt); fidelidad completa pendiente |
| P05 | Ticket válido/servicio inválido/sin CI sin motivo | N1 derivado; errores 400 | [Service Desk](evidencias/service-desk.txt) |
| P06 | Cola por rol/usuario, consulta pura con atender | Autorización efectiva, sin elevación | [Service Desk](evidencias/service-desk.txt) |
| P07 | Dos agentes HTTP concurrentes, orden de lista | Una asignación 201 y otra 409, prioridad ordenada | [Service Desk](evidencias/service-desk.txt) |
| P08 | Escalar N1→N2; transferir a cambios | Historial y motivo; proceso distinto rechazado | [Service Desk](evidencias/service-desk.txt) |
| P09 | Ruta completa de cada proceso | Cierre en siete rutas; saltos rechazados | [Service Desk](evidencias/service-desk.txt) |
| P10 | Cambio directo a ejecución; solicitante aprobador | Rechazo de ejecución y autoaprobación | [Service Desk](evidencias/service-desk.txt) |
| P11 | E0/E1/E2/E3 y reapertura/reproceso | Sin incidente E0/E1; incidente/notificación E2/E3 sin duplicarlo | [Service Desk](evidencias/service-desk.txt) |
| P12 | I0–I6 y límites 0/3/8/48/168/>168/seguridad | Categorías esperadas, incompatibilidad rechazada | [Service Desk](evidencias/service-desk.txt) |
| P13 | Problema con incidente y cambio | Relaciones recuperables | [Service Desk](evidencias/service-desk.txt) |
| P14 | A depende B; intentar B alojado A; conectar B a A | Dependencia cíclica rechazada; conectividad permitida | [Service Desk](evidencias/service-desk.txt) |
| P15 | Cierre prematuro, reapertura, nota interna, borrado historial | Rechazo, actor registrado, nota oculta, bitácora inmutable | [Service Desk](evidencias/service-desk.txt) |
| P16 | Página 100 de búsqueda 5000 CI | 20 resultados, total 5000 y tiempo observado | [Service Desk, JSON P16](evidencias/service-desk.txt) |
| P17 | Ticket creado hace 120 min, contacto hace 90 y pausa 30 | Primera 30 min, transcurrido efectivo 90, pendiente ≠ cumplido | [Service Desk](evidencias/service-desk.txt) |
| P18 | Reinicio Compose sin quitar volumen | Huellas iguales catálogo/CMDB/tickets/historial/adjuntos | [Script P18](evidencias/codigo/scripts/check-persistence-desk.ps1), NO ejecutado aquí |
| Adjuntos | PDF falso; TXT interno y descarga solicitante | 400 y 403 | [Service Desk](evidencias/service-desk.txt) |
| Seguridad | Inyectar aprobado_por y consultar fuera de cola | 400 y 403; agente autorizado 200 | [Service Desk](evidencias/service-desk.txt) |
| Bajas | Usuario con dependencias y cola con abiertos | Rechazo 400 | [Service Desk](evidencias/service-desk.txt) |


P04 es **parcial**: se verifican origen Hardware/Software, integridad y rechazo de ciclos/padres inexistentes, pero no fidelidad completa a una jerarquía docente no disponible. P07 se comprobó en el adaptador aislado; no se declara una prueba de concurrencia en PostgreSQL Docker. P18 está **pendiente**.

| Cambio reciente | Implementación | Prueba y resultado | Evidencia |
|---|---|---|---|
| Separación de solicitantes | portal-policy, RolesGuard, filtrado de tickets y bootstrap | Dos identidades: ajenos y módulos internos 403; pertenencia accidental a cola no amplía acceso. | Tres grupos Portal en [service-desk.txt](evidencias/service-desk.txt) |
| CI mínimos del portal | ci-opciones y validación de propiedad | Selector de otro usuario vacío; CI ajeno rechazado. | Grupo módulos/CI en [suite](evidencias/service-desk.txt) |
| Privacidad de historial | Proyección pública de eventos | Sin snapshots ni notas internas en seguimiento; operador conserva su detalle. | Grupo seguimiento público en [suite](evidencias/service-desk.txt) |
| Sesión al recargar | sessionStorage + /auth/me | Restauración tras remontar, perfil actual, token vencido/revocado, logout, error de red/503 y almacenamiento corrupto/bloqueado. | [frontend.txt](evidencias/frontend.txt) |
| Secciones de ficha | TicketWorkspace y Desk | Navegación conserva campo pendiente; refrescar mismo caso conserva sección; caso nuevo vuelve a Atención; solicitante no tiene secciones operativas. | [ui-cases.jsx](evidencias/codigo/frontend/tests/ui-cases.jsx) y [resultado](evidencias/frontend.txt) |
| Toma visible | Botón y responsable en cabecera | Ficha real con API simulada: tomar actualiza responsable y deshabilita nueva toma. | [resultado frontend](evidencias/frontend.txt) |

## Medición P16

Entrada: 5000 dispositivos del conjunto `seed:TEST5000`; búsqueda SYN-TEST5000, página 100, límite 20. Esperado: total 5000 y 20 elementos. Obtenido: ambos controles aprobados; **41.747542 ms** en la medición interna de esta ejecución. El test completo tiene otra duración, mostrada por Node. Se trata de una consulta HTTP local con PGlite, no de un benchmark general ni garantía de SLA para PostgreSQL/Docker.

## Evidencia manual aportada por el usuario

| Observación | Evidencia | Qué demuestra / límite |
|---|---|---|
| Ficha anterior larga | [captura](evidencias/01-ficha-larga.png) y [acciones](evidencias/02-acciones-al-pie.png) | Problema de recorrido vertical reportado. |
| Secciones nuevas | [captura](evidencias/05-secciones-implementadas.png) | Interfaz actualizada en su entorno; no demuestra por sí sola persistencia al F5. |
| Selección de destino sin escalamiento visible | [selección](evidencias/06-seleccion-destino.png), [listado](evidencias/07-cola-sin-cambiar.png) | Seleccionar destino no constituye una operación aplicada. |
| Ticket #41 escalado | [captura](evidencias/08-escalamiento-reflejado.png) | Nivel 2, agente2 y diagnostico en el listado. No prueba resolución/cierre. |

No hay evidencia posterior del cierre manual del ticket #41. El usuario confirmó que logró ingresar como solicitante2; no se infiere que modificar .env haya actualizado su contraseña. No se incorpora la captura que mostraba secretos de configuración.

## Reproducción en Docker y pendientes

Desde la raíz del repositorio:

```powershell
docker compose --profile pruebas run --build --rm --no-deps verificaciones
docker compose exec -T nestjs-backend npm run test:harness
powershell -ExecutionPolicy Bypass -File scripts/check-persistence-desk.ps1
```

La primera orden repite pruebas aisladas dentro de un contenedor; la segunda usa la API y PostgreSQL del despliegue; la tercera compara persistencia tras reinicio. No se ejecutaron aquí. Registrar sus logs, fecha, commit y código de salida antes de presentarlas como aprobadas. Para P18 evitar actividad concurrente; no eliminar volúmenes.

Las suites backend crean bases propias y las cierran al terminar. Los tests UI usan datos simulados y no autentican cuentas reales. Las pruebas con fallos originales se conservan en historicas y no se suman al resultado actual. Las pruebas y compilaciones actuales no reescriben esos logs para presentarlos como éxitos.
