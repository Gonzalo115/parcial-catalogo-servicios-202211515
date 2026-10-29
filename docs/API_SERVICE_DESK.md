# API Service Desk
Prefijo /api/desk. JWT Bearer de autenticación local. JSON en todas las operaciones excepto descarga de bytes. GET 200, POST 201, PATCH 200. Validación 400, sin sesión 401, permisos 403, inexistente 404, conflicto de identidad/toma 409. Los IDs deben enviarse como texto numérico positivo.

| Método y ruta | Operación |
|---|---|
| GET /bootstrap | Roles efectivos, catálogos, procesos, colas visibles, clases, ubicaciones y referencias seguras |
| GET /tickets | Lista paginada y autorizada |
| POST /tickets | Alta validada con servicio/cola/solicitante y detalle por proceso |
| GET /tickets/:id | Ficha, CI, relaciones, comentarios autorizados, adjuntos, bitácora y notificaciones |
| PATCH /tickets/:id | Agente autorizado edita clasificación y detalle, con auditoría |
| POST /tickets/:id/accion | tomar/asignar/transferir/escalar/transicion/pausar/retomar/reabrir |
| POST /tickets/:id/comentarios | texto e interno; solicitante solo público |
| POST /tickets/:id/adjuntos | nombre,mime,base64,interno; máximo binario 2 MiB |
| GET /adjuntos/:id | Descarga protegida attachment |
| POST /tickets/:id/relaciones | destino_id,tipo: relacionado/causa/corrige/duplicado |
| GET, POST /colas | Consulta / alta administrativa |
| PATCH /colas/:id | Configuración y permisos, preservando dependencias |
| POST /roles | usuario_id y lista roles adicionales |
| GET, POST /ci | Filtro paginado / alta administrativa |
| GET, PATCH /ci/:id | Ficha con recorrido / mantenimiento |
| POST /ci/:id/relaciones | destino_id,tipo: depende_de/alojado_en/conectado_a |
| POST /clases; PATCH /clases/:id | Clasificación y padres, validación anticiclo |
| POST /ubicaciones; PATCH /ubicaciones/:id | Ubicaciones con estado lógico |
| GET /indicadores | Agregados autorizados y tiempos por ticket |
| GET, POST /faq | Leer / crear o editar artículo (id opcional), admin para escritura |

Filtros tickets: buscar (número/título), servicio_id, proceso, cola_id, estado, prioridad, responsable_id, desde, hasta, pagina, limite (máximo 100). CI: buscar (código/nombre), clase_id, ubicacion_id, responsable_id, estado, activo, pagina, limite.

Ejemplo ticket servicios:
```json
{"titulo":"Solicitar configuración","descripcion":"Configuración de prueba","servicio_id":"1","cola_id":"7","prioridad":2,"impacto":"medio","urgencia":"media","canal":"web","ci_ids":[],"sin_ci_motivo":"Solicitud administrativa","detalle":{}}
```
Los IDs anteriores son ilustrativos; obtenga valores reales de bootstrap. Acción:
```json
{"accion":"transicion","estado":"resuelto","resolucion":"Entrega verificada","detalle":{"confirmacion":"Aceptado"}}
```

Cola: codigo,nombre,descripcion,activo,proceso,nivel,orden,primera_min,resolucion_min,responsable_id y permisos=[{rol o usuario_id,permisos:[...]}]. Las concesiones usuario/rol son excluyentes. El catálogo conserva las rutas /api del parcial descritas en API.md.
