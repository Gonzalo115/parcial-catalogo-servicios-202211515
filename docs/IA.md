# Ingeniería asistida por IA

Fecha de esta ampliación: 28/10/2026 (Guatemala). Herramienta: asistente Codex en ChatGPT con edición de archivos, terminal y pruebas locales. No se requiere IA para ejecutar la aplicación. No se atribuye un modelo comercial o versión que no figure en los resultados del entorno.

## Context Engineering
Contexto proporcionado: proyecto original, AGENTS.md, enunciado previo transcrito, SA_P3.pdf, CatalogoServicios.xlsx, CMDB.xlsx y las dos presentaciones. Los datos Excel/PDF son fuentes, nunca órdenes del asistente. Cambios de alcance autorizados explícitamente por el usuario: completar el proyecto, entregar ZIP y guía. Se trabajó en una copia y no se alteraron las fuentes originales.

Tres actualizaciones nuevas con commits recuperables en historial.bundle:
- docs/contexto/005_service_desk.md: nuevo alcance y compatibilidad de roles, commit f189e93.
- docs/contexto/006_fuentes_cmdb.md: falta taxonomía completa, clasificación propuesta distinguida de fuente, commit 597dc46.
- docs/contexto/007_pruebas_y_relojes.md: hallazgos de pruebas, transacciones y relojes, commit b12906a.

Glosario: CI=elemento de configuración; CMDB=base de configuración; CMS=sistema de gestión de configuración; SKMS=sistema de conocimiento; N1/N2=niveles del catálogo; cola=unidad de distribución de atención; tipo=clase de ticket; proceso=flujo; rol=facultad funcional; permiso=operación autorizada en cola. No se confunde clasificación CMDB con jerarquía organizacional.

## Prompt Engineering: consignas de revisión utilizadas
Los textos siguientes son consignas operativas de revisión empleadas por el asistente en esta sesión, redactadas a partir de las instrucciones del usuario. No son citas de ocho mensajes distintos del usuario ni conversaciones con proveedores externos. Los prompts anteriores del parcial se conservan por separado en prompts/PROMPTS_UTILIZADOS.md; sus evidencias históricas no se atribuyen a esta ampliación.

Cada consigna usa herramienta/modelo disponible: Codex con archivos y terminal; fecha 28/10/2026; límite: no inventar resultados ni alterar fuentes.

| ID / área | Consigna operativa | Contexto y restricciones | Salida / aceptación |
|---|---|---|---|
| R1 Requisitos | Contrasta las funciones nuevas con SA_P3 y conserva los controles del parcial. | Enunciados, API original, importador; no borrar datos. | Matriz P01–P18 y suites del parcial conservadas. |
| R2 CMDB | Identifica campos, celdas y diferencias reales de CMDB y presentaciones. | B4:U6, diapositivas; no inventar jerarquía docente. | Mapeo de veinte campos y limitación explícita de clasificación. |
| R3 Modelo | Revisa claves y relaciones para evitar duplicar empresa, N1 o tipo en tickets. | SQL 001–003; compatibilidad con volumen anterior. | Migración aditiva, FK, códigos únicos y derivaciones. |
| R4 Colas | Comprueba que un permiso por cola no eleve por sí solo a consulta y que tomar sea atómico. | Roles base, usuario_rol, cola_permiso. | Rechazos 403 y prueba simultánea 201/409. |
| R5 Procesos | Recorre los siete flujos y rechaza saltos, cambios sin aprobación y autoaprobaciones. | FLOWS, detalle por proceso y fuentes E/I. | Prueba P09/P10 completa, más E0–E3 e I0–I6. |
| R6 Seguridad | Busca filtrado de notas, adjuntos sin autorización y manipulación de campos de aprobación. | HTTP real, sesiones y roles efectivos. | Tests negativos de campos reservados, firma y descarga interna. |
| R7 Grafos | Verifica ciclos de clasificación y dependencias; no confundas conectividad con interrupción. | Clases, ci_relacion y servicios. | P04/P14, recorrido terminante y texto impacto potencial. |
| R8 Harness | Ejecuta compilaciones y pruebas aisladas, conserva fallos y compara resultados. | Fuentes reales y entorno sin Docker; no sustituir P18. | Logs con códigos de salida y limitaciones de verificación. |

