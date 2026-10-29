> Documento histórico del parcial conservado. La ampliación actual se describe en [RESOLUCION_SERVICE_DESK.md](RESOLUCION_SERVICE_DESK.md).

# Resolución — Fase 3

## Problema, alcance y decisiones

Sistematizar el Excel original y permitir consulta/mantenimiento seguro mediante aplicación
web. Se cubren organización, usuarios, catálogos, dos niveles, responsabilidad e importación.
Se excluyen tickets, facturación y consumo. El responsable no está en el Excel y no se infiere.
La excepción del enunciado permite N2 importados sin asignación; el alta manual exige sección.

## Arquitectura

React/JavaScript y Vite generan la interfaz; Nginx sirve estáticos y reenvía `/api` a NestJS.
Backend NestJS/TypeScript con DataSource de TypeORM y PostgreSQL 17. synchronize=false:
las migraciones SQL gobiernan el esquema. Repositorios y transacciones para los CRUD y las
cargas; consultas parametrizadas existentes de autenticación se ejecutan sobre TypeORM.
pg se conserva en los comandos de migración, demo y harness de PostgreSQL del contenedor.

Tres servicios Compose, red interna y volumen persistente. La base no publica puerto.
Frontend/API host enlazados a localhost; healthchecks y dependencias evitan arrancar antes
que el esquema. La migración 002 actualiza el volumen existente sin borrar 001 ni sus datos.
Versiones exactas y dependencias reproducibles en Dockerfiles y package-lock.

[Diagrama y diccionario completo](MODELO.md). [Rutas, contratos y errores](API.md).

## Importación: mapeo y reglas

| Excel               | Destino / tratamiento                                                        |
| ------------------- | ---------------------------------------------------------------------------- |
| A/B COD.N1 / nombre | servicio_nivel1.codigo/nombre; agrupación por código                         |
| C/D COD.N2 / nombre | servicio_nivel2.codigo/nombre; códigos conservados como texto                |
| E ACTIVO            | N2.activo: S=true, N=false, vacío=NULL                                       |
| F/G/H               | clase_id / criticidad_id / tipo_id; listas originales F112:H122              |
| I/J                 | descripcion / metrica, vacío=NULL                                            |
| K/L                 | minimo / maximo NUMERIC; cadenas decimales y validación de orden             |
| Rango combinado     | Resolver celda principal únicamente dentro del rango; evidencia por celda    |
| Filas 42 y 67       | Omitir por código N2 ausente fuera de combinación; reportar, sin propagación |
| B99/B100 SE.12      | Primer nombre no vacío: Suministrar Analitica; guardar ambos y advertir      |
| A/B101 vacíos       | SE.12.3 obtiene padre existente SE.12 por prefijo; transformación registrada |
| E:L99–101 vacíos    | NULL y requiere_revision=true, sin datos inventados                          |

SE.12 canónico es una política técnica determinista, no la confirmación del nombre oficial.
Otros atributos en conflicto: primer valor no vacío en orden de fila, evidencia y revisión.
No se normalizan códigos ni se corrige silenciosamente `Demostration`.
Si el administrador renombra una clase/criticidad/tipo, se guarda la etiqueta anterior en
opcion_mapeo con su FK concreta. El importador resuelve ese alias y emite observación;
no crea una categoría nueva. Una etiqueta reservada no puede reutilizarse para otra identidad.

ExcelJS verifica hoja, encabezados y controles 12/46 antes de escribir. Código único, carga
transaccional y bloqueo asesor compartido con CRUD. Un error revierte toda la carga.
Cada ejecución crea un lote con SHA-256, reglas y 97 detalles de origen. Ver reporte JSON
con creados, actualizados, sin cambios, preservados, filas omitidas y observaciones.
Una segunda carga no duplica el catálogo; sí conserva un nuevo registro de auditoría.

