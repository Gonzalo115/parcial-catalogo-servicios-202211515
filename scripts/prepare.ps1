$ErrorActionPreference = 'Stop'
function Invoke-Docker { & docker @args; if ($LASTEXITCODE -ne 0) { throw "Docker falló: $args" } }
Invoke-Docker compose config --quiet
Invoke-Docker compose up --build -d
Invoke-Docker compose up -d --wait --wait-timeout 180
Invoke-Docker compose exec -T nestjs-backend npm run seed:demo
Invoke-Docker compose exec -T nestjs-backend npm run import:excel
Invoke-Docker compose exec -T nestjs-backend npm run seed:asignaciones
Invoke-Docker compose exec -T nestjs-backend npm run seed:desk
