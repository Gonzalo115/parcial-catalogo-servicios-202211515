# Sesión al recargar y ficha por secciones

Aplicar sobre la ampliación con el parche `service-desk-portal-solicitantes-paneles.patch` ya instalado. No aplicar este parche directamente al parcial original.

## Aplicación en Windows PowerShell

Guardar `service-desk-sesion-secciones.patch` en la raíz del repositorio, donde está docker-compose.yml:

```powershell
git apply --check .\service-desk-sesion-secciones.patch
git apply .\service-desk-sesion-secciones.patch
docker compose up --build -d --wait --wait-timeout 180
```

Actualizar el navegador con Ctrl+F5. Iniciar sesión una vez tras actualizar: la versión anterior no almacenaba la credencial y no puede recuperar una sesión que ya perdió. No requiere seed, migración, cambios en .env ni reiniciar los datos.

## Comportamiento

- La credencial temporal se guarda en sessionStorage, durante la pestaña abierta, y se restaura al recargar. No se almacena contraseña ni perfil de usuario.
- Antes de mostrar el sistema, se valida `/api/auth/me`. El servidor entrega la identidad y los roles actuales; un token almacenado no concede acceso por sí solo.
- Se mantiene el vencimiento original de 15 minutos desde el login. Recargar no renueva el plazo. No se añade refresh token ni sesión indefinida.
- Cerrar sesión mantiene la revocación en PostgreSQL y elimina la credencial del navegador. Un 401 también la elimina; un fallo de red o un 503 permite reintentar la validación sin perderla.
- sessionStorage se usa por pestaña. Si el navegador bloquea el almacenamiento, se permite operar en memoria; en ese caso recargar exige ingresar nuevamente.
- La ficha presenta cabecera con estado, cola y responsable para el operador, y navegación por secciones. El agente/aprobador comienza en Atención; allí encuentra la acción Tomar ticket y el flujo de estados. El botón de toma queda deshabilitado si ya hay responsable o el estado impide asignar.
- Resumen conserva los atributos generales y CI; Datos del proceso conserva los campos técnicos y su guardado; Conversación agrupa comentarios y adjuntos; Relaciones e Historial tienen su propia sección.
- Asignación, transferencia y escalamiento se despliegan dentro de Atención, con el mismo control del servidor y motivo requerido cuando corresponde.
- Cambiar entre secciones conserva los campos pendientes de guardar. Cerrar el panel o recargar no guarda borradores. Las acciones conservan el comportamiento previo: al completarse vuelven a cargar los datos del ticket.
- El solicitante solo ve Resumen, Conversación y Seguimiento. Continúan vigentes las restricciones del parche anterior en servidor.

## Prueba manual

1. Ingresar como agente1 y pulsar F5 dentro de los 15 minutos del login: debe aparecer brevemente Restaurando sesión y volver a mostrar el usuario autenticado.
2. Cerrar sesión y recargar: debe permanecer el formulario de ingreso. Al cumplirse los 15 minutos se requiere un nuevo login.
3. Abrir un ticket sin responsable: Atención debe estar seleccionada y Tomar ticket visible. Tomarlo: la cabecera muestra al agente y la toma queda deshabilitada.
4. Entrar a Datos del proceso, escribir un valor sin guardar, cambiar a Historial y regresar: el valor sigue presente. Guardar los datos y comprobar la bitácora.
5. Publicar un comentario desde Conversación, adjuntar un TXT de prueba y descargarlo. Probar la transferencia con motivo desde el desplegable de Atención si se dispone de una cola destino autorizada.
6. Ingresar como solicitante2: confirmar que solo aparecen sus solicitudes y las tres secciones permitidas en su ficha.
7. En una pantalla estrecha, verificar que los botones de sección se distribuyen en filas, que el panel desplaza su contenido y que Cerrar y Escape funcionan.

## Validación ejecutada

`npm --prefix frontend test`: 9 pruebas aprobadas. Incluyen casos de almacenamiento/restauración, errores y vencimiento, montaje/desmontaje del hook simulando recarga, navegación DOM conservando campos, ficha real con toma por agente y secciones restringidas para solicitante.

`npm --prefix frontend run build`: compilación de producción aprobada. Dockerfile del frontend ejecuta las mismas pruebas antes del build.

Los ensayos DOM usan React y LinkeDOM con respuestas API simuladas. No equivalen a pruebas visuales en navegador ni a levantar Docker. Esas verificaciones no están ejecutadas en este entorno y se detallan arriba para realizarlas localmente. No se modifican backend ni esquema.
