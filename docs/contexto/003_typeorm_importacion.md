# Actualización 3 — TypeORM e importación — 2026-10-04

Contexto utilizado: AGENTS.md anterior, enunciado completo y Excel original. El hallazgo fue
que la Fase 2 utilizaba pg y solo verificaba parcialmente los requisitos funcionales.
Se conserva la migración 001 y la autenticación real; se integra TypeORM mediante DataSource
global y entidades explícitas, con synchronize=false. Los CRUD usan repositorios y transacciones.
La migración 002 agrega snapshots de importación y protección de baja del nivel 1.

La importación no debe deshacer el mantenimiento: se almacena la última proyección importada.
Una edición por CRUD marca el snapshot; una discrepancia detectada también conserva el registro.
Las asignaciones están fuera de esa proyección y nunca se reemplazan al cargar el Excel.
Estas reglas se incorporaron a AGENTS y se comprobaron por HTTP con una reimportación real.
