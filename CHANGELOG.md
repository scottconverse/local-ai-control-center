# Changelog

## 0.3.1 - 2026-05-14

- Added a destroyed-window guard before sending streamed setup output to the renderer.

## 0.3.0 - 2026-05-14

- Added live streaming setup output from the Electron main process to the First Run panel.
- Streamed `winget`, `ollama pull`, `docker pull`, and service-start script output through a safe preload subscription.
- Updated first-run setup copy so users know long installs and downloads are actively doing work.
- Moved streaming progress logs from the landing-page next-pass list to working-now.

## 0.2.3 - 2026-05-14

- Refreshed the dashboard screenshot used by the README and landing page so it no longer contains stale internal UI copy.
- Added memory and disk pass-path coverage to the setup logic tests.
- Added a contributor rule to refresh screenshots when visible UI copy changes.

## 0.2.2 - 2026-05-14

- Added more behavioral tests for setup edge cases: multi-GPU selection, missing `nvidia-smi`, and malformed Ollama tags JSON.
- Added an inflight guard so scheduled status polling cannot stack overlapping refresh requests.
- Added the dashboard screenshot to the README for GitHub visitors.
- Narrowed the landing-page next-pass visual item to the remaining First Run screenshot and install-flow diagram work.

## 0.2.1 - 2026-05-14

- Added behavioral tests for setup hardware parsing, VRAM thresholds, memory/disk gates, and Ollama tag parsing.
- Added port-conflict preflight checks before starting OpenHands or Open WebUI.
- Parallelized the setup action that starts both local services.
- Replaced dashboard model parsing with Ollama's JSON tags API where available.
- Cleared stale operation banners on view navigation and added small accessibility/session isolation polish.
- Clarified that `WEBUI_AUTH=False` means Open WebUI has no login screen by default.

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
