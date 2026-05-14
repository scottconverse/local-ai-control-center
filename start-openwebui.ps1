$ErrorActionPreference = "Stop"

$dockerBin = "C:\Program Files\Docker\Docker\resources\bin"
$env:Path = "$dockerBin;$env:Path"

$existingContainer = docker ps -aq --filter "name=^open-webui$"
if ($existingContainer) {
  docker rm -f open-webui | Out-Null
}

docker run -d --pull=always `
  -p 8080:8080 `
  -e OLLAMA_BASE_URL=http://host.docker.internal:11434 `
  -e WEBUI_AUTH=False `
  -v open-webui:/app/backend/data `
  --add-host host.docker.internal:host-gateway `
  --name open-webui `
  --restart always `
  ghcr.io/open-webui/open-webui:main

Write-Host "Open WebUI is starting at http://localhost:8080"
