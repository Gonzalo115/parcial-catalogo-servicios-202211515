# Prompts realmente utilizados — extractos seleccionados

Fuente: mensajes del estudiante en esta conversación. Fecha de trabajo: 2026-10-04.
Herramienta: ChatGPT/Codex. Modelo declarado por el entorno actual: GPT-6, Codex;
identificador exacto de versión/build no expuesto. No se atribuye un modelo confirmado a
fases anteriores si su interfaz no lo muestra. Los extractos no son nuevos prompts presentados como históricos.
Los números identifican mensajes o solicitudes reales, no cinco repeticiones de un mismo texto.

## 1. Planificación y análisis (Fase 1)

```bash
Actúa como un Arquitecto de Software Senior y un Experto en Análisis de Datos.

OBJETIVO:
Tu objetivo es ayudarme a resolver la "Fase 1: Planificación y Análisis" de un proyecto universitario llamado "Sistema de gestión del catálogo de servicios de TI". No debes generar código de programación en esta etapa, solo análisis estratégico, diseño de base de datos y la creación del contexto inicial para la IA.

CONTEXTO DEL PROYECTO:
- Se debe sistematizar un archivo Excel (`CatalogoServicios.xlsx`) en una aplicación web con base de datos PostgreSQL.
- El Excel contiene un catálogo de servicios en la hoja "Servicios Externos". Hay 12 códigos de Nivel 1 y 46 códigos de Nivel 2.
- Campos del Excel: COD.N1, SERVICIO - Nivel 1, COD.N2, SERVICIO - Nivel 2, ACTIVO, CLASE DE SERVICIO, CRITICIDAD, TIPO DE SERVICIO, Descripción, Métrica, Minimo, Maximo.
- Estructura organizacional a modelar: Empresa → Área → Departamento → Sección → Puesto → Usuario.
- Autenticación: Local con contraseña hasheada (roles: administrador y consulta).

RESTRICCIONES Y REGLAS DE NEGOCIO IMPORTANTES:
1. Sobre el Excel: Existen celdas combinadas (se debe recuperar el valor de la celda principal).
2. Conflicto SE.12: En las filas 99 y 100 hay dos nombres distintos ("Suministrar Analitica" y "Mantener Tableros de Control") para el mismo código SE.12. Debemos definir una regla para elegir un nombre canónico sin crear registros duplicados.
3. Datos ausentes: Las filas 99 a 101 tienen campos vacíos. No se deben inventar datos (como clase o criticidad) ni asumir que un servicio está activo o que su valor es cero si no existe.
4. Organización: Cada registro de la jerarquía organizacional tendrá un único padre. No se permiten registros huérfanos.
5. Los servicios de nivel 2 se deben relacionar con una "Sección" responsable y opcionalmente con un "Usuario" de esa sección.

FORMATO DE SALIDA ESPERADO:
Por favor, entrégame tu respuesta estructurada estrictamente en las siguientes 3 secciones utilizando Markdown:

### 1. Estrategia de Análisis del Excel
Redacta las reglas lógicas paso a paso que deberá seguir el futuro script de importación para resolver:
- El tratamiento de celdas combinadas.
- La resolución justificada del conflicto del código `SE.12`.
- El manejo de los atributos incompletos (filas 99 a 101).

### 2. Diseño de Base de Datos (Diccionario de Datos)
Crea tablas en formato Markdown que representen el modelo Entidad-Relación. Debes incluir:
- Entidades organizacionales (Empresa, Área, Departamento, Sección, Puesto, Usuario).
- Entidades del catálogo (Nivel 1, Nivel 2, Clase, Criticidad, Tipo).
- Indica para cada tabla: Nombre del Campo, Tipo de Dato, Llave (PK/FK), y si es Obligatorio/Nulo.

### 3. Borrador inicial de AGENTS.md (Context Engineering)
Redacta el contenido inicial de un archivo `AGENTS.md`. Este archivo servirá para darle contexto a futuras IAs que programen el proyecto. Debe incluir:
- Objetivo y alcance del proyecto.
- Convenciones de desarrollo (PostgreSQL, Docker, validaciones del lado del servidor).
- Límite de operaciones (ej. no alterar el Excel original, no inventar datos).
```

## 2. Entorno y autenticación (Fase 2)

