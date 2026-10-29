# Matriz de pruebas y resultados

Entorno de construcción: Ubuntu 24.04, Node v24.22.1, TypeScript y PGlite WASM con SQL PostgreSQL, peticiones HTTP reales a NestJS. Docker objetivo: Node 22.22.0, PostgreSQL 17.9 y Nginx. No se sustituye una ejecución por la otra. Fecha local de revisión: 28/10/2026. Commits y estado final se recuperan con historial.bundle; VERSION.txt identifica fuente final. Evidencias originales conservadas en docs/evidencias; resultados nuevos con prefijo desk/base-ampliada/build.

| Caso | Implementación / entrada | Esperado y verificación | Evidencia |
|---|---|---|---|
| P01 | Auth/guards, sin token, consulta escribiendo, logout | 401/403; logout invalida; base cubre inactivo/hash | desk-final y base-ampliada |
| P02 | Importación Excel original dos veces | 12/46, SE.12, sin duplicación | desk-final y base-ampliada |
| P03 | seed TEST5000, repetir | 5000 únicos y 37 tickets demo principales | desk-final |
| P04 | Clase A→B, intentar B→A y padre inexistente | Rechazo 400, origen Hardware CMDB!C5 | desk-final; fidelidad a árbol docente pendiente |
| P05 | Ticket válido/servicio inválido/sin CI sin motivo | N1 derivado; errores 400 | desk-final |
| P06 | Cola por rol/usuario, consulta pura con atender | Autorización efectiva, sin elevación | desk-final |
| P07 | Dos agentes HTTP concurrentes, orden de lista | Una asignación 201 y otra 409, prioridad ordenada | desk-final |
| P08 | Escalar N1→N2; transferir a cambios | Historial y motivo; proceso distinto rechazado | desk-final |
| P09 | Ruta completa de cada proceso | Cierre en siete rutas; saltos rechazados | desk-final |
| P10 | Cambio directo a ejecución; solicitante aprobador | Rechazo de ejecución y autoaprobación | desk-final |
| P11 | E0/E1/E2/E3 y reapertura/reproceso | Sin incidente E0/E1; incidente/notificación E2/E3 sin duplicarlo | desk-final |
| P12 | I0–I6 y límites 0/3/8/48/168/>168/seguridad | Categorías esperadas, incompatibilidad rechazada | desk-final |
| P13 | Problema con incidente y cambio | Relaciones recuperables | desk-final |
| P14 | A depende B; intentar B alojado A; conectar B a A | Dependencia cíclica rechazada; conectividad permitida | desk-final |
| P15 | Cierre prematuro, reapertura, nota interna, borrado historial | Rechazo, actor registrado, nota oculta, bitácora inmutable | desk-final |
| P16 | Página 100 de búsqueda 5000 CI | 20 resultados, total 5000 y tiempo observado | desk-final (línea JSON P16) |
| P17 | Ticket creado hace 120 min, contacto hace 90 y pausa 30 | Primera 30 min, transcurrido efectivo 90, pendiente ≠ cumplido | desk-final |
| P18 | Reinicio Compose sin quitar volumen | Huellas iguales catálogo/CMDB/tickets/historial/adjuntos | Script entregado, NO ejecutado aquí |
| Adjuntos | PDF falso; TXT interno y descarga solicitante | 400 y 403 | desk-final |
| Seguridad | Inyectar aprobado_por y consultar fuera de cola | 400 y 403; agente autorizado 200 | desk-final |
| Bajas | Usuario con dependencias y cola con abiertos | Rechazo 400 | desk-final |

P16 es medición local observada, no benchmark general ni SLA. Consulte los milisegundos exactos del último log y su entorno; no extrapole a PostgreSQL Docker o su equipo.

## Reproducción

```powershell
docker compose --profile pruebas run --build --rm --no-deps verificaciones
docker compose exec -T nestjs-backend npm run test:harness
powershell -ExecutionPolicy Bypass -File scripts/check-persistence-desk.ps1
```

Cada suite aislada crea DB propia y destruye solo esa instancia. No carga fixtures en producción. Harness live conserva su aislamiento anterior. Para P18 no use la aplicación durante la comparación; logins/acciones paralelas podrían cambiar información auditada.

Cada evidencia de evaluación debe registrar comando, entrada (fixtures definidos en tests), esperado (assert), obtenido (log), fecha y commit. No se modifica un log para convertir fallo en éxito; los primeros intentos permanecen fallidos. Los hashes demo de errores SQL se redactaron explícitamente, sin modificar el error.

## Verificación visual y límites
Frontend compilado; no hay navegador en este entorno y su descarga falló. Por eso el recorrido visual y pruebas de usabilidad se dejan para el equipo de evaluación, con guía completa. PGlite cubre SQL, transacciones y HTTP, pero no valida red/contenedores/volúmenes reales; P18 y harness live deben ejecutarse en Docker. El control de concurrencia en PostgreSQL real se sustenta en bloqueo asesor + UPDATE condicional y requiere comprobación adicional en dicho entorno.

## Resultado final

23 pruebas del parcial y 21 de Service Desk aprobadas (44 en total, conteo del ejecutor Node). Fuente validada: `46b07e9e7cf75d9351a399dcbf2ecec0645ef6f3`. Compilaciones backend/frontend con salida 0. Detalles exactos en evidencias/VALIDACION_FINAL.json. El conteo incluye las pruebas contenedoras de cada suite.

## Corrección del portal — 29/10/2026

24 tests Service Desk y 23 de regresión aprobados. Tres nuevos grupos verifican aislamiento con solicitante2, denegación de módulos y ausencia de detalles/notas internas en seguimiento. Ver portal-seguridad.txt y portal-regresion.txt. Compilaciones backend/frontend aprobadas; panel lateral compilado, recorrido visual pendiente en navegador.
