# Local AI Control Center

Local AI Control Center is a Windows-friendly desktop app for running and managing your local Ollama-powered agent stack without using a terminal.

It is Windows-only for now and binds local service ports to `127.0.0.1` so OpenHands and Open WebUI are not intentionally exposed to your local network.

It gives you one GUI for:

- Starting and stopping OpenHands.
- Starting and stopping Open WebUI.
- Checking Docker, Ollama, and service health.
- Opening the writable agent workspace.
- Opening the user manual.
- Embedding the OpenHands and Open WebUI interfaces in one place.

## Start The App

From the app folder, double-click the no-terminal launcher:

```text
Launch Local AI Control Center.vbs
```

If you want to see startup logs, double-click:

```text
Start Local AI Control Center.cmd
```

First-time setup:

```text
Install Local AI Control Center.cmd
```

## User Manual

Full walkthrough:

```text
USER_MANUAL.md
```

## Marketing Landing Page

Static landing page:

```text
landing\index.html
```

The page is intentionally honest about the current product state: useful local Windows control center today, still being hardened for wider distribution.

## Local Services

OpenHands runs at `http://localhost:3000`.

Open WebUI runs at `http://localhost:8080`.

Ollama runs at `http://127.0.0.1:11434`.

Docker is resolved from `DOCKER_EXE`, `DOCKER_PATH`, the system `PATH`, or the standard Docker Desktop install location.

## OpenHands

OpenHands is the local coding/agent UI. It can work in a Docker sandbox, read and write project files, and run commands.

Writable local workspace:

```text
.\agent-workspace
```

Inside OpenHands, that folder appears as:

```text
/workspace
```

Start it:

```powershell
.\start-openhands.ps1
```

Then open:

```text
http://localhost:3000
```

Recommended first settings for agent/file work:

```text
LLM Provider: OpenAI-compatible
Model: openai/qwen2.5-coder:14b
Base URL: http://host.docker.internal:11434/v1
API Key: local-key
```

Gemma is still available for fast local chat:

```text
gemma4-26b-8k
```

## Open WebUI

Open WebUI is a friendly local chat interface for Ollama.

Start it:

```powershell
.\start-openwebui.ps1
```

Then open:

```text
http://localhost:8080
```

## Development

Install dependencies:

```powershell
npm install
```

Run the desktop app in development mode:

```powershell
npm run dev
```

Run the test runner:

```powershell
npm run test:runner
```

Optional local LLM smoke test:

```powershell
npm run test:llm
```

## Local Runner

GitHub Actions is disabled while the account is out of Actions minutes.

Use the local runner first:

```text
Run Local Test Runner.vbs
```

See:

```text
RUNNER.md
```
