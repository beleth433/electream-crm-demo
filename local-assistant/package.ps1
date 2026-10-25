$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskOutput = Join-Path $taskRoot 'build'
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskFiles = @('server.mjs', 'model.mjs', 'facts.cjs', 'transport.mjs', 'setup.html', 'start.cmd', 'README.md', 'MODEL_COMPARISON.md') | ForEach-Object { Join-Path $PSScriptRoot $_ }
$taskArchive = Join-Path $taskOutput 'electream-local-assistant.zip'
Compress-Archive -LiteralPath $taskFiles -DestinationPath $taskArchive -Force
Write-Output $taskArchive
