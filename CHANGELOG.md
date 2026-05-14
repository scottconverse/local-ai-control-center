# Changelog

## 0.2.0 - 2026-05-14

- Added a first-run setup wizard that scans CPU, system RAM, disk space, NVIDIA GPU, and available VRAM before setup.
- Added GUI setup actions for installing Docker Desktop and Ollama through `winget` when available, with official-download fallback.
- Added GUI preparation steps for pulling required Ollama models and Docker images.
- Added setup finish flow to start OpenHands and Open WebUI after prerequisites and assets are ready.
- Added regression checks for setup wizard IPC, hardware requirements, and user-facing setup documentation.

## 0.1.3 - 2026-05-14

- Rewrote `USER_MANUAL.md` in a more professional, human-friendly format with tables, clearer workflows, and fewer raw command blocks.
- Removed the remaining internal GitHub Actions/minutes language from the app UI.
- Added regression checks for app UI copy and manual structure.

## 0.1.2 - 2026-05-14

- Split unit/build checks from environment-dependent service smoke checks.
- Removed internal project-state and roadmap language from user-facing docs.
- Added `DEVELOPER.md` and `CONTRIBUTING.md`.
- Updated the landing page status section so shipped hardening work is no longer listed as future work.
- Added GUI prerequisite messaging, configured model/image display, service-starting state, and safer external window handling.
- Added regression tests for stale landing content, user-doc leakage, runner split, status config, and window handling.

## 0.1.1 - 2026-05-14

- Added Docker command discovery with `DOCKER_EXE`, `DOCKER_PATH`, `PATH`, and Docker Desktop fallback support.
- Pinned Open WebUI to `ghcr.io/open-webui/open-webui:v0.9.5`.
- Kept OpenHands and Open WebUI bound to `127.0.0.1`.
- Replaced placeholder tests with launcher/config regression checks.
- Added an honest static landing page.

## 0.1.0 - 2026-05-14

- Added the initial Electron desktop control center.
- Added OpenHands and Open WebUI launchers.
- Added local workspace mounting for OpenHands.
- Added local runner and local LLM smoke scripts.
