> Documento histórico del parcial conservado. La ampliación actual se describe en [API_SERVICE_DESK.md](API_SERVICE_DESK.md).

# API

Prefijo `/api`. Enviar `Authorization: Bearer <JWT>` a todos los recursos salvo
`POST /auth/login` y `GET /health`. Los guards globales reales protegen los controladores.
Roles de dominio: `administrador` y `consulta`; no existe un rol diferente llamado `admin`.
`admin` es únicamente el nombre de la cuenta demo.

## Mantenimiento uniforme

Recursos: `empresas`, `areas`, `departamentos`, `secciones`, `puestos`, `usuarios`,
`clases`, `criticidades`, `tipos`, `servicios-nivel1`, `servicios-nivel2`.

| Operación              | Ruta                | Permiso / respuesta                           |
| ---------------------- | ------------------- | --------------------------------------------- |
| Listar                 | GET /recurso        | Ambos roles; usuarios solo administrador; 200 |
| Ficha                  | GET /recurso/:id    | Mismo permiso de lectura; 200 / 404           |
| Crear                  | POST /recurso       | Administrador; 201                            |
| Modificar parcialmente | PATCH /recurso/:id  | Administrador; 200                            |
| Baja lógica            | DELETE /recurso/:id | Administrador; 200; no borra filas            |

Listados: `{items, total, pagina, limite}`. Query: `buscar`, `pagina` (≥1), `limite` (1–100),
`activo=true|false|desconocido`. Filtros de referencias aplicables al recurso: empresa_id,
area_id, departamento_id, seccion_id, puesto_id, nivel1_id, clase_id, criticidad_id, tipo_id.
No enviar filtros que no correspondan a la entidad.

Los IDs son **cadenas de texto positivas** en JSON para conservar precisión BIGINT.
Los umbrales son cadenas decimales o NULL; se aceptan números JSON simples, pero usar texto
cuando importa la precisión. Una cadena vacía es inválida: enviar NULL para información ausente.
POST exige los campos mínimos. PATCH combina cambios con el registro vigente y valida todo,
especialmente cuando se cambia solo mínimo o máximo. Campos desconocidos son rechazados.

Unidad: `{codigo, nombre, activo, <padre_id>}`; empresa no tiene padre.
Opción: `{nombre, activo}`. Usuario: `{puesto_id,nombre,nombre_usuario,correo?,rol,activo,password}`.
Al crear, password es obligatorio; en PATCH puede omitirse. Nunca se devuelve password_hash.
Servicio N1: `{codigo,nombre,activo?:boolean|null,requiere_revision?:boolean}`.
N2 agrega `{nivel1_id,clase_id?,criticidad_id?,tipo_id?,descripcion?,metrica?,minimo?,maximo?,seccion_id,usuario_id?}`.
En POST manual seccion_id es obligatorio. En PATCH de un servicio importado sin asignación,
puede omitirse y permanecer pendiente. Las FK opcionales admiten NULL.

Ejemplo de creación manual de N2 (IDs existentes):

```json
{
  "codigo": "MANUAL.1",
  "nombre": "Servicio registrado manualmente",
  "nivel1_id": "1",
  "activo": null,
  "clase_id": null,
  "criticidad_id": null,
  "tipo_id": null,
  "descripcion": null,
  "metrica": null,
  "minimo": "0.5",
  "maximo": "5",
  "seccion_id": "1",
  "usuario_id": null
}
```

| Adicional                                | Permiso / resultado                                    |
| ---------------------------------------- | ------------------------------------------------------ | ----------------- |
| PUT /servicios-nivel2/:id/responsable    | Admin; `{seccion_id,usuario_id?:string                 | null}`; 200 ficha |
| DELETE /servicios-nivel2/:id/responsable | Admin; exige servicio inactivo; 200 ficha              |
| POST /importaciones                      | Admin; importa archivo montado; 201 reporte JSON       |
| GET /importaciones                       | Admin; historial paginado                              |
| GET /importaciones/:id                   | Admin; lote y detalles de las 97 filas físicas         |
| GET /catalog/mapeos                      | Admin; etiquetas originales y opciones actuales con FK |
| GET /catalog/status                      | Ambos; conteos generales de servicios                  |
| GET /auth/me                             | Ambos; usuario de sesión sin hash                      |
| POST /auth/logout                        | Ambos; revoca la sesión; 204                           |

Importación sin cuerpo: procesa solamente `data/CatalogoServicios.xlsx` de la configuración
servidor; nunca acepta una ruta arbitraria del cliente. CLI equivalente: `npm run import:excel`.
Reporte: control 12/46 del archivo, SHA-256, lote, creados por entidad, actualizados,
sin_cambios, preservados por mantenimiento, omitidos por fila y observaciones con evidencia.
Los conteos del control corresponden al origen: servicios manuales adicionales no los alteran.
Cada ejecución conserva su auditoría; la idempotencia se refiere al catálogo, no a eliminar el historial.

## Errores y concurrencia

400: entrada, FK, umbral, sección/usuario inválidos, dependencias de una baja.
401: sin sesión válida. 403: rol insuficiente. 404: registro inexistente.
409: código/login duplicado o intento de modificar la identidad de un código importado.
500: fallo interno con mensaje genérico, sin exponer SQL ni secretos.

Escrituras y cargas usan transacciones y el mismo bloqueo asesor PostgreSQL 9021003.
Se garantiza ausencia de escrituras parciales, identidades únicas y preservación de asignaciones.
No se elimina información en cascada. La actualización de contraseña y la baja de un usuario
revocan sus sesiones. El rol actual se vuelve a consultar en cada petición.

Al renombrar clase, criticidad o tipo se registra automáticamente un mapeo de la etiqueta
anterior a la misma opción. La importación reconoce ese alias y lo incluye en observaciones.
No se permite reutilizar un alias para otra categoría.
