# Developer Guide

This document is for contributors and maintainers. End users should start with `README.md` and `USER_MANUAL.md`.

## Prerequisites

- Windows 11
- Node.js 24 or newer
- npm 11 or newer
- Docker Desktop with WSL2 backend, or a Docker-compatible runtime that provides `docker`
- Ollama installed and running
- Git

Docker is resolved in this order:

1. `DOCKER_EXE`
2. `DOCKER_PATH`
3. The system `PATH`
4. The default Docker Desktop path

`DOCKER_EXE` is the definitive override when using a non-standard Docker-compatible runtime.

Ollama is resolved in this order:

1. `OLLAMA_EXE`
2. `OLLAMA_PATH`
3. The system `PATH`
4. The default per-user Ollama install path

`OLLAMA_EXE` is the definitive override when Ollama is installed in a non-standard location.

## Install

```powershell
npm install
```

## Run In Development

```powershell
npm run dev
```

## Test Commands

Build/unit tests only, no local services required:

```powershell
npm run test:unit
```

Service smoke checks only. Requires Docker, Ollama, OpenHands, and Open WebUI to be running:

```powershell
npm run test:smoke
```

Full local runner:

```powershell
npm run test:runner
```

Optional local LLM smoke:

```powershell
npm run test:llm
```

## Packaging

Create a Windows portable build:

```powershell
npm run package:win
```

The output is written to:

```text
release\
```

## Manual Service Commands

Start OpenHands:

```powershell
.\start-openhands.ps1
```

Start Open WebUI:

```powershell
.\start-openwebui.ps1
```

See running containers:

```powershell
docker ps
```

Stop services:

```powershell
docker stop openhands-app
docker stop open-webui
```

View logs:

```powershell
docker logs --tail 100 openhands-app
docker logs --tail 100 open-webui
```

Test Docker-to-Ollama bridge:

```powershell
docker run --rm curlimages/curl:latest -sS http://host.docker.internal:11434/api/tags
```

## GitHub Actions

Remote GitHub Actions is intentionally not the primary gate for this project right now. Use the local runner before pushing.