El snapshot mantiene la última proyección importada. Si se detecta edición manual o un
registro sin procedencia, se conserva y se reporta. Si el origen cambia y el registro sigue
igual al snapshot, se actualiza. Las asignaciones no forman parte de la proyección; jamás
se sobrescriben. El control 12/46 describe el origen, aun con servicios manuales adicionales.
Fuente SHA-256: `de3b478a5faeeeaebce1aa7726e0e3321188a68e41bbb656e1d17b0c5b74dcf0`.

## Autenticación y autorización

Local con bcryptjs costo 12 y sal aleatoria; rechazar contraseña mayor de 72 bytes UTF-8.
JWT HS256 900 segundos, emisor/audiencia explícitos, jti UUID y sesión persistente.
Logout revoca sesión; cada petición verifica firma, caducidad, sesión y usuario/jerarquía/rol
actuales. Guard JWT y RolesGuard globales protegen todas las rutas salvo login y salud.
Roles administrador/consulta; consulta tiene lectura funcional y no acceso al mantenimiento
de usuarios ni al historial administrativo. Hashes excluidos de las proyecciones ORM.
Contraseñas o bajas de usuarios revocan sesiones. El JWT se mantiene en memoria en React.

## Matriz requisito → implementación → prueba → evidencia

| Caso / requisito                  | Implementación                     | Prueba                                                | Evidencia                                    |
| --------------------------------- | ---------------------------------- | ----------------------------------------------------- | -------------------------------------------- |
| P01 local login válido/inválido   | auth, users y bcrypt               | HTTP de runHarness                                    | salida suite Fase3                           |
| P02 sesión, logout, inactivo      | guards + sesion                    | firma/expiración/logout/inactivo                      | salida suite Fase3                           |
| P03 consulta intenta escribir     | roles globales + CRUD              | POST organización/N2/import 403                       | salida suite Fase3                           |
| P04 jerarquía y usuario           | entidades + CRUD + formulario      | altas HTTP, recuperar empresa por puesto              | salida suite Fase3                           |
| P05 duplicados/FK                 | SQL + DatabaseFilter               | HTTP 409 / 400                                        | salida suite Fase3                           |
| P06 original 12/46                | parser + importer                  | HTTP carga original y 97 detalles                     | salida suite Fase3                           |
| P07 repetición                    | uniques + snapshot                 | segunda carga 0 creados y 46 sin cambios              | salida suite Fase3                           |
| P08 SE.12/NULL/códigos            | parser, revisión y auditoría       | canonical/ambos nombres/tres N2 NULL                  | salida suite Fase3                           |
| P09 umbrales                      | class-validator + Decimal + CHECK  | POST inválido, PATCH un campo inválido                | salida suite Fase3                           |
| P10 búsqueda/filtros/ficha        | query builder + React              | búsqueda/página/filtros combinados                    | salida suite Fase3                           |
| P11 sección responsable           | API + triggers + selects           | cross-section rechazado y traslado protegido          | salida suite Fase3                           |
| Corrección de etiquetas           | opcion_mapeo + CRUD + importador   | renombrar/cargar sin nueva categoría; alias reservado | salida suite Fase3                           |
| Tres asignaciones demo            | seed:asignaciones                  | mínimo 3, reejecución sin cambios                     | salida suite Fase3                           |
| Reimportar conserva mantenimiento | snapshot y responsable separado    | editar/asignar/cargar/ficha conserva                  | salida suite Fase3                           |
| P12 persistencia                  | volumen + scripts host             | huella antes/después del reinicio                     | Script entregado; ejecución Docker pendiente |
| UI administrativa/consulta        | recursos, formularios y navegación | build Vite                                            | compilación; recorrido visual pendiente      |
| Context engineering               | AGENTS + contexto 001–004          | cambios por hallazgos                                 | docs/contexto                                |
| Prompt engineering                | prompts reales seleccionados       | mejoras explicadas sin resultados inventados          | docs/prompts                                 |
| Harness engineering               | build/test/fixtures/P12            | fallo CRUD → corrección → prueba satisfactoria        | docs/evidencias                              |
| GitHub/identificación             | documentación de entrega           | URL/acceso/commit/tag                                 | acciones del estudiante pendientes           |

