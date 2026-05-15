# Changelog

## 0.5.3 - 2026-05-15

- Added the live GitHub Pages landing URL to the README.
- Filled in the public GitHub repository description, homepage, and topics.

## 0.5.2 - 2026-05-14

- Added React coverage for both directions of the custom label editor show/hide toggle.
- Documented the current refresh behavior in tests: unsaved custom label edits are replaced by saved config on status refresh.

## 0.5.1 - 2026-05-14

- Added focused config-logic tests for custom model-label parsing, blank-label cleanup, and label preservation during model-only saves.
- Collapsed the custom model-label editor for large Ollama libraries and added a scroll-bounded expanded state.
- Documented where custom model labels are stored when troubleshooting missing labels after moving machines or profiles.

## 0.5.0 - 2026-05-14

- Added editable model labels so private or uncommon Ollama model names can have user-friendly Dashboard descriptions.
- Added keyword recommendations for code, chat, embedding, and vision model names that do not exactly match the default models.
- Covered the `startPowerShellScript` missing-file guard at the main-process callsite.
- Added real child-process integration tests for error-exit and streamed timeout behavior.
- Updated public docs and landing copy to reflect model labels and shipped process coverage.

## 0.4.3 - 2026-05-14

- Broadened model descriptions so common non-default local models get useful identity labels in the Dashboard.
- Added stream/process helper coverage for timeout result mapping and missing setup scripts before PowerShell launch.
- Renamed the user documentation regression test to match its expanded override/runtime scope.
- Updated the landing page next-pass list to reflect shipped model metadata heuristics.

## 0.4.2 - 2026-05-14

- Cleared restart-required badges after a successful service data reset.
- Split IPC, app-root, and setup-state helper tests into focused files and added missing fallback/state edge coverage.
- Documented `LOCAL_AI_APP_ROOT` troubleshooting and the model-settings restart requirement in the user manual.

## 0.4.1 - 2026-05-14

- Added restart-required indicators after model setting changes until affected services are restarted.
- Replaced the reset system confirmation dialog with an in-app confirmation modal.
- Hardened app-root resolution with an explicit override and tested parent-candidate fallback logic.
- Added setup-state version-mismatch tests and safer OpenHands reset result handling.
- Strengthened React tests by replacing positional button selectors and covering model save and reset-cancel behavior.

## 0.4.0 - 2026-05-14

- Reworked First Run into a guided setup flow with orientation copy, step progress, completion messaging, setup-complete memory, and clearer recovery guidance.
- Added rendered manual access through the browser instead of opening raw Markdown in the default file handler.
- Added Dashboard model settings and service data reset controls backed by persisted app configuration.
- Moved shared stream helpers into `src/stream-logic.ts` and made the Ollama CLI fallback parser robust to headerless output.
- Fixed background timer refreshes so they do not lock the manual Refresh button.
- Added IPC helper tests and React first-run component tests, raising local coverage to 48 tests.
- Updated the landing page with a First Run visual preview and install-flow diagram.

## 0.3.4 - 2026-05-14

- Removed the unused raw Ollama CLI output field from the renderer status type and IPC payload.
- Documented the shared `electron/stream-logic.ts` browser-safe boundary for contributors.
- Added Windows CRLF whitespace coverage for streamed setup log formatting.
- Renamed the version-pin test to use version-neutral wording and documented the `ollama list` header-row fallback assumption.

## 0.3.3 - 2026-05-14

- Confirmed the verbose local test count at 36 tests and extended fallback Ollama parser coverage for empty and header-only CLI output.
- Simplified the renderer model list by removing a passthrough memo around typed model names.
- Kept whitespace-only streamed setup log lines unprefixed for cleaner long-running pull output.

## 0.3.2 - 2026-05-14

- Extracted streaming log formatting and command-result helpers into a testable module.
- Added stream-logic tests for command formatting, timeout messages, result mapping, capped output, and setup log prefixes.
- Split setup streaming output from local runner output in the UI.
- Added per-action labels to streamed setup output, including separate OpenHands and Open WebUI service-start labels.
- Added typed Ollama `modelNames` status data so the renderer no longer parses a synthetic CLI text table.
- Documented Ollama executable overrides and background pull behavior when the app closes.

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
