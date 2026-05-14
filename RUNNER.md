# Local Runner

GitHub Actions is intentionally disabled for now because the account is out of Actions minutes.

The local runner is the source of truth.

## Double-click Runner

Use:

```text
C:\Users\scott\Desktop\local-ai-agent\Run Local Test Runner.vbs
```

This runs the test suite locally and opens the latest log in Notepad when it finishes.

Visible terminal version:

```text
C:\Users\scott\Desktop\local-ai-agent\Run Local Test Runner.cmd
```

## What It Runs

The standard local runner executes:

```powershell
npm run test:runner
```

That includes:

- TypeScript checks.
- Unit tests.
- Production build.
- Local service smoke checks for Ollama, OpenHands, and Open WebUI.

## Optional LLM Smoke

Run:

```powershell
npm run test:llm
```

This asks the local `qwen2.5-coder:14b` model to return a known token.

## Logs

Logs are written to:

```text
C:\Users\scott\Desktop\local-ai-agent\test-results
```

The latest run is always copied to:

```text
C:\Users\scott\Desktop\local-ai-agent\test-results\latest.log
```
