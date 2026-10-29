# Consignas registradas en la documentación de la ampliación

Copia del registro existente en docs/IA.md de la versión de construcción. Son consignas operativas registradas por el asistente; no una transcripción literal ni ocho mensajes independientes del usuario. Su ejecución histórica individual no cuenta con exportación completa de llamadas.

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
