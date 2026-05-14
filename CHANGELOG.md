# Changelog

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
