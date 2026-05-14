$ErrorActionPreference = "Stop"

$fallbackDockerBin = "C:\Program Files\Docker\Docker\resources\bin"
if (Test-Path -LiteralPath $fallbackDockerBin) {
  $env:Path = "$fallbackDockerBin;$env:Path"
}

$dockerCommand = if ($env:DOCKER_EXE) {
  $env:DOCKER_EXE
} elseif ($env:DOCKER_PATH) {
  $env:DOCKER_PATH
} else {
  "docker"
}

$existingContainer = & $dockerCommand ps -aq --filter "name=^open-webui$"
if ($existingContainer) {
  & $dockerCommand rm -f open-webui | Out-Null
}

& $dockerCommand run -d --pull=always `
  -p 127.0.0.1:8080:8080 `
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 `
  -e WEBUI_AUTH=False `
  -v open-webui:/app/backend/data `
  --add-host host.docker.internal:host-gateway `
  --name open-webui `
  --restart unless-stopped `
  ghcr.io/open-webui/open-webui:v0.9.5

Write-Host "Open WebUI is starting at http://localhost:8080"
