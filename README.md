# Catálogo de servicios TI

Aplicación con NestJS, TypeORM, PostgreSQL y React. Incluye organización y usuarios,
CRUD de catálogos, búsqueda, filtros, ficha, responsabilidades e importación auditada
con ExcelJS. Autenticación local, dos roles, JWT y cierre de sesión revocable.

Integrante: completar nombre. Carné: **202211515** (tomado del nombre del repositorio;
verificar antes de entregar). Fuente y criterios: [enunciado](docs/ENUNCIADO.md).

## Clon limpio: preparación local reproducible

Requisito: Docker Desktop/Engine y Compose v2.20 o posterior. No requiere Node ni PostgreSQL
instalados en el anfitrión. Desde la raíz del proyecto, PowerShell:

```powershell
docker run --rm --mount "type=bind,source=$((Get-Location).Path),target=/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
```

Linux, solamente para preparar `.env`:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
```

Genera secretos aleatorios locales y se niega a sobrescribir `.env`. Si ya existe, conservarlo.
No dejar `replace-with-...` en las variables: JWT_SECRET debe tener al menos 32 bytes,
contraseñas demo de 12 caracteres y no más de 72 bytes UTF-8. No publicar `.env`.
Cambiar POSTGRES_PASSWORD en `.env` no cambia la contraseña de un volumen ya inicializado.

En Windows se documentó un conflicto con el puerto 3000. Este ejemplo configura
`BACKEND_PORT=3100`; para un `.env` anterior, cambiar exclusivamente esa variable si el puerto
3000 está ocupado o reservado. NestJS continúa escuchando en 3000 **dentro** del contenedor.
Si tu Compose ya eliminó la publicación de la API, la interfaz sigue accediendo por Nginx.

## Levantar, cargar y comprobar

```powershell
# Valida la configuración de Compose y las variables requeridas.
# No muestra la configuración completa; informa si encuentra errores.
docker compose config --quiet

# Construye las imágenes y levanta PostgreSQL, backend y frontend
# en segundo plano. Conserva los datos del volumen existente.
docker compose up --build -d

# Espera hasta que los servicios estén listos según sus healthchecks.
# Devuelve un error si no están listos en un máximo de 120 segundos.
docker compose up -d --wait --wait-timeout 120

# Crea la jerarquía organizacional DEMO y las cuentas admin y consulta.
# Usa las contraseñas de .env; conserva las cuentas existentes.
docker compose exec -T nestjs-backend npm run seed:demo

# Importa CatalogoServicios.xlsx: procesa los 12 códigos N1 y 46 N2,
# registra incidencias y devuelve un resumen de la carga.
docker compose exec -T nestjs-backend npm run import:excel

# Crea tres asignaciones de demostración entre servicios, sección y usuario.
# Requiere las cuentas demo y el catálogo; conserva asignaciones existentes.
docker compose exec -T nestjs-backend npm run seed:asignaciones

# Repite la importación para comprobar que no genera duplicados.
# Conserva correcciones manuales y responsables; registra otro lote de auditoría.
docker compose exec -T nestjs-backend npm run import:excel

# Ejecuta pruebas contra la API y PostgreSQL de Docker:
# autenticación, roles, jerarquía, validaciones, filtros y responsables.
# Crea y limpia sus propios datos de prueba.
docker compose exec -T nestjs-backend npm run test:harness

# Muestra el estado, la salud y los puertos de los contenedores.
docker compose ps

# Muestra las últimas 100 líneas de logs del backend
# para revisar su arranque, las importaciones o posibles errores.
docker compose logs --tail=100 nestjs-backend
```

El build del backend compila TypeScript y ejecuta la suite aislada de integración con el
Excel original. Un fallo impide producir la imagen. Al iniciar, el backend aplica las
migraciones pendientes antes de escuchar. PostgreSQL inicializa la base y la migración 001
solo sobre un volumen vacío; la 002 se aplica también a volúmenes existentes.

Web: **http://localhost:8080** (o FRONTEND_PORT). API publicada: http://localhost:3100/api
(o BACKEND_PORT); el navegador usa `/api` en el mismo origen de la web.

| Usuario  | Correo              | Contraseña       |
| -------- | ------------------- | ---------------- |
| admin    | admin@demo.local    | SA_admin_2026    |
| consulta | consulta@demo.local | SA_consulta_2026 |

## Recorrido funcional

1. Ingresar como administrador e importar el Excel (botón o comando anterior).
2. Revisar 12 códigos N1 y 46 N2; reporte con filas 42/67 omitidas, conflicto SE.12 y ausencias.
3. Crear o editar empresas, áreas, departamentos, secciones, puestos y usuarios en sus módulos.
4. Mantener clases, criticidades, tipos y ambos niveles; las bajas son lógicas.
5. Buscar código/nombre y combinar filtros por N1, estado, clase, criticidad y tipo.
6. Abrir la ficha para consultar los atributos y el padre del servicio.
7. Editar N2 y seleccionar sección; el usuario opcional se filtra a esa sección.
   Al crear manualmente un N2 la sección es obligatoria. Un importado puede quedar pendiente.
8. Ingresar con consulta: lectura de datos funcionales, sin escrituras ni administración de usuarios.
9. Repetir la importación: sin duplicados; conservar cambios manuales y responsables.

Si una baja se rechaza, resolver descendientes activos o asignaciones primero. Para retirar
un responsable, desactivar el servicio y usar el botón correspondiente; después reasignar
si corresponde. No se elimina información en cascada.

## Pruebas

P01–P11: suite aislada con TypeORM y PostgreSQL embebido, SQL real y peticiones HTTP a NestJS.
Se ejecuta automáticamente durante el build; manualmente, sin herramientas host adicionales:

```powershell
docker compose build nestjs-backend
```

El harness contra la API y PostgreSQL del contenedor usa datos propios identificados por un
prefijo aleatorio y elimina exclusivamente sus fixtures. Nunca borra el esquema ni los datos
de evaluación. Ejecutar después de esperar que el backend esté healthy:

```powershell
docker compose exec -T nestjs-backend npm run test:harness
```

P12: comparar huellas de usuarios, ambos niveles y responsables antes/después de reiniciar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/check-persistence.ps1
```

Linux: `sh scripts/check-persistence.sh`. Si personalizas DB, usar `-DbUser/-DbName` en
PowerShell, o usuario y base como dos argumentos en Linux. Requiere cuentas y catálogo cargados.
No imprime contraseñas, hashes de usuarios ni contenido de filas. Salida 0=éxito; otro código=fallo.

## Logs, apagado y recuperación

```powershell
docker compose logs --tail=100 postgres nestjs-backend
docker compose down --remove-orphans
docker compose up -d --wait --wait-timeout 120
```

El apagado anterior conserva el volumen. Si el backend reinicia, leer el error inicial en sus
logs: `Configura JWT_SECRET` requiere corregir el valor local y **recrear** el contenedor con
`docker compose up -d --force-recreate nestjs-backend`. Reiniciar no recarga variables.

Reinicio destructivo, exclusivamente si todos los datos son descartables:

```powershell
docker compose down --volumes --remove-orphans
```

## Documentación y entrega

- [Resolución y matriz](docs/RESOLUCION.md)
- [API](docs/API.md)
- [modelo/diccionario](docs/MODELO.md)
- [contexto](AGENTS.md)
- [prompts utilizados](docs/prompts/PROMPTS_UTILIZADOS.md)
- [evidencias](docs/evidencias/VERIFICACION_FASE3.md)