## Evidencias de ingeniería con IA

| Tipo                    | Archivos                                                                                                                                                                                                                                                | Qué contienen                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| **Context engineering** | [AGENTS.md](../AGENTS.md)<br>[001_stack.md](contexto/001_stack.md)<br>[002_revocacion.md](contexto/002_revocacion.md)<br>[003_typeorm_importacion.md](contexto/003_typeorm_importacion.md)<br>[004_responsabilidad.md](contexto/004_responsabilidad.md) | Contexto del proyecto y actualizaciones justificadas por decisiones y hallazgos.      |
| **Prompt engineering**  | [PROMPTS_UTILIZADOS.md](prompts/PROMPTS_UTILIZADOS.md)                                                                                                                                                                                                  | Prompts utilizados, objetivos, restricciones, criterios de aceptación e iteraciones.  |
| **Harness engineering** | [CICLO_HARNESS.md](evidencias/CICLO_HARNESS.md)<br>[VERIFICACION_FASE3.md](evidencias/VERIFICACION_FASE3.md)                                                                                                                                            | Rutina de verificación y ciclos de fallo, corrección y nueva ejecución satisfactoria. |

### Resultados que respaldan el harness

| Evidencia                            | Archivo                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| Fallo detectado en el CRUD           | [fase3-fallo-crud.txt](evidencias/fase3-fallo-crud.txt)                 |
| Pruebas después de corregir el fallo | [fase3-correccion-crud.txt](evidencias/fase3-correccion-crud.txt)       |
| Resultado final de las pruebas       | [fase3-resultados-finales.txt](evidencias/fase3-resultados-finales.txt) |
| Compilación del frontend             | [fase3-build-react.txt](evidencias/fase3-build-react.txt)               |
| Análisis del Excel original          | [analisis-excel-fase3.json](evidencias/analisis-excel-fase3.json)       |

## Harness y aislamiento

La suite embebida usa un PostgreSQL real compilado a WASM (PGlite), el dialecto PostgreSQL
con adaptador de pruebas TypeORM, SQL completo y NestJS escuchando HTTP. No es una base
PostgreSQL de Docker. Cada ejecución es una instancia nueva sin persistencia.
Las pruebas live usan pg/PostgreSQL de Compose y fixtures con prefijo propio, limpieza en
finally; no ejecutan pruebas destructivas de importación sobre registros manuales reales.
Las pruebas completas de carga y preservación se ejecutan sobre la base embebida aislada.

Controles de salida, carga demo y persistencia: ver README. P12 es un script Docker separado;
no se sustituye con la prueba embebida. La imagen backend compila y exige aprobación de la
suite aislada antes de continuar; Docker debe ejecutar el build en el equipo de evaluación.

## Recuperación, límites y aportes

La actualización conserva .env, Compose personalizado, fuente y volumen. JWT_SECRET no
puede quedar como placeholder. Para cargar nuevas variables recrear contenedor, no solo restart.
No eliminar volúmenes para corregir un secreto o puerto. Procedimientos exactos en README.

Comprobación realizada: compilación TypeScript y suite de integración, conteos y huella del
archivo original, build React y auditoría npm; ver evidencias. No hay Docker/Compose disponible
aquí: build/up, prueba live, P12 y recorrido visual de React en navegador quedan por verificar.
Para despliegue público faltaría HTTPS, límite de intentos de login y usuario DB con permisos
separados de migración. El alcance entregado expone puertos únicamente en localhost.

El estudiante debe completar nombre y metadatos, explicar el código, incorporar los archivos,
verificar el entorno real, agregar acceso del catedrático y entregar URL/branch/SHA/tag.
La IA propuso e implementó código y pruebas; no sustituye esa validación ni la defensa individual.
El fallo de seccion_id demuestra que compilar no asegura integridad funcional: las pruebas
por HTTP detectaron la pérdida del campo y permitieron comprobar la corrección.
