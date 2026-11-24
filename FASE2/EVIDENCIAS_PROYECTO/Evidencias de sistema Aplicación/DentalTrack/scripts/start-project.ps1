$ErrorActionPreference = 'Stop'
$taskProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskProjectRoot
$taskNodeRoot = Join-Path $env:LOCALAPPDATA 'DentalTrackDev/node'
if (-not @(Get-ChildItem -LiteralPath $taskNodeRoot -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'node.exe') }).Count) {
  Write-Host 'Preparando Node.js LTS desde nodejs.org en C:...'
  & (Join-Path $PSScriptRoot 'setup-node-c.ps1')
}
. (Join-Path $PSScriptRoot 'use-c-runtime.ps1')
if (-not (Test-Path -LiteralPath '.env')) {
  Write-Host 'Falta .env en la carpeta que contiene INICIAR_DENTALTRACK.bat. Copia ahi tu archivo privado antes de iniciar.'
  exit 1
}
if (-not (Test-Path -LiteralPath 'node_modules/expo/bin/cli')) {
  Write-Host 'Instalando las dependencias del proyecto...'
  & (Join-Path $taskNodeDirectory 'npm.cmd') ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
& $env:NODE_BINARY (Join-Path $taskProjectRoot 'scripts/check-source-integrity.mjs')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& $env:NODE_BINARY (Join-Path $taskProjectRoot 'services/start.mjs')
exit $LASTEXITCODE