```bash
Actúa como un Ingeniero DevOps Senior y Desarrollador Full-Stack experto en NestJS y React.

OBJETIVO:
Tu objetivo es ayudarme a desarrollar la "Fase 2: Entorno y Harness Engineering" de mi proyecto universitario (Sistema de gestión del catálogo de servicios de TI). Necesito que diseñes la orquestación con Docker, la inicialización automatizada de la base de datos y la arquitectura base del backend enfocada en autenticación.

CONTEXTO Y STACK TECNOLÓGICO:
- Backend: NestJS (JavaScript/TypeScript).
- Frontend: React (JavaScript).
- Base de Datos: PostgreSQL.
- Infraestructura: Docker y Docker Compose.

RESTRICCIONES Y REQUISITOS DEL SISTEMA:
1. Docker y Reproducibilidad: Todo el sistema debe levantarse con `docker compose up --build -d`. Se deben crear contenedores para el backend, frontend y la base de datos.
2. Inicialización de DB: PostgreSQL debe inicializarse automáticamente al levantar el contenedor (creando la base de datos, el esquema y las tablas iniciales) utilizando scripts de inicialización, y los datos deben persistir usando volúmenes.
3. Autenticación Local: El backend en NestJS debe implementar inicio de sesión local (usuario/correo y contraseña). NO usar proveedores externos (Google, GitHub, etc.).
4. Seguridad: Las contraseñas deben almacenarse usando un algoritmo de hash especializado con sal (ej. bcrypt o argon2).
5. Autorización y Tokens: El login debe devolver un token de autorización (JWT). Las rutas del backend deben estar protegidas, permitiendo el acceso solo mediante este token. Deben existir roles claros (administrador y consulta).

FORMATO DE SALIDA ESPERADO:
Por favor, responde estructurando la solución en las siguientes 3 secciones usando Markdown:

### 1. Orquestación con Docker (Harness Engineering)
Proporciona el código completo para:
- `docker-compose.yml` (que incluya los servicios de postgres, nestjs-backend y react-frontend, manejando volúmenes, redes y la inicialización automática de scripts SQL).
- Un ejemplo de `Dockerfile` para el backend en NestJS.
- Un ejemplo de `Dockerfile` para el frontend en React.

### 2. Arquitectura de Autenticación en NestJS
Explica paso a paso cómo estructurar el módulo de autenticación en NestJS para cumplir con los requisitos. Proporciona fragmentos de código clave para:
- El guard (Guardia) que verificará el token JWT en las rutas protegidas.
- La función de login que genera el JWT.
- La función para hashear la contraseña antes de guardarla en la base de datos.

### 3. Comandos de Ejecución (Harness)
Lista los comandos exactos que un evaluador debe ejecutar en la terminal para:
- Levantar todo el entorno desde cero.
- Verificar los logs del backend.
- Destruir el entorno sin dejar contenedores huérfanos.
```

## 3. Diagnóstico de configuración del evaluador

**Extracto real:** `docker compose config --quiet` →
`required variable POSTGRES_DB is missing a value: Configura POSTGRES_DB`.
Contexto suministrado: PowerShell, carpeta del proyecto y error exacto.
Objetivo implícito: resolver la variable que impide validar el entorno.
Restricción: no borrar datos ni publicar secretos. Salida necesaria: configuración local
reproducible antes de iniciar. Aceptación: Compose valida sin error.
Resultado observado en un mensaje posterior del estudiante: `docker compose config --quiet`
termina y vuelve al prompt sin error. Esto verifica configuración, no el arranque completo.

## 4. Refinamiento con puerto y reinicio

**Extracto real:** «ports are not available […] 127.0.0.1:3000 […] bind […] forbidden»;
posteriormente «nestjs-backend […] Restarting (1)» y el seed no puede ejecutarse.
Contexto: estados reales de los contenedores. Objetivo: distinguir conflicto del puerto de
fallo interno del servidor. Restricción: conservar volumen, no ejecutar seed en servicio caído.
Salida: puerto host configurable y petición de logs del backend. Aceptación: identificar el
error inicial y levantar antes del seed. Resultado: el siguiente prompt aporta logs precisos;
no se cuenta el mero estado starting como éxito.

## 5. Diagnóstico de JWT con evidencia

**Extracto real:** logs con `Error: Configura JWT_SECRET` y comando migrate con
`Migraciones al día`.
Contexto: stack trace de jwtSecret y resultado real de la migración.
Objetivo: separar DB lista de configuración de autenticación inválida.
Restricciones: generar secreto aleatorio local, no mostrarlo ni borrar volumen.
Salida: corregir `.env` y recrear el contenedor para cargar variables.
Aceptación: deja de reiniciar y funciona login. Resultado conocido: causa identificada;
no hay mensaje posterior que confirme arranque Docker exitoso. Queda pendiente esa evidencia.

## 6. Revisión de avances

**Extracto real:** «hasta el momento que se ha hecho osea cuales funcionalidades se completaron?».
Contexto: estado de Fase 2 y errores anteriores.
Objetivo: separar infraestructura/autenticación de funcionalidades todavía pendientes.
Restricción: no presentar diseño o tablas como CRUD terminado. Salida: estado verificable.
Aceptación: señalar importación, CRUD, filtros y responsables pendientes en Fase 2.
Resultado: orienta la cobertura completa y la matriz actualizada de Fase 3.

## 7. Backend, TypeORM e importación (Fase 3)

