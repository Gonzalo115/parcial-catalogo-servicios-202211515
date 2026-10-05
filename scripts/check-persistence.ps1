param([string]$DbUser='catalogo_app',[string]$DbName='catalogo_servicios')
$ErrorActionPreference='Stop'
$query="SELECT md5(jsonb_build_object('usuarios',(SELECT jsonb_agg(to_jsonb(u) ORDER BY u.id) FROM catalogo.usuario u),'nivel1',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id) FROM catalogo.servicio_nivel1 n),'nivel2',(SELECT jsonb_agg(to_jsonb(n) ORDER BY n.id) FROM catalogo.servicio_nivel2 n),'responsables',(SELECT jsonb_agg(to_jsonb(r) ORDER BY r.servicio_nivel2_id) FROM catalogo.servicio_responsable r))::text)"
$count=(docker compose exec -T postgres psql -U $DbUser -d $DbName -tAc 'SELECT count(*) FROM catalogo.usuario' | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or [int]$count -lt 1){throw 'Crear cuentas demo antes de comprobar persistencia'}
$services=(docker compose exec -T postgres psql -U $DbUser -d $DbName -tAc 'SELECT count(*) FROM catalogo.servicio_nivel2' | Out-String).Trim()
if($LASTEXITCODE -ne 0 -or [int]$services -lt 46){throw 'Importar el catálogo antes de comprobar P12'}
$before=(docker compose exec -T postgres psql -U $DbUser -d $DbName -tAc $query | Out-String).Trim()
if($LASTEXITCODE -ne 0){throw 'Falló la lectura inicial'}
docker compose restart postgres nestjs-backend react-frontend
if($LASTEXITCODE -ne 0){throw 'Falló el reinicio'}
docker compose up -d --wait --wait-timeout 120
if($LASTEXITCODE -ne 0){throw 'El entorno no quedó healthy'}
$after=(docker compose exec -T postgres psql -U $DbUser -d $DbName -tAc $query | Out-String).Trim()
if($LASTEXITCODE -ne 0){throw 'Falló la lectura final'}
if($before -ne $after){throw 'P12 FALLÓ: los datos cambiaron al reiniciar'}
Write-Output 'P12 OK: usuarios, servicios y responsables conservados tras reiniciar contenedores'
