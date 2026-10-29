> **Actualización de permisos y diseño:** ver [docs/PARCHE_PORTAL_SOLICITANTE.md](docs/PARCHE_PORTAL_SOLICITANTE.md). Los solicitantes ya no tienen acceso al inventario completo, organización ni indicadores. Las indicaciones antiguas de lectura amplia quedan sustituidas por esa política. Cuenta adicional: solicitante2.

# Guía de ejecución y funcionalidades

## 1. Qué realiza el sistema

El sistema conserva el catálogo de servicios del parcial y su estructura Empresa → Área → Departamento → Sección → Puesto → Usuario. Añade un Service Desk para recibir y atender solicitudes, gestionar aprobaciones, relacionar incidentes/problemas/cambios, consultar dispositivos y explorar dependencias.

Dos espacios en la interfaz: **Service Desk** y **Catálogo y organización**. En Service Desk: Tickets, CMDB, Indicadores, Autoservicio y, para administrador, Colas y permisos, Roles, Clasificación y ubicaciones.

## 2. Preparación en Windows

1. Inicie Docker Desktop y espere a que el motor esté listo. Extraiga el ZIP en una carpeta local y abra PowerShell en `service-desk`.
2. Genere su configuración local (una sola vez):

```powershell
docker run --rm --mount "type=bind,source=$((Get-Location).Path),target=/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
```

3. Construya, levante y cargue datos:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/prepare.ps1
```

El build compila y ejecuta pruebas aisladas; la primera vez puede tardar varios minutos por descarga de imágenes y dependencias. El script se detiene si falla un paso.

Para Linux/macOS:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/work" -w /work node:22.22.0-alpine node scripts/configure.mjs
sh scripts/prepare.sh
```

Abra http://localhost:8080. No abra el frontend como archivo HTML ni use el puerto PostgreSQL.

