$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$results = Join-Path $root "test-results"
New-Item -ItemType Directory -Force -Path $results | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$log = Join-Path $results "runner-$timestamp.log"
$latest = Join-Path $results "latest.log"

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -LiteralPath $log -Value $line
}

Set-Location $root
Write-Log "Local AI Control Center local runner started."
Write-Log "Working directory: $root"

if (-not (Test-Path -LiteralPath (Join-Path $root "node_modules"))) {
  Write-Log "node_modules not found. Installing dependencies."
  npm.cmd install *>&1 | Tee-Object -FilePath $log -Append
  if ($LASTEXITCODE -ne 0) {
    Write-Log "Dependency install failed with exit code $LASTEXITCODE."
    Copy-Item -LiteralPath $log -Destination $latest -Force
    exit $LASTEXITCODE
  }
}

Write-Log "Running npm run test:runner."
npm.cmd run test:runner *>&1 | Tee-Object -FilePath $log -Append
$runnerExit = $LASTEXITCODE

if ($runnerExit -eq 0) {
  Write-Log "Local runner passed."
} else {
  Write-Log "Local runner failed with exit code $runnerExit."
}

Copy-Item -LiteralPath $log -Destination $latest -Force
Write-Log "Latest log copied to $latest"
exit $runnerExit
