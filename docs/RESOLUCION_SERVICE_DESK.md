# Resolución de la ampliación Service Desk

## Alcance y arquitectura
Se conserva React/Vite, Nginx, NestJS, TypeORM y PostgreSQL con tres servicios Compose. No se requiere infraestructura externa ni IA en ejecución. La migración 003 es aditiva: roles adicionales, procesos, colas, permisos, CI, tickets, relaciones, bitácora, adjuntos, notificaciones y FAQ. El frontend mantiene el catálogo anterior y añade un espacio de atención. La API ampliada usa SQL parametrizado mediante EntityManager para consultas y transacciones. El modelo del parcial permanece intacto.

La autorización es local, JWT revocable y roles recuperados de DB en cada petición. Los nuevos usuarios tienen rol base consulta para no heredar administración del catálogo; las facultades operativas se otorgan explícitamente en usuario_rol y por cola. Un permiso de cola no convierte a consulta pura en agente.

## Integridad y decisiones
Los servicios N1 y tipos de tickets se derivan, evitando duplicidad contradictoria. Servicio de referencia en nuevos servicios recibe la solicitud; servicio resultante se vincula/crea solo después de aprobación. Los CI no son obligatorios para todo trámite; se exige motivo cuando no aplican. Tickets relacionados conservan su identidad y proceso. Las transferencias se restringen al mismo proceso; la conversión se representa creando/vinculando otro ticket.

Las transacciones tienen bloqueo asesor compartido con CRUD/importador y una cola de ejecución por instancia para compatibilidad con el adaptador embebido; el UPDATE condicional protege la toma. Las validaciones de flujo, permisos y aprobación se ejecutan en servidor. Las FK/CHECK y triggers refuerzan la integridad. Bitácora inmutable a UPDATE/DELETE; no se expone un endpoint de eliminación de tickets. Adjuntos se guardan como bytes persistentes, con límite 2 MiB, whitelist de tipo, firmas PDF/PNG/JPEG y autorización de descarga; se fuerzan como attachment con nosniff. No se sirven enlaces originales como instrucciones ni se descargan sus URLs.

Consulta funcional no accede a hashes. Solicitante ve solo sus tickets y comentarios públicos. Agentes ven colas autorizadas. Aprobadores actúan con permiso explícito; no autoaprueban accesos. Usuarios inactivos y jerarquías inactivas no autentican. Se bloquean bajas de usuarios/colas con dependencias activas.

## Fuentes y datos
Fuentes originales sin alterar en data. Importador 12/46 conservado y probado tras ampliación. CMDB conserva ejemplos, etiquetas y trazabilidad. Generador con SHA-256 por semilla e índice: códigos únicos y ON CONFLICT DO NOTHING, preservando correcciones. La misma semilla conserva dispositivos; otra añade conjunto identificado. No hay limpieza automática ni borrado del conjunto al arrancar. Configuración de 5,000 por defecto; cantidad máxima 100,000 para limitar operaciones.

[Modelo, diccionario y mapeos](MODELO_SERVICE_DESK.md), [procesos e indicadores](PROCESOS.md), [pruebas](PRUEBAS.md), [IA y ciclos](IA.md).

## Limitaciones explícitas
- Las fuentes disponibles no enumeran una taxonomía completa de dispositivos. Subcategorías propuestas, documentadas y editables; su coincidencia con una jerarquía docente distinta queda pendiente de aclaración.
- No se ejecutó Docker en este entorno porque no está instalado. P18 y harness contra PostgreSQL Docker se entregan para ejecución real, sin declararlos aprobados. El build sí debe correr ambas suites aisladas dentro de sus etapas.
- Se compilaron frontend y backend y se probaron rutas HTTP. No se pudo ejecutar navegador porque no hay uno instalado y la descarga fue bloqueada; navegación visual pendiente.
- El registro de provisión, cambios y atención es documental: no modifica servidores ni cuentas externas. Notificaciones dentro de la aplicación, sin correo real.
- Atributos CI se editan mediante un objeto JSON flexible en la interfaz administrativa. Relaciones son navegables mediante botones, no un editor gráfico de arrastrar nodos.
- Los objetivos son calendario 24x7, no calendario laboral. El tablero presenta resultados individuales y agregados de conteo; no exporta reportes ni aplica cuotas de soporte.
- Para acceso público se requerirían HTTPS, rate limiting, análisis antimalware de adjuntos y separación de permisos DB de migración/operación. Esta entrega publica únicamente en localhost.

## Defensa y entrega
El estudiante debe entender los flujos y demostrar una modificación pequeña. README y guía permiten reproducir carga/pruebas. Los commits son locales y el bundle permite recuperarlos; no se publicó en GitHub ni se envió invitación. Complete identidad académica si corresponde y publique el mismo commit validado por su cuenta. No atribuya al material las reglas complementarias del proyecto ni presente pruebas pendientes como realizadas.
