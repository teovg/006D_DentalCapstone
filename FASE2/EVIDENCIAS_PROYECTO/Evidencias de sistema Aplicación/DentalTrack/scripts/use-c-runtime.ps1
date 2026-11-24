# Dot-source this file to prepare this project shell without changing system settings.
$taskDevRoot = Join-Path $env:LOCALAPPDATA 'DentalTrackDev'
$taskNodeCandidates = @(Get-ChildItem -LiteralPath (Join-Path $taskDevRoot 'node') -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'node.exe') })
if (-not $taskNodeCandidates.Count) { throw 'Falta Node.js en C:. Instala la versión LTS oficial y vuelve a abrir el proyecto.' }
$taskNodeDirectory = ($taskNodeCandidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
if (-not $taskNodeDirectory.StartsWith('C:\', [StringComparison]::OrdinalIgnoreCase)) { throw 'El entorno de DentalTrack debe estar en C:.' }
$env:Path = $taskNodeDirectory + ';' + (($env:Path -split ';' | Where-Object { $_ -and $_ -notmatch '^\s*D:[\\/]' }) -join ';')
$env:NODE_BINARY = Join-Path $taskNodeDirectory 'node.exe'
$env:NPM_CONFIG_CACHE = Join-Path $taskDevRoot 'npm-cache'
$env:TEMP = Join-Path $env:LOCALAPPDATA 'Temp'
$env:TMP = $env:TEMP
$env:GRADLE_USER_HOME = Join-Path $env:USERPROFILE '.gradle'
$taskManifest = Join-Path $taskDevRoot 'toolchain.json'
if (Test-Path -LiteralPath $taskManifest) {
  $taskToolchain = Get-Content -LiteralPath $taskManifest -Raw | ConvertFrom-Json
  $env:JAVA_HOME = $taskToolchain.java
  $env:ANDROID_HOME = $taskToolchain.sdk
  $env:ANDROID_SDK_ROOT = $taskToolchain.sdk
}
foreach ($taskDirectory in @($env:TEMP, $env:GRADLE_USER_HOME, $env:NPM_CONFIG_CACHE)) {
  if ($taskDirectory -notmatch '^C:[\\/]') { throw "Ruta fuera de C: $taskDirectory" }
  New-Item -ItemType Directory -Path $taskDirectory -Force | Out-Null
}
