# Local AI Control Center User Manual

Local AI Control Center is a Windows desktop app for managing a local AI workstation without living in a terminal. It gives you one place to start services, check health, open your workspace, launch the chat UI, and run local verification.

## At A Glance

| Area | What it does | When to use it |
|---|---|---|
| First Run | Scans hardware and prepares required tools, models, and images | Use this on a new machine |
| Dashboard | Shows health, services, models, workspace, and local runner controls | Start here every session |
| OpenHands | Agent workspace for files, commands, and project work | Coding, debugging, scripts, project edits |
| Open WebUI | Chat interface for local Ollama models | Drafting, brainstorming, summarizing, model chat |
| Workspace | Local folder mounted into OpenHands | Put files here when you want the agent to work on them |
| Local Runner | Runs local build and smoke checks | Verify the setup or changes |

## Safety And Scope

The stack runs on your machine:

| Component | Role |
|---|---|
| Ollama | Runs local models |
| Docker Desktop | Runs OpenHands and Open WebUI containers |
| OpenHands | Provides the coding-agent workspace |
| Open WebUI | Provides the chat interface |

The Docker-hosted web apps bind to `127.0.0.1` only. Do not expose OpenHands or Open WebUI to a network unless you have deliberately enabled authentication and understand the risk.

Docker is resolved from `DOCKER_EXE`, `DOCKER_PATH`, the system `PATH`, or the standard Docker Desktop install location.

## Quick Start

1. Open Local AI Control Center.
2. Go to **First Run**.
3. Review the hardware scan.
4. Use the setup buttons to install missing tools, pull models, pull images, and start services.
5. When setup is ready, use the Dashboard for normal daily work.

After setup has completed once, the app remembers that this machine was verified and opens to the Dashboard on later launches. You can still return to **First Run** any time to re-check the machine or pull missing assets.

If you are running from the source folder, double-click:

```text
Launch Local AI Control Center.vbs
```

If you want to see startup logs, use:

```text
Start Local AI Control Center.cmd
```

Direct service URLs:

| Service | URL |
|---|---|
| OpenHands | `http://localhost:3000` |
| Open WebUI | `http://localhost:8080` |

## First Run Setup

The first-run wizard is for a machine that does not already have the local AI stack installed.

It checks:

| Check | Why it matters |
|---|---|
| CPU | Confirms the app can read system details |
| System RAM | The recommended stack expects about 32 GB RAM |
| Disk | Model files and Docker images need substantial local space |
| GPU / VRAM | OpenHands-ready local models need roughly 16 GB available NVIDIA VRAM |
| Docker Desktop | Required to run OpenHands and Open WebUI |
| Ollama | Required to run local models |
| Models | Required before OpenHands and Open WebUI can use local inference |
| Docker images | Required before the service containers can start |

The wizard can start these setup actions from the app:

| Action | What happens |
|---|---|
| Install Docker | Uses `winget` when available, or opens the official Docker Desktop download page |
| Install Ollama | Uses `winget` when available, or opens the official Ollama download page |
| Pull Models | Downloads `openai/qwen2.5-coder:14b` and `gemma4-26b-8k` through Ollama |
| Pull Images | Downloads the OpenHands and Open WebUI Docker images |
| Start Both Services | Starts OpenHands and Open WebUI after prerequisites are ready |

Long setup actions stream live output into the First Run panel while they run. If a model or Docker image takes several minutes to download, leave the app open and watch the log panel for progress.

If you close the app during a model or image pull, the background download may continue. Reopen the app and run the same pull step again to confirm whether it finished.

Docker Desktop may ask for administrator approval or a restart. That is normal on Windows.

When First Run shows **Setup complete**, click **Go to Dashboard**. The completion state is saved locally so future launches start in the daily-use view.

## Choosing The Right Tool

Use **OpenHands** when the task involves files, projects, commands, or code.

Good OpenHands requests:

- "Inspect `/workspace/my-project` and explain how it is organized."
- "Make the smallest change needed and tell me which files changed."
- "Run the tests and summarize the result."
- "Create a script that does X."

Use **Open WebUI** when the task is conversational.

Good Open WebUI requests:

- Brainstorming
- Drafting emails or documents
- Summarizing pasted text
- Comparing local model responses
- General Q&A with local models

## Models

| Use case | Model |
|---|---|
| Agent/code work | `openai/qwen2.5-coder:14b` |
| Fast chat | `gemma4-26b-8k` |

The Dashboard shows the configured OpenHands model and Open WebUI image. Open WebUI can also use other local Ollama models, such as `gpt-oss:20b`, if they are installed.

You can change the configured OpenHands and Open WebUI chat models from **Dashboard > Model Settings And Reset Controls**. Save the model settings, then restart the affected service so the container launches with the new value. The Dashboard shows a **Restart required** badge until that restart happens. The First Run model pull step uses the saved model choices.

The same panel lets you label installed local models. The Dashboard suggests a plain-language use case from common model-name keywords, such as code, chat, embedding, or vision. For private or uncommon model names, add your own label so the Local Models panel stays readable.

