# Corrección incremental: portal, solicitante2 y paneles

Fecha: 29/10/2026. Aplicar DESPUÉS de service-desk-ampliacion-202211515.patch. No volver a aplicar el parche inicial. No requiere borrar volúmenes ni migración nueva.

## Aplicación en PowerShell

Desde la raíz del repositorio, con este parche descargado allí:

```powershell
git apply --check .\service-desk-portal-solicitantes-paneles.patch
git apply .\service-desk-portal-solicitantes-paneles.patch
docker compose up --build -d --wait --wait-timeout 180
docker compose exec -T nestjs-backend npm run seed:desk
```

El seed agrega la cuenta solicitante2 y conserva cuentas/tickets/dispositivos existentes. Su contraseña usa DEMO_DESK_PASSWORD de .env (predeterminado SA_desk_2026_demo). Correo solicitante2@demo.local. El nuevo usuario empieza sin tickets: no se le asigna el conjunto DEMO del primer solicitante.

Cierre sesión y vuelva a entrar; recargue con Ctrl+F5 para utilizar los archivos nuevos del frontend. Si git apply --check indica conflictos, no fuerce: conserve sus cambios y comparta el mensaje. --check no modifica archivos.

## Qué cambia en permisos

Un usuario con rol adicional solicitante, sin agente/aprobador y sin administrador es un usuario de portal. Su rol base consulta se conserva por compatibilidad, pero no concede acceso al resto del catálogo. La cuenta consulta pura conserva lectura funcional del enunciado. Quien recibe agente o aprobador explícitos conserva las funciones de esos roles, sujetas a colas.

| Recurso | Solicitante de portal |
|---|---|
| Tickets | Solo aquellos cuyo solicitante_id es el suyo, incluso ante concesiones accidentales de lectura por cola |
| Alta | Para sí mismo; no puede suplantar otro solicitante |
| Comentarios/adjuntos | Solo sus casos, comentarios públicos y descargas autorizadas |
| Seguimiento | Estados y mensajes públicos; sin detalle de atención ni snapshots completos de auditoría |
| CMDB / dependencias / atributos | Denegado, incluso mediante GET directo |
| Selector de dispositivos | Solo código/nombre de CI activos de los que es responsable; sin inventario completo |
| Catálogo / organización / usuarios | Módulos denegados; bootstrap entrega únicamente servicios disponibles y referencia de cola para crear |
| Indicadores / configuración de colas | Denegado |
| FAQ / autoservicio | Lectura |

No basta ocultar pestañas. Guard global, consultas de lista, detalle, acciones y referencias limitan los datos. El bootstrap del portal no entrega permisos de colas, responsables, ubicaciones, clases ni directorio de agentes. La referencia de cola visible usa el nombre del proceso y selecciona una entrada activa por proceso; no revela soporte/escalamiento.

Para un ticket sin equipo asignado, use la justificación sin CI. No se concede acceso a todo el inventario por crear un ticket. Un agente autorizado puede crear casos para otra persona y gestionar referencias según sus permisos; esto no eleva al solicitante.

## Diseño

Nuevo ticket y Abrir se despliegan en un panel lateral sobre el listado, con fondo atenuado y desplazamiento propio. El formulario no aparece al final de la página. Botón Cerrar, clic fuera y Escape permiten volver; durante guardado se evita cierre accidental. El diálogo nativo contiene foco y devuelve foco al botón anterior. Se adapta a ancho completo en móvil y respeta movimiento reducido.

El solicitante ve Mis tickets / Autoservicio y el encabezado con su perfil efectivo. Sus formularios muestran datos que aporta al solicitar, sin campos de solución, aprobación, investigación o provisión del agente. El agente conserva los campos de atención y acciones dentro del mismo panel. Los errores aparecen dentro del panel, no ocultos detrás del fondo.

## Prueba con dos solicitantes

1. Ingrese solicitante2 / contraseña configurada: Mis tickets debe estar vacío. Solo verá Mis tickets y Autoservicio; no CMDB, Indicadores ni Catálogo y organización.
2. Cree un ticket de Servicios con título único, servicio de referencia y justificación sin CI. Anote el número. Debe verlo en su lista.
3. Cierre sesión. Ingrese solicitante: no debe ver ese ticket. Sus aproximadamente 39/40 casos anteriores pueden seguir apareciendo porque el seed los asignó al primer solicitante.
4. Pruebe también al revés: un caso creado por solicitante no aparece a solicitante2. Las solicitudes directas de detalle, comentarios, adjuntos y acciones sobre el caso ajeno devuelven 403.
5. Agente1 puede atender el caso en su cola; agregue comentario público y nota interna. Solicitante2 verá solo el público en su propio caso.
6. Abra Nuevo ticket y luego un ticket existente. Ambos deben desplegar el panel inmediatamente, sin bajar en la página. Cierre con Escape y botón Cerrar.

## Verificación realizada

- Compilación backend y frontend: salida 0.
- Suite Service Desk: 24 pruebas aprobadas, incluyendo tres grupos nuevos de aislamiento y reducción de datos.
- Regresión del parcial: 23 aprobadas. Total reportado por Node: 47 (incluye contenedoras).
- Se prueba concesión accidental de lectura por cola sin romper aislamiento; detalle/notas/snapshots, suplantación de solicitante, CI ajeno y bloqueo de módulos directos.
- Evidencias: docs/evidencias/portal-seguridad.txt, portal-regresion.txt, build-portal.txt y build-ui-panel.txt.
- No se dispone de Docker ni navegador ejecutable en el entorno de generación. Comprobación visual final y arranque Docker se confirman en el equipo del usuario. No se declaran ejecutados aquí.
