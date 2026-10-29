# Actualización de contexto 002 — 2026-10-04
P02 exige impedir reutilizar una credencial tras logout. JWT sin registro de revocación
no cumple ese caso. Se agrega tabla sesion, jti, revocada_en y verificación de estado en DB.
El rol se lee de la DB en cada petición para reflejar cambios y usuarios desactivados.
Estos archivos registran decisiones reales; la evidencia de commits debe añadirse en Git.
