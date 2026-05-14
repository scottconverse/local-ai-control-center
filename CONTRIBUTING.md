# Contributing

Thanks for helping improve Local AI Control Center.

## Before Opening A Pull Request

Run:

```powershell
npm run test:unit
```

If your change touches Docker/Ollama/OpenHands/Open WebUI runtime behavior, also run:

```powershell
npm run test:smoke
```

For release changes, run:

```powershell
npm run test:runner
npm run test:llm
npm run package:win
```

## Product Principles

- Keep the end-user path GUI-first.
- Keep local services bound to `127.0.0.1` unless the user deliberately opts into something else.
- Avoid floating Docker image tags.
- Do not add terminal-first instructions to `USER_MANUAL.md`; put developer commands in `DEVELOPER.md`.
- Add or update tests for safety-sensitive runtime behavior.