```bash
Actúa como un Desarrollador Backend Senior experto en NestJS, TypeORM y PostgreSQL, especializado en procesamiento de datos.

OBJETIVO:
Desarrollar la "Fase 3: Desarrollo Backend e Importación" de mi proyecto (Catálogo de Servicios TI). Debes generar el código de las entidades TypeORM, los controladores (CRUDs) y el servicio de importación del Excel, cumpliendo con estrictas reglas de negocio.

CONTEXTO TECNOLÓGICO:
- Framework: NestJS.
- Base de Datos: PostgreSQL gestionada a través de TypeORM.
- Autenticación: Ya existe un JWT Guard. Usa decoradores ficticios como `@UseGuards(JwtAuthGuard)` y `@Roles('admin')`.
- Archivo base: `CatalogoServicios.xlsx` (Hoja: "Servicios Externos"). Contiene 12 códigos de nivel 1 y 46 códigos de nivel 2.

REQUISITOS Y CASOS DE USO A CUBRIR (CRÍTICOS):
1. Modelo de Datos (TypeORM):
   - Estructura Organizacional: Empresa → Área → Departamento → Sección → Puesto → Usuario. Cada hijo tiene un único padre.
   - Catálogos: Clase, Criticidad, Tipo, Servicio Nivel 1, Servicio Nivel 2.
   - Relaciones: Todo Servicio Nivel 2 pertenece a un Servicio Nivel 1. Además, cada Servicio Nivel 2 se relaciona obligatoriamente con una "Sección" responsable y opcionalmente con un "Usuario" de esa sección.

2. Validaciones (class-validator):
   - En el Nivel 2, si existen los campos `minimo` y `maximo`, validar estrictamente que `minimo <= maximo`. Un dato ausente no debe convertirse en cero.

3. Importador del Excel (Lógica estricta usando `exceljs` o `xlsx`):
   - Celdas combinadas: El script debe recuperar el valor de la celda principal y aplicarlo al resto del rango.
   - Conflicto SE.12: En las filas 99 y 100 hay dos nombres distintos ("Suministrar Analitica" y "Mantener Tableros de Control") para el mismo código. Elige un nombre canónico, guarda evidencia de ambos y emite una observación en el log, SIN crear registros duplicados.
   - Atributos incompletos (filas 99-101): Importarlos con valores nulos o desconocidos; NO inventar clase, criticidad o tipo.
   - Idempotencia: El importador debe poder ejecutarse repetidas veces sin duplicar la información en PostgreSQL.
   - Reporte: El endpoint debe devolver un resumen JSON con registros creados, omitidos y observaciones.

FORMATO DE SALIDA ESPERADO:
Entrégame el código organizado en las siguientes secciones en Markdown:

### 1. Entidades TypeORM Clave
Proporciona el código de las entidades de TypeORM principales (ej. `ServicioNivel1`, `ServicioNivel2` y `Seccion`), mostrando cómo se configuran las relaciones (OneToMany, ManyToOne) y las validaciones.

### 2. Servicio de Importación (ExcelParserService)
Escribe el `Service` de NestJS que implemente la lectura del Excel y resuelva lógicamente las celdas combinadas, el conflicto SE.12 y la inserción idempotente.

### 3. Controladores (Endpoints)
Escribe el código del `Controller` que incluya:
- `POST /api/import` (Solo Admin) para iniciar la carga.
- `GET /api/servicios` con soporte para filtros por Nivel 1, estado, clase y búsqueda por código/nombre.
- `POST /api/servicios` mostrando cómo se aplica la validación del DTO para `minimo <= maximo`.
```

## Iteraciones de mejora con comprobación

**Iteración A (2 → 3):** una solicitud general de entorno se vuelve concreta al aportar el
fallo de interpolación POSTGRES_DB. El criterio revisado exige preparar variables antes de
levantar. La salida real posterior del estudiante confirma que `config --quiet` ya pasa.
El resultado no demuestra inicio del backend; el siguiente error mostró una condición adicional.

**Iteración B (1/2 → 7):** pasar de reglas de importación y un harness de autenticación a
un prompt de implementación que especifica TypeORM, class-validator, idempotencia, reporte
y cobertura del enunciado. El criterio revisado ya exige CRUD por HTTP, responsables y
preservación al reimportar. Los controles reales detectaron pérdida de seccion_id en puestos;
se corrigió el tratamiento por recurso y la nueva suite pasó. Se registra ese ciclo en
`docs/evidencias/VERIFICACION_FASE3.md`, con las salidas fallida y satisfactoria.

Los diagnósticos 4/5 añaden contexto útil, pero no se presentan como una iteración Docker
resuelta: falta la comprobación final en el equipo del estudiante. Si la evaluación exige
un formato diferente de los prompts, adaptar estos extractos fielmente, nunca inventar uso.
