# Local AI Agent User Manual

This setup gives you a single desktop app for two local AI tools powered by Ollama:

- OpenHands: an agent workspace for reading files, writing files, and running commands.
- Open WebUI: a friendly browser-based chat interface for your local Ollama models.

The system runs locally on your machine. Docker hosts the apps, and Ollama hosts the models.

## Quick Start

1. Open Docker Desktop.
2. Wait for Docker Desktop to say the engine is running.
3. Make sure Ollama is running.
4. Double-click the no-terminal launcher:

```text
C:\Users\scott\Desktop\local-ai-agent\Launch Local AI Control Center.vbs
```

If you want to see startup logs, double-click the visible launcher instead:

```text
C:\Users\scott\Desktop\local-ai-agent\Start Local AI Control Center.cmd
```

5. Use the Dashboard buttons to start OpenHands and Open WebUI.

You can still open the underlying local apps directly:

```text
OpenHands:  http://localhost:3000
Open WebUI: http://localhost:8080
```

## Which App Should I Use?

Use OpenHands when you want the AI to work on files or projects.

Good OpenHands tasks:

- Read a folder and explain what is in it.
- Create or edit code files.
- Run terminal commands.
- Debug a local project.
- Write scripts.
- Make changes inside the mounted workspace.

Use Open WebUI when you want a normal chat interface.

Good Open WebUI tasks:

- Brainstorming.
- Drafting emails or documents.
- Asking questions.
- Summarizing pasted text.
- Comparing local Ollama models.

## Models

Recommended model for OpenHands:

```text
openai/qwen2.5-coder:14b
```

Why: it has a larger context window and is better suited for code and tool-style work.

Recommended model for fast chat:

```text
gemma4-26b-8k
```

Why: it is fast on your GPU and configured for an 8k context window.

Available local models can be checked with:

```powershell
ollama list
```

Loaded models can be checked with:

```powershell
ollama ps
```

## OpenHands Setup

OpenHands runs here:

```text
http://localhost:3000
```

It is configured with:

```text
LLM Provider: OpenAI-compatible
Model: openai/qwen2.5-coder:14b
Base URL: http://host.docker.internal:11434/v1
API Key: local-key
```

If the OpenHands UI asks you to configure the model manually, use those exact values.

## Workspace Rules

OpenHands can read and write this local folder:

```text
C:\Users\scott\Desktop\local-ai-agent\agent-workspace
```

Inside OpenHands, that same folder appears as:

```text
/workspace
```

Put files or projects there when you want OpenHands to work on them.

Example:

```text
C:\Users\scott\Desktop\local-ai-agent\agent-workspace\my-project
```

Then tell OpenHands:

```text
Open /workspace/my-project, inspect it, and explain how it is organized.
```

## Working Safely

The agent can change files in the mounted workspace. Treat it like a junior developer with terminal access.

Best habits:

- Keep important projects in Git before asking for edits.
- Ask it to inspect and summarize before making large changes.
- Ask it to make one change at a time.
- Ask it to show what files it changed.
- Avoid mounting your whole Desktop or user folder unless you truly want broad access.

Useful prompts:

```text
Inspect this project first. Do not edit anything yet.
```

```text
Make the smallest change needed, then tell me exactly which files changed.
```

```text
Run the tests after editing and summarize the result.
```

## Open WebUI Setup

Open WebUI runs here:

```text
http://localhost:8080
```

It connects to Ollama at:

```text
http://host.docker.internal:11434
```

Authentication is currently disabled for convenience because this is a local setup:

```text
WEBUI_AUTH=False
```

Use Open WebUI for local chat with models like:

```text
gemma4-26b-8k
qwen2.5-coder:14b
gpt-oss:20b
```

## Web Browsing

This setup can run local apps and connect to Ollama. It does not yet add a dedicated always-on web-search provider for the models.

Practical options:

- Paste web content into Open WebUI or OpenHands.
- Ask OpenHands to use command-line tools if the sandbox has network access.
- Add a search provider later, such as SearXNG, Tavily, Brave Search, or Open WebUI web search configuration.

If you want, the next upgrade should be adding a local SearXNG container and wiring Open WebUI to it for web search.

## Common Commands

You do not need these commands for normal use. They are here for troubleshooting and development.

Start the desktop app:

```text
Double-click C:\Users\scott\Desktop\local-ai-agent\Start Local AI Control Center.cmd
```

First-time install:

```text
Double-click C:\Users\scott\Desktop\local-ai-agent\Install Local AI Control Center.cmd
```

Manual OpenHands start:

```powershell
cd C:\Users\scott\Desktop\local-ai-agent
.\start-openhands.ps1
```

Manual Open WebUI start:

```powershell
cd C:\Users\scott\Desktop\local-ai-agent
.\start-openwebui.ps1
```

See running Docker containers:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker ps
```

Stop OpenHands:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker stop openhands-app
```

Stop Open WebUI:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker stop open-webui
```

Restart both:

```powershell
cd C:\Users\scott\Desktop\local-ai-agent
.\start-openhands.ps1
.\start-openwebui.ps1
```

Check Ollama models:

```powershell
ollama list
```

Check GPU usage:

```powershell
nvidia-smi
```

## Development And Testing

This project is now a Git-ready product repo.

GitHub Actions is disabled while the account is out of Actions minutes. Use the local runner first.

Double-click:

```text
C:\Users\scott\Desktop\local-ai-agent\Run Local Test Runner.vbs
```

The runner opens the latest log in Notepad when it finishes.

Install dependencies:

```powershell
npm install
```

Run the desktop app:

```powershell
npm run dev
```

Run the main test runner:

```powershell
npm run test:runner
```

Run the optional local model smoke test:

```powershell
npm run test:llm
```

Unload a model from VRAM:

```powershell
ollama stop gemma4-26b-8k
ollama stop qwen2.5-coder:14b
```

## Troubleshooting

If `docker` is not recognized in PowerShell, run:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
```

If OpenHands does not load:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker logs --tail 100 openhands-app
```

If Open WebUI does not load:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker logs --tail 100 open-webui
```

If models are slow or the system feels heavy:

```powershell
nvidia-smi
ollama ps
```

Then stop any model you are not using:

```powershell
ollama stop MODEL_NAME
```

If a container cannot see Ollama, test the Docker-to-Ollama bridge:

```powershell
$env:Path = "C:\Program Files\Docker\Docker\resources\bin;$env:Path"
docker run --rm curlimages/curl:latest -sS http://host.docker.internal:11434/api/tags
```

Expected result: a JSON list of local Ollama models.

## Files In This Setup

```text
C:\Users\scott\Desktop\local-ai-agent\README.md
C:\Users\scott\Desktop\local-ai-agent\USER_MANUAL.md
C:\Users\scott\Desktop\local-ai-agent\start-openhands.ps1
C:\Users\scott\Desktop\local-ai-agent\start-openwebui.ps1
C:\Users\scott\Desktop\local-ai-agent\agent-workspace
```

## Recommended First Test

Put a small text file in:

```text
C:\Users\scott\Desktop\local-ai-agent\agent-workspace
```

Then ask OpenHands:

```text
List the files in /workspace, read the text file, and write a short summary to /workspace/summary.md.
```

If `summary.md` appears on your Windows desktop folder, the file read/write loop is working.
