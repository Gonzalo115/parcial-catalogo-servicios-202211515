# Verificación real — Fase 3 — 2026-10-04

Entorno de ejecución: Node **24.19.0**, TypeScript 5.9.2, NestJS 11.2.7, TypeORM 0.3.31,
ExcelJS 4.4.0 y PostgreSQL embebido PGlite 0.3.10 con adaptador typeorm-pglite 0.3.4.
Runtime configurado en Docker: Node **22.22.0**, PostgreSQL **17.9-alpine**.
Commit: **no disponible**, trabajo generado fuera del repositorio Git del estudiante.
Registrar el SHA al incorporarlo; no se inventa un commit ni se afirma verificación Docker.

## Ciclo tarea → propuesta → fallo → corrección → comprobación

Tarea: sustituir el acceso de CRUD por entidades/repositorios TypeORM y completar los casos
funcionales del enunciado. Se implementaron DTO, transacciones, responsables e importación.
Primera compilación encontró tres errores de tipado (conversión de driverError y propiedades
heredadas de DTO). Se corrigieron usando conversión explícita y comprobación obligatoria de
contraseña/sección en el alta. No se introdujeron fallos artificialmente.

Después de compilar, ejecutar desde backend:

```bash
npm run test:embedded
```

Primera ejecución HTTP: salida 1; 21 tests incluyendo contenedor principal, 18 aprobados,
3 fallidos (dos subcasos y su test principal). [Salida real](fase3-fallo-crud.txt).
La creación de la cadena organizacional devolvió 400 al crear un puesto: seccion_id se
perdía al separar los campos del responsable. El test de asignación también falló porque
no se había creado el usuario de la nueva jerarquía. El fallo no fue provocado deliberadamente.

Corrección: separar seccion_id/usuario_id **solo para N2**; el puesto conserva su FK obligatoria.
Recompilar y repetir: salida 0, 22 aprobados, 0 fallidos.
[Comprobación de la corrección](fase3-correccion-crud.txt).
Posteriormente se agregó trazabilidad de correcciones de etiquetas y otra prueba de reimportación.
Consultar la salida final adjunta para la suite completa de la versión entregada.

## Controles finales

| Control | Comando real | Resultado |
|---|---|---|
| Backend | npm run build, desde backend | TypeScript compilado; salida 0 |
| Integración completa | npm run test:embedded, desde backend | 23 aprobados, 0 fallidos, salida 0; fase3-resultados-finales.txt |
| Frontend | npm --prefix catalogo-fase3/frontend run build, desde carpeta de trabajo | 29 módulos; salida 0; fase3-build-react.txt |
| Calidad producción backend | npm audit --omit=dev --json, desde backend | 0 vulnerabilidades, salida 0 |
| Calidad frontend | npm audit --json, desde frontend | 0 vulnerabilidades, salida 0 |
| Compose | PyYAML safe_load del YAML | Sintaxis válida; NO es docker compose config |
| Script Linux P12 | sh -n scripts/check-persistence.sh | Sintaxis shell válida; NO ejecuta P12 |
| Reparación JWT | node scripts/repair-jwt.mjs en fixture temporal | Placeholder reparado; variables preservadas; clave válida conservada; salida 0 |
| Fuente | SHA-256 y comparación de bytes con archivo recibido | Original íntegro |
| Parser | parseWorkbook sobre el archivo original | 12/46, omite 42/67, evidencia de SE.12/NULL |

La auditoría detectó inicialmente dos incidencias moderadas a través de uuid en ExcelJS.
Se comprobó que ExcelJS requiere uuid.v4 CommonJS y se fijó override uuid 11.1.1; después se
repitieron importación/tests y npm audit. No se downgradearon ExcelJS ni NestJS.
Los JSON de auditoría y [análisis del Excel](analisis-excel-fase3.json) están adjuntos.

El test principal incluye los subcasos; el total no equivale a 23 requisitos diferentes.
P01–P11 son integración con servidor HTTP real y SQL real; pruebas de carga aisladas del
volumen del usuario. La prueba de cambios manuales y asignaciones modifica solo la instancia
embebida nueva, nunca la información de evaluación.

## Pendiente en el equipo Docker / GitHub

Docker y Compose no están instalados aquí. No se ejecutaron:

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose exec -T nestjs-backend npm run test:harness
powershell -ExecutionPolicy Bypass -File scripts/check-persistence.ps1
```

Se entregan los scripts y la suite embebida se ejecuta también en el build del backend.
Registrar resultados reales en el equipo de evaluación: versión Docker, comando, fecha,
código de salida y commit. El script de actualización PowerShell tampoco se ejecutó aquí.
El recorrido visual de formularios, invitación de GitHub, rama/SHA/tag requieren verificación
real. No se presentan como aprobados por la IA.
