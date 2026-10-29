$ErrorActionPreference = 'Stop'
function Snapshot {
  $result = Get-Content -Raw scripts/snapshot.sql | docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At'
  if ($LASTEXITCODE -ne 0) { throw 'Falló snapshot' }; return ($result -join '').Trim()
}
$before = Snapshot
& docker compose down
if ($LASTEXITCODE -ne 0) { throw 'Falló apagado' }
& docker compose up -d --wait --wait-timeout 180
if ($LASTEXITCODE -ne 0) { throw 'Falló arranque' }
$after = Snapshot
if ($before -ne $after) { throw 'P18 FALLÓ: huellas distintas' }
Write-Output "P18 OK: catálogo, CMDB, tickets e historial conservados ($after)"
