$ErrorActionPreference = 'Stop'
$taskNodeRoot = Join-Path $env:LOCALAPPDATA 'DentalTrackDev/node'
if ($taskNodeRoot -notmatch '^C:[\\/]') { throw 'La carpeta de herramientas debe estar en C:.' }
New-Item -ItemType Directory -Path $taskNodeRoot -Force | Out-Null
$taskRelease = (Invoke-RestMethod 'https://nodejs.org/dist/index.json') | Where-Object { $_.version -like 'v24.*' -and $_.lts -ne $false } | Select-Object -First 1
if (-not $taskRelease.version) { throw 'No se identificó Node.js LTS en el sitio oficial.' }
$taskVersion = $taskRelease.version
$taskZip = "node-$taskVersion-win-x64.zip"
$taskZipPath = Join-Path $taskNodeRoot $taskZip
Invoke-WebRequest "https://nodejs.org/dist/$taskVersion/$taskZip" -OutFile $taskZipPath
Invoke-WebRequest "https://nodejs.org/dist/$taskVersion/SHASUMS256.txt" -OutFile (Join-Path $taskNodeRoot 'SHASUMS256.txt')
$taskExpected = Get-Content (Join-Path $taskNodeRoot 'SHASUMS256.txt') | Where-Object { $_ -match "  $([regex]::Escape($taskZip))$" }
$taskHash = (Get-FileHash -LiteralPath $taskZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
if (-not $taskExpected -or $taskHash -ne $taskExpected.Split(' ')[0]) { throw 'El archivo no coincide con la huella SHA256 oficial.' }
Expand-Archive -LiteralPath $taskZipPath -DestinationPath $taskNodeRoot -Force
Write-Host "Node.js $taskVersion instalado y verificado en C:."