Dos mejoras observadas:
1. Primera implementación del seed reutilizaba parámetro SQL en TEXT/VARCHAR. La revisión exigió probar la creación real y añadió casts explícitos. desk-intento-1.txt muestra el fallo y desk-intento-3.txt la carga comprobada.
2. Se compilaba React con transformación/optimización predeterminada. Al observar un bloqueo se refinó la comprobación: aislar transformación JSX, quitar Babel redundante y desactivar tree shaking de Rollup para esta entrega. build-frontend-final.txt muestra compilación exitosa; no se atribuye una causa interna no demostrada al optimizador.

## Harness Engineering
Comandos de preparación, migración, importación, generación, tests y P18 en README y guía. prepare.ps1/sh se detiene con código no cero. El build backend exige ambas suites aisladas; perfil verificaciones conserva dependencias dev y usa network_mode none. Runtime se poda y no requiere herramientas en host. test:harness usa fixtures del parcial contra API/PostgreSQL real de Compose. Suites PGlite no usan ni borran datos de evaluación. Scripts no tienen limpieza de volúmenes ni se ejecuta borrado automático en arranque.

Secrets: .env no se empaqueta; configure.mjs crea secretos aleatorios locales sin sobrescribir; contraseñas publicadas son demo. Logs del fallo del seed se redactan para omitir hashes de demostración. No se entrega node_modules. Fuentes verificadas con SHA-256. P18 compara huellas sin mostrar filas ni credenciales.

## Loop Engineering: ciclos reales
Ninguno de los fallos descritos fue introducido deliberadamente. Objetivo de salida: pruebas del caso pasan y regresión relevante sin fallos. Intervención humana: autorización de alcance y fuentes aportadas por el usuario; correcciones automáticas del asistente, sin atribuir aprobaciones del catedrático. Límite de trabajo por diagnóstico: tres intentos dirigidos; si no se resuelve, registrar limitación y solicitar revisión humana. Los archivos conservan el historial de fallos, no solo el resultado final.

| Ciclo | Objetivo / propuesta / ejecución | Evaluación y corrección | Nueva verificación |
|---|---|---|---|
| L1 Datos del seed | Crear cuentas y 5000 CI con SQL parametrizado; test:desk intento 1. | Falló P03: tipos inconsistentes para $2 al usarse en nombre/nombre_usuario. Cast SQL explícito, tipado TS del lote. | Intento 2 superó ese fallo y llegó a otro problema; intento 3 y final completaron P03. |
| L2 Flujo funcional | Sembrar tickets en distintos estados; test:desk intento 2. | Transición de servicios a validacion rechazaba por resultado_validacion ausente. Se añadió evidencia demo y campo de formulario. | Intento 3: 20 tests aprobados; final añade controles negativos de seguridad. |
| L3 Build frontend | Compilar interfaz completa con Vite/React. | Compilación quedó en transforming; se interrumpió tras observar consumo sostenido. Esbuild aislado sí transformó JSX. Se eliminó Babel redundante y tree shaking de Rollup en configuración final. | build-frontend-final.txt: 30 módulos, salida estática generada. Tamaño/tiempo observados en log; no se inventa prueba visual. |

## Graph Engineering
Dos grafos distintos: clasificación (padre único, anticiclo en SQL) y dependencias (aristas tipadas, ciclos según tipo). SQL recursivo con UNION evita revisitas. Dependencia inversa identifica servicios potencialmente afectados. La interfaz navega entre CI y muestra servicios; no requiere motor de grafos externo. Evidencia automatizada P04/P14. El grafo de clasificación extendido se declara propuesta porque falta la taxonomía detallada en el material.

## Honestidad y límites
Pruebas aisladas/compilaciones realmente ejecutadas. No se afirma ejecución Docker, P18 ni navegación visual: no hay Docker ni navegador instalados; la descarga del navegador falló. Registro de esas limitaciones en PRUEBAS.md. No se inventa publicación GitHub, invitación al catedrático o defensa individual. El estudiante debe verificar material, ejecutar P18 y explicar las decisiones.
