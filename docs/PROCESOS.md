> **Política actualizada del portal:** [PARCHE_PORTAL_SOLICITANTE.md](PARCHE_PORTAL_SOLICITANTE.md). Solicitante sin funciones operativas: solo casos propios y ayuda; no obtiene lectura de colas por pertenencia ni lectura global por su rol base.

# Procesos, permisos y relojes

## Identidades
Se conserva usuario.rol (administrador/consulta) para compatibilidad. usuario_rol permite cero o varios roles adicionales: solicitante, agente, aprobador. Roles actuales se recuperan de DB en cada petición, no del JWT. Consulta pura nunca escribe aunque una cola le conceda atender. Una cuenta con agente explícito tiene las facultades de ese rol únicamente en colas autorizadas. Administrador configura y puede operar como supervisor. No evade la regla de autoaprobación de accesos.

| Perfil | Facultades |
|---|---|
| Administrador | Catálogo, organización, usuarios, roles, colas, CMDB, FAQ; supervisión de todos los tickets |
| Solicitante | Crear y consultar casos propios, comentar, adjuntar y reabrir con motivo |
| Agente | Leer/atender/transferir en colas autorizadas, con permisos distintos |
| Aprobador | Consultar/aprobar/rechazar en colas autorizadas |
| Consulta | Lectura funcional, sin escritura ni secretos/notas internas |

Cola_permiso permite rol o usuario (XOR), con consultar/atender/transferir/aprobar/administrar. Administrar configuración se reserva al administrador global; una concesión local no eleva identidad. Los agentes requieren rol agente y permiso de cola. Aprobadores requieren rol aprobador y permiso aprobar. No hay autorización basada únicamente en botones. Desactivar cola bloquea si hay abiertos; retirar rol agente bloquea si tiene abiertos asignados. Usuario con tickets, CI o colas activos debe reasignarse antes de baja.

## Tipos y rutas
Cada cola configura exactamente un proceso. Tipo y N1 se derivan de proceso y servicio, respectivamente. Asignación mixta manual: tomar un caso o asignarlo a un agente autorizado. Orden configurable prioridad (1 alta, 2 media, 3 baja), creación e ID; alternativa antigüedad. Bloqueo transaccional y UPDATE con responsable NULL evitan doble toma. Transferencia conserva proceso y requiere motivo. Escalamiento exige cola destino con nivel superior. No convierte un incidente en problema: se crea y vincula otro ticket.

| Proceso / tipo | Estados secuenciales |
|---|---|
| Nuevos / requisición de servicio | registrado → analisis → aprobado → implementacion → resuelto → cerrado |
| Cambios / solicitud de cambio | registrado → evaluacion → aprobado → planificacion → ejecucion → validacion → resuelto → cerrado |
| Incidentes / incidente | registrado → clasificacion → diagnostico → atencion → recuperacion → resuelto → cerrado |
| Eventos / evento | registrado → clasificacion → evaluacion → respuesta → resuelto → cerrado |
| Problemas / problema | registrado → investigacion → causa_raiz → solucion_temporal → solucion_definitiva → resuelto → cerrado |
| Accesos / solicitud de acceso | registrado → validacion_solicitud → aprobado → provision → validacion → resuelto → cerrado |
| Servicios / requisición de servicio | registrado → validacion → asignacion → cumplimiento → confirmacion → resuelto → cerrado |

Aprobación/rechazo con motivo en nuevos, cambios y accesos. Rechazo es terminal. No hay salto a ejecución ni provisión sin aprobación. Acceso no puede aprobarlo solicitante ni beneficiario. Nuevos requiere necesidad/viabilidad; al implementar crea un N2 con código único y sección o vincula uno existente. El servicio del ticket es el servicio de referencia que recibe la solicitud; el propuesto/resultante se registra aparte (detalle.servicio_creado_id). Así no se crean servicios provisionales para solicitudes rechazadas.

Cambio exige impacto, riesgo, pruebas, reversión y CI afectados para aprobar; planificación antes de ejecución y evidencia antes de validación. Incidente registra afectación, categoría, duración y solución aplicada. Problema exige vínculo a incidente, causa raíz y soluciones; puede relacionarse a un cambio. Acceso registra beneficiario, recurso, permiso, provisión/revocación y evidencia. Servicio existente exige validación, evidencia de cumplimiento y confirmación.

Todos requieren resolución para pasar a resuelto; solo desde resuelto se cierra. Reapertura de cerrado por solicitante propio/agente autorizado con motivo; vuelve a registrado y limpia aprobación/resolución/cierre, conserva primera atención, creación y bitácora. Pausa/retomar con motivo en estados no terminales; se conserva estado previo y se acumula tiempo.

## Eventos, diapositiva 15 de Service Desk
E0 programado: registro. E1 no programado sin impacto: registro de evaluación, sin respuesta operativa. E2 impacto en servicio: incidente y notificación. E3 seguridad: incidente y notificación. La fase respuesta en E0/E1 solo documenta que no se requiere acción. E2/E3 permiten vincular incidente autorizado existente o crearlo, con origen_evento_id único. Reprocesar el mismo ticket tras reapertura conserva el incidente. clave_externa única rechaza cargas duplicadas de un evento externo. Notificación verificable en ficha; no envía correos reales.

## Incidentes, diapositiva 16
| Categoría | Rótulo original | Prioridad | Redundancia de referencia |
|---|---|---|---|
| I0 | No causa interrupción | Baja | Existe |
| I1 | 3 horas o menos, incluye degradaciones | Media | No existe |
| I2 | 8 horas o menos, incluye degradaciones | Media | No existe |
| I3 | 2 días o menos | Alta | No existe |
| I4 | 1 semana o menos | Alta | No existe |
| I5 | 1 mes o más | Alta | No existe |
| I6 | Seguridad de recursos/información | Alta | No existe |

Regla complementaria DEL PROYECTO: seguridad prevalece (I6); sin interrupción 0 h I0; (0,3] I1; (3,8] I2; (8,48] I3; (48,168] I4; >168 I5. Esto extiende I5 al hueco semana–mes: no es una transcripción del docente. Si se conoce duración estimada se valida categoría; real se conserva como medición sin reclasificar retrospectivamente. Prioridad/redundancia divergentes exigen justificación. Categoría temporal no equivale a SLA.

## Soporte
Configuración operativa 0 Autoservicio, 1 Help Desk, 2 Soporte Técnico, 3 Ingenieros, 4 Externo (diapositiva 11). Equivalencia con 12–13: 0→0, 1→1, 2/3→2, 4→3. No se fuerzan cuotas de 20/70/5/5; son referencias del material. Código de nombres en workflows.ts; nivel seleccionable por cola.

## Indicadores
Tiempo calendario 24x7, minutos. Antigüedad = ahora−creación. Primera atención = primera toma/asignación−creación; no se infiere de abrir ficha. Resolución = resuelto−creación−pausas; para abiertos se usa ahora, para rechazados se utiliza cierre administrativo. Pausa vigente se resta. Reapertura mide el nuevo total desde creación y conserva acumulado de pausas, con ciclos anteriores auditados. Primera atención conserva primer contacto. Objetivos consultan valores actuales de cola (cambios de objetivo afectan cálculo actual y quedan auditados). Pendiente ≠ cumplido. Superado en abierto = vencido_abierto. Tablero presenta valores por caso y conteos por cola/proceso/prioridad/estado. En rechazados el indicador es tiempo administrativo, no resolución técnica. Las medias/porcentajes deben excluir pendientes; la UI muestra estados individuales para evitar esa mezcla.