### Pasos equivalentes individuales

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose up -d --wait --wait-timeout 180
docker compose exec -T nestjs-backend npm run seed:demo
docker compose exec -T nestjs-backend npm run import:excel
docker compose exec -T nestjs-backend npm run seed:asignaciones
docker compose exec -T nestjs-backend npm run seed:desk
docker compose ps
```

Resultado: catálogo 12/46 (más servicios manuales si los crea), tres responsables de catálogo demo, seis cuentas, ocho colas (una por proceso y otra de incidentes nivel 2), 5,000 dispositivos generados más los dos ejemplos del Excel. Hay 37 tickets principales de demostración; los eventos E2/E3 generan dos incidentes adicionales. Los tickets están en diferentes estados, con al menos un recorrido cerrado de cada proceso. Son datos DEMO nuevos, no datos extraídos del catálogo original.

Los seeds pueden repetirse sin duplicar sus identidades. Conservan modificaciones manuales. No regeneran automáticamente al arrancar la aplicación.

## 3. Si ya tiene la versión anterior

Antes de actualizar, respalde su carpeta y su base:

```powershell
# Exportación lógica completa; conserve el archivo en una ubicación privada.
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > respaldo.sql
```

Use la misma carpeta/proyecto Compose y el mismo volumen si desea conservar sus datos. Copie los archivos nuevos sin sobrescribir `.env`, ni `data/CatalogoServicios.xlsx`. Agregue a `.env` las variables nuevas:

```dotenv
DEMO_DESK_PASSWORD=SA_desk_2026_demo
CMDB_SEED=202211515
CMDB_COUNT=5000
```

Ejecute prepare. La migración 003 agrega tablas, sin borrar las anteriores. Si extrae el proyecto en otra carpeta, Compose puede crear otro volumen por tener otro nombre de proyecto; eso no significa que el anterior se haya perdido. No utilice `down --volumes` para resolverlo.

## 4. Cuentas y alcance de cada una

| Usuario | Contraseña demo | Qué probar |
|---|---|---|
| admin | SA_admin_2026 | Configuración, catálogo, usuarios, organización, CMDB, colas, roles y supervisión |
| consulta | SA_consulta_2026 | Consultar sin crear, aprobar ni atender |
| solicitante | SA_desk_2026_demo | Crear y consultar casos propios; comentarios, adjuntos y reapertura |
| agente1 | SA_desk_2026_demo | Tomar, atender, transferir y escalar tickets de sus colas |
| agente2 | SA_desk_2026_demo | Segundo agente para pruebas de concurrencia |
| aprobador | SA_desk_2026_demo | Aprobar/rechazar solicitudes con justificación |

Todos usan correo `usuario@demo.local`. Cierre sesión antes de cambiar de perfil; para simultaneidad use ventanas privadas o dos navegadores. Las sesiones duran 15 minutos. Al cambiar roles, cierre e ingrese para actualizar los botones; los permisos del servidor cambian inmediatamente.

## 5. Primer recorrido: catálogo y organización

Con admin, abra Catálogo y organización. Revise N1 y N2, ficha, filtros y responsables. Use Importar Excel y repita: no deben duplicarse servicios ni perderse asignaciones. Los tres servicios SE.12.* conservan atributos desconocidos. Revise empresas, áreas, departamentos, secciones, puestos y usuarios. Desactivar una unidad con dependencias activas debe rechazarse.

Con consulta, compruebe lectura sin botones de mantenimiento; no debe acceder a administración de usuarios.

## 6. Primer ticket como solicitante

1. Ingrese como solicitante y abra Tickets → Nuevo ticket.
2. Seleccione servicio N2 y cola. La cola determina el proceso y el tipo; N1 se deriva del servicio.
3. Complete título, descripción, prioridad, impacto, urgencia y canal.
4. Seleccione CI afectados usando búsqueda (Ctrl permite varios). Si no aplica CI, escriba la justificación.
5. Complete los datos particulares del proceso y cree el ticket.
6. Anote su número. Agregue un comentario y un TXT/PDF/imagen de prueba, sin secretos. Máximo 2 MiB.

El solicitante ve sus casos; no puede tomar tickets ni ver notas internas. Puede consultar CMDB y FAQ como datos funcionales.

## 7. Atención como agente

1. Ingrese como agente1, encuentre el número creado y abra la ficha.
2. Pulse Tomar ticket. Si otro agente ya lo tomó, debe aparecer un conflicto.
3. Complete los datos del proceso. Guárdelos y use Avanzar a… en orden.
4. Agregue una nota interna. Confirme con solicitante que no aparece.
5. Para pausar, escriba motivo y pulse Pausar; luego Retomar.
6. Para transferir, seleccione cola del mismo proceso, agente opcional y motivo. Para escalar, use una cola de nivel superior. La demo incluye Incidentes N1 y N2.
7. Antes de pasar a resuelto, escriba la resolución y las evidencias específicas. Luego avance a cerrado.
8. Solicitante puede reabrir un cerrado con motivo; conserva el historial anterior.

La ficha muestra actor, fechas, estados y valores anteriores/nuevos en la bitácora.

## 8. Cómo probar cada proceso

| Proceso | Datos y pasos que debe demostrar |
|---|---|
| Incidentes | Categoría I0–I6, afectación, redundancia y duración cuando se conozca. Categoría I1 con prioridad media, sin redundancia y duración ≤3 h es un ejemplo válido. Si se aparta del mapeo, justifique. Avance a recuperación, registre solución aplicada, resolución y cierre. |
| Servicios | Validación de solicitud, asignación, cumplimiento, evidencia de entrega, confirmación y cierre. Es sobre un servicio existente. |
| Accesos | Beneficiario, recurso, permiso y provisión/revocación. Agente valida; aprobador aprueba con motivo; agente registra evidencia y validación. El solicitante no puede aprobarse, aunque reciba rol aprobador. |
| Cambios | Seleccione CI desde el alta. Complete impacto, riesgo, plan de pruebas y reversión antes de aprobación. Luego planificación, ejecución, resultado de validación, resolución y cierre. Intentar saltar a ejecución debe rechazarse. |
| Nuevos servicios | El servicio del ticket es el receptor o referencia. Complete necesidad y viabilidad. Tras aprobar, seleccione un servicio existente para vincular o indique código/nombre propuestos, N1 y sección para crearlo. No complete ambas alternativas por accidente: el servicio vinculado tiene precedencia. No duplica un código existente incompatible. |
| Eventos | E0/E1 documentan evaluación sin incidente automático. E2/E3, al avanzar a respuesta, crean o vinculan incidente y muestran notificación en ficha. Reabrir/reprocesar conserva el incidente vinculado. |
| Problemas | Cree un incidente o use uno existente. Vincúlelo desde Tickets relacionados antes de investigación. Complete causa raíz, solución temporal, error conocido si aplica y solución definitiva. Vincule también el cambio correctivo mediante relación corrige. |

Para aprobar: cierre agente, ingrese aprobador, abra el mismo número y avance a aprobado o rechace con motivo. Luego vuelva al agente. Las transiciones inválidas se rechazan en servidor, aunque se intente llamar directamente a la API.

## 9. CMDB

Abra CMDB y compruebe 5,002 elementos: 5,000 sintéticos y dos ejemplos originales (uno software). El conteo de dispositivos físicos es 5,001; el requisito se satisface con los 5,000 generados, sin contar catálogos ni relaciones.

- Busque `SYN-202211515` y navegue páginas. Combine clasificación, ubicación, responsable y estado.
- Abra una ficha: clasificación completa, atributos, servicios, tickets y trazabilidad de origen cuando exista.
- Relaciones técnicas permite navegar con botones origen/destino. En la ficha se muestra el ID para vincular otro CI.
- El recorrido lista dependientes y servicios potencialmente afectados. No confirma una interrupción efectiva.
- Con admin, cree/edite CI y asociaciones a servicios. Atributos técnicos se mantienen como objeto JSON para admitir campos propios de cada clase; ejemplo: `{"numero_serie":"DEMO-1","ram_gb":16}`. No es obligatoria una IP.
- Hardware y Software provienen del Excel; Servidores, Estaciones y Redes son clasificación adicional propuesta. Manténgala desde Clasificación y ubicaciones. Ciclos y padres inexistentes se rechazan.
- Depende de / alojado en prohíben ciclos en su grafo conjunto. Conectado a permite ciclos técnicos; no crea ciclos en clasificación.

Para repetir generación con la misma semilla:

```powershell
docker compose exec -T nestjs-backend npm run generate:cmdb
```

Para otro conjunto, explícitamente:

```powershell
docker compose exec -T -e CMDB_SEED=otra_semilla -e CMDB_COUNT=5000 nestjs-backend npm run generate:cmdb
```

Otra semilla añade otro conjunto; no borra el anterior. Repetir semilla conserva registros y correcciones. El arranque normal nunca elimina datos de prueba.

## 10. Configuración e indicadores

Admin puede crear/editar/desactivar colas y conceder permisos a usuarios o roles. Cada cola tiene un proceso, nivel 0–4, responsable, orden y objetivos en minutos. Desactivar una con casos abiertos se rechaza: transfiera antes. La demo usa roles agente/aprobador para todas sus colas; quite un acceso para probar denegación. Un permiso de cola por sí solo no convierte consulta en agente.

Autoservicio permite consultar FAQ; admin crea/edita artículos. Roles permite asignar varios perfiles a la misma cuenta. Los usuarios nuevos se crean primero en Catálogo y organización y después se les asignan roles.

Indicadores muestra conteos por cola/proceso/prioridad/estado y tiempos por ticket, incluyendo pendientes y vencidos abiertos. Tiempo calendario 24x7. Resolución descuenta pausas; primera atención conserva tiempo desde creación. Reaperturas mantienen creación y primer contacto; eliminan resolución/cierre vigentes y conservan bitácora. Detalles en docs/PROCESOS.md.

## 11. Pruebas automáticas

```powershell
# Suites aisladas: crean su propia DB WASM y no modifican la DB de evaluación.
docker compose --profile pruebas run --build --rm --no-deps verificaciones
# Harness del parcial contra API/PostgreSQL de Docker, fixtures propios.
docker compose exec -T nestjs-backend npm run test:harness
# Persistencia P18. No interactúe con la aplicación mientras corre.
powershell -ExecutionPolicy Bypass -File scripts/check-persistence-desk.ps1
```

En Linux, P18: `sh scripts/check-persistence-desk.sh`. Para ejecutar toda la secuencia: `sh scripts/verify.sh`.

Las suites devuelven 0 solo si pasan; otro código indica fallo. Conserve salida, fecha, commit y entorno. Ver docs/PRUEBAS.md para cobertura y limitaciones.

## 12. Logs, apagado y recuperación

```powershell
docker compose ps
docker compose logs --tail=100 nestjs-backend postgres react-frontend
docker compose down
docker compose up -d --wait --wait-timeout 180
```

`down` conserva el volumen. **`down --volumes` elimina la base; no se necesita para actualizar.**

| Problema | Qué revisar |
|---|---|
| Puerto ocupado | Cambie FRONTEND_PORT o BACKEND_PORT en `.env`; recree contenedores. |
| Login falla | Verifique seed:demo/seed:desk, contraseñas locales y estado/jerarquía del usuario. El seed no cambia contraseñas existentes. |
| API reiniciando | Lea el primer error en logs; JWT_SECRET debe ser aleatorio y suficiente. |
| Falta columna/tabla | Verifique migración 003 en logs. No active synchronize ni borre volumen. |
| Ticket no avanza | Complete datos específicos, motivo y resolución; compruebe rol/cola y orden del proceso. |
| No puede desactivar usuario/cola | Reasigne tickets, CI, colas o dependencias antes de la baja. |
| Adjunto rechazado | Máximo 2 MiB, PDF/PNG/JPEG/TXT; contenido debe coincidir con el tipo. |
| Sesión expirada | Ingrese otra vez; los JWT duran 15 minutos. |

## 13. Alcance real de esta entrega

Código y fuentes preparados para Docker; pruebas de integración aisladas ejecutadas. El entorno de construcción no dispone de Docker y no permite instalar el navegador de pruebas: P18 real y recorrido visual deben confirmarse en su equipo. La fidelidad a una jerarquía docente CMDB no enumerada en las fuentes sigue siendo limitación documental explícita. No hay correos reales, provisión real de cuentas externas ni monitoreo automático: esas actuaciones se registran con evidencia dentro de la aplicación.