The Dashboard also includes reset controls for OpenHands and Open WebUI. Use these only when you want a clean slate:

| Reset control | What it clears |
|---|---|
| Reset OpenHands Data | Stops/removes the OpenHands container and clears the local `.openhands` state folder |
| Reset Open WebUI Data | Stops/removes the Open WebUI container and removes the `open-webui` Docker volume |

## Workspace

OpenHands can read and write this folder:

```text
.\agent-workspace
```

Inside OpenHands, the same folder appears as:

```text
/workspace
```

Typical flow:

1. Put a project or file inside `.\agent-workspace`.
2. Open the OpenHands tab.
3. Ask OpenHands to inspect `/workspace`.
4. Ask for edits only after you understand what it plans to change.

Example:

```text
Open /workspace/my-project, inspect it, and explain how it is organized. Do not edit anything yet.
```

## Working Safely With The Agent

OpenHands can change files in the mounted workspace. Treat it like a junior developer with terminal access.

Best practices:

| Practice | Why it matters |
|---|---|
| Keep important projects in Git | You can review and revert changes |
| Ask for inspection first | Prevents blind edits |
| Make one change at a time | Easier to verify |
| Ask for changed files | Keeps the work auditable |
| Keep the workspace narrow | Limits accidental access |

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

## Open WebUI

Open WebUI connects to Ollama through Docker at:

```text
http://host.docker.internal:11434
```

Authentication is disabled for this local-only setup:

```text
WEBUI_AUTH=False
```

Plain meaning: Open WebUI has no login screen by default. Anyone who can reach port `8080` on your machine can use it. Keep Open WebUI bound to localhost unless you deliberately configure authentication and network exposure.

## Web Browsing

This setup does not include a dedicated always-on web-search provider by default.

Practical options:

| Need | Recommended approach |
|---|---|
| Summarize a page | Paste the content into Open WebUI |
| Work from a document | Put it in `.\agent-workspace` and use OpenHands |
| Model-assisted search | Configure a search provider in Open WebUI |

## Local Runner

The local runner verifies the product from your machine.

Double-click:

```text
Run Local Test Runner.vbs
```

It writes logs to:

```text
.\test-results\latest.log
```

Use it when:

- You changed product files.
- A service is behaving strangely.
- You want confidence that the stack still starts and responds.

## Troubleshooting

| Problem | What to try |
|---|---|
| First Run says VRAM is too low | Close games, renderers, and other GPU-heavy apps, then refresh |
| First Run says disk is too low | Free space on the drive where the app is installed before pulling models |
| Docker install asks for approval | Approve the Windows installer prompt; Docker Desktop may require a restart |
| `winget` is not found | Use the official download page the app opens |
| Docker is not found | Set `DOCKER_EXE` to your Docker-compatible executable path and restart the app |
| Ollama executable is not found | Set `OLLAMA_EXE` to your Ollama executable path and restart the app |
| Ollama is not reachable | Start Ollama and confirm it is listening on port `11434` |
| App cannot find its scripts after a non-standard install | Set `LOCAL_AI_APP_ROOT` to the app root directory and restart the app |
| App closed during a model or image pull | Reopen the app and run the pull step again to confirm whether the background download completed |
| OpenHands says it is starting | Wait a minute after first launch; Docker may still be starting the container |
| Open WebUI says it is starting | Wait for the container health check to finish |
| Models feel slow | Check `nvidia-smi` and stop unused Ollama models |

Default Docker Desktop executable path:

```powershell
$env:DOCKER_EXE = "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
```

Useful checks:

```powershell
docker ps
ollama ps
nvidia-smi
```

Unload a model from VRAM:

```powershell
ollama stop MODEL_NAME
```

## Files In This Setup

| Path | Purpose |
|---|---|
| `README.md` | Project overview |
| `USER_MANUAL.md` | This user manual |
| `RUNNER.md` | Local runner details |
| `DEVELOPER.md` | Developer setup and packaging |
| `CONTRIBUTING.md` | Contribution rules |
| `CHANGELOG.md` | Release history |
| `Launch Local AI Control Center.vbs` | No-terminal app launcher |
| `Start Local AI Control Center.cmd` | Visible app launcher |
| `Install Local AI Control Center.cmd` | First-time dependency install/build helper |
| `Run Local Test Runner.vbs` | No-terminal local runner |
| `Run Local Test Runner.cmd` | Visible local runner |
| `start-openhands.ps1` | OpenHands container launcher |
| `start-openwebui.ps1` | Open WebUI container launcher |
| `run-local-tests.ps1` | Local runner implementation |
| `electron\` | Electron main/preload process |
| `src\` | Desktop app UI |
| `scripts\` | Smoke and LLM checks |
| `tests\` | Regression tests |
| `landing\` | Static marketing page |
| `agent-workspace\` | Files OpenHands can read and write |

## Recommended First Test

1. Put a small text file in `.\agent-workspace`.
2. Open OpenHands.
3. Ask:

```text
List the files in /workspace, read the text file, and write a short summary to /workspace/summary.md.
```

If `summary.md` appears in `.\agent-workspace`, the file read/write loop is working.
