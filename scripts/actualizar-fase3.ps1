param([Parameter(Mandatory=$true)][string]$Destino)
$ErrorActionPreference='Stop'
$source=Split-Path $PSScriptRoot -Parent
$target=(Resolve-Path $Destino).Path
if($source -eq $target){throw 'El origen y destino deben ser carpetas distintas'}
if(-not (Test-Path (Join-Path $target 'docker-compose.yml'))){throw 'El destino debe ser la raíz del repositorio de Fase 2'}
$sourceExcel=Join-Path $source 'data/CatalogoServicios.xlsx'
$targetExcel=Join-Path $target 'data/CatalogoServicios.xlsx'
if(Test-Path $targetExcel){
 if((Get-FileHash $sourceExcel -Algorithm SHA256).Hash -ne (Get-FileHash $targetExcel -Algorithm SHA256).Hash){throw 'El Excel del destino difiere del original; no se sobrescribirá'}
}
$files=@('backend','frontend','db','docs','scripts','AGENTS.md','README.md','.env.example','.dockerignore','.gitattributes')
$backup=Join-Path (Split-Path $target -Parent) ('respaldo-fase2-'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Path $backup | Out-Null
foreach($item in $files){
 $from=Join-Path $source $item
 if(-not (Test-Path $from)){continue}
 if(Test-Path (Join-Path $target $item)){Copy-Item (Join-Path $target $item) $backup -Recurse -Force}
 if(Test-Path $from -PathType Container){
  $dest=Join-Path $target $item;New-Item -ItemType Directory -Path $dest -Force | Out-Null
  Get-ChildItem $from -Force | Where-Object {$_.Name -notin @('node_modules','dist','.env')} | ForEach-Object {Copy-Item $_.FullName $dest -Recurse -Force}
 }else{Copy-Item $from $target -Force}
}
if(-not (Test-Path $targetExcel)){New-Item -ItemType Directory -Path (Join-Path $target 'data') -Force | Out-Null;Copy-Item $sourceExcel $targetExcel}
Write-Output "Archivos actualizados. Respaldo: $backup"
Write-Output 'Se conservaron .env, docker-compose.yml y el Excel existente. No se modificó ningún volumen.'
