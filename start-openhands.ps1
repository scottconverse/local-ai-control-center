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

$stateDir = "$env:USERPROFILE\.openhands"
$workspaceDir = "$PSScriptRoot\agent-workspace"
New-Item -ItemType Directory -Force -Path $stateDir | Out-Null
New-Item -ItemType Directory -Force -Path $workspaceDir | Out-Null

$resolvedWorkspace = (Resolve-Path -LiteralPath $workspaceDir).Path
if ($resolvedWorkspace -notmatch "^[A-Za-z]:\\") {
  throw "Workspace must be on a Windows drive path. Actual path: $resolvedWorkspace"
}

$drive = $resolvedWorkspace.Substring(0, 1).ToLowerInvariant()
$pathWithoutDrive = $resolvedWorkspace.Substring(2).Replace("\", "/")
$dockerWorkspacePath = "/run/desktop/mnt/host/$drive$pathWithoutDrive"
$openHandsModel = if ($env:OPENHANDS_MODEL) { $env:OPENHANDS_MODEL } else { "openai/qwen2.5-coder:14b" }

$existingContainer = & $dockerCommand ps -aq --filter "name=^openhands-app$"
if ($existingContainer) {
  & $dockerCommand rm -f openhands-app | Out-Null
}

& $dockerCommand run -d --pull=always `
  -e AGENT_SERVER_IMAGE_REPOSITORY=ghcr.io/openhands/agent-server `
  -e AGENT_SERVER_IMAGE_TAG=1.19.1-python `
  -e LLM_MODEL=$openHandsModel `
  -e LLM_BASE_URL=http://host.docker.internal:11434/v1 `
  -e LLM_API_KEY=local-key `
  -e SANDBOX_VOLUMES="${dockerWorkspacePath}:/workspace:rw" `
  -e LOG_ALL_EVENTS=true `
  -v /var/run/docker.sock:/var/run/docker.sock `
  -v "${stateDir}:/.openhands" `
  -p 127.0.0.1:3000:3000 `
  --add-host host.docker.internal:host-gateway `
  --name openhands-app `
  --restart unless-stopped `
  docker.openhands.dev/openhands/openhands:1.7

Write-Host "OpenHands is starting at http://localhost:3000"
Write-Host "Workspace mounted at $workspaceDir"
