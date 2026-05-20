import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("service launcher scripts", () => {
  it("binds OpenHands and Open WebUI to localhost only", () => {
    expect(read("start-openhands.ps1")).toContain("-p 127.0.0.1:3000:3000");
    expect(read("start-openwebui.ps1")).toContain("-p 127.0.0.1:8080:8080");
  });

  it("keeps Open WebUI restart behavior user-controlled", () => {
    const script = read("start-openwebui.ps1");
    expect(script).toContain("--restart unless-stopped");
    expect(script).not.toContain("--restart always");
  });

  it("pins Open WebUI to a version tag instead of main", () => {
    const script = read("start-openwebui.ps1");
    expect(script).toContain("ghcr.io/open-webui/open-webui:v0.9.5");
    expect(script).not.toContain("ghcr.io/open-webui/open-webui:main");
  });

  it("supports Docker executable overrides", () => {
    const openHandsScript = read("start-openhands.ps1");
    const openWebUiScript = read("start-openwebui.ps1");
    const mainProcess = read("electron/main.ts");

    for (const content of [openHandsScript, openWebUiScript, mainProcess]) {
      expect(content).toContain("DOCKER_EXE");
      expect(content).toContain("DOCKER_PATH");
    }
  });

  it("tracks the current release version", () => {
    const packageJson = JSON.parse(read("package.json")) as { version: string };
    expect(packageJson.version).toBe("0.5.5");
  });

  it("uses relative production assets so the packaged app is not blank", () => {
    const viteConfig = read("vite.config.ts");

    expect(viteConfig).toContain('base: "./"');
  });

  it("keeps the landing page status current with shipped hardening work", () => {
    const landing = read("landing/index.html");
    expect(landing).toContain("Docker command discovery and pinned Open WebUI image");
    expect(landing).not.toContain("Docker binary discovery instead of fixed install-path assumptions");
    expect(landing).not.toContain("Meaningful unit tests replacing placeholder coverage");
  });

  it("splits unit/build checks from service smoke checks", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(packageJson.scripts["test:unit"]).toBe("npm run lint && npm test && npm run build");
    expect(packageJson.scripts["test:runner"]).toBe("npm run test:unit && npm run test:smoke");
  });

  it("does not leak internal project-state notes into the user manual", () => {
    const manual = read("USER_MANUAL.md");
    expect(manual).not.toContain("GitHub Actions is disabled");
    expect(manual).not.toContain("If you want, the next upgrade");
  });

  it("does not leak internal project-state notes into the app UI", () => {
    const app = read("src/App.tsx");
    expect(app).not.toContain("Remote CI is disabled");
    expect(app).not.toContain("GitHub Actions minutes");
  });

  it("keeps the user manual readable with structured tables", () => {
    const manual = read("USER_MANUAL.md");
    expect(manual).toContain("| Area | What it does | When to use it |");
    expect(manual).toContain("| Problem | What to try |");
    expect(manual).toContain("| Path | Purpose |");
  });

  it("constrains new windows opened from embedded content", () => {
    const mainProcess = read("electron/main.ts");
    const ipcLogic = read("electron/ipc-logic.ts");
    expect(mainProcess).toContain("setWindowOpenHandler");
    expect(ipcLogic).toContain("Unsupported external target");
  });

  it("surfaces configured model and image values through status", () => {
    const mainProcess = read("electron/main.ts");
    const app = read("src/App.tsx");

    expect(mainProcess).toContain("openHandsModel");
    expect(mainProcess).toContain("openWebUiImage");
    expect(app).toContain("status.config.openHandsModel");
    expect(app).toContain("status.config.openWebUiImage");
  });

  it("adds first-run setup IPC for hardware checks and install actions", () => {
    const mainProcess = read("electron/main.ts");
    const setupLogic = read("electron/setup-logic.ts");
    const preload = read("electron/preload.ts");
    const globalTypes = read("src/global.d.ts");

    expect(setupLogic).toContain("minimumTotalVramGb = 16");
    expect(mainProcess).toContain("portAvailable");
    expect(mainProcess).toContain("getSetupStatus");
    expect(mainProcess).toContain("installWithWinget");
    expect(mainProcess).toContain("pullRequiredModels");
    expect(preload).toContain("getSetupStatus");
    expect(preload).toContain("runSetupAction");
    expect(globalTypes).toContain("SetupStatus");
  });

  it("keeps the setup wizard visible and hardware-gated in the renderer", () => {
    const app = read("src/App.tsx");

    expect(app).toContain('type View = "setup"');
    expect(app).toContain("First Run Setup");
    expect(app).toContain("GPU / VRAM");
    expect(app).toContain("Pull Models");
    expect(app).toContain("Start Both Services");
  });

  it("documents first-run setup and machine requirements for public users", () => {
    const readme = read("README.md");
    const manual = read("USER_MANUAL.md");
    const landing = read("landing/index.html");

    expect(readme).toContain("NVIDIA GPU with roughly 16 GB VRAM available");
    expect(readme).toContain("![Local AI Control Center dashboard]");
    expect(manual).toContain("## First Run Setup");
    expect(manual).toContain("| GPU / VRAM |");
    expect(landing).toContain("First-run setup wizard with hardware and VRAM checks");
    expect(landing).toContain("Port-conflict preflight before service starts");
    expect(landing).toContain("First Run visual preview and install-flow diagram");
    expect(landing).not.toContain("First Run screenshot and install-flow diagrams");
    expect(landing).not.toContain("Prerequisite setup flow for non-developer users");
    expect(landing).not.toContain("Port-conflict detection before service start");
  });

  it("clarifies local-only Open WebUI auth implications for non-technical users", () => {
    const manual = read("USER_MANUAL.md");

    expect(manual).toContain("Open WebUI has no login screen by default");
    expect(manual).toContain("Anyone who can reach port `8080` on your machine can use it");
  });

  it("adds accessibility and isolation metadata to embedded service views", () => {
    const app = read("src/App.tsx");

    expect(app).toContain('aria-label="Refresh status"');
    expect(app).toContain('title="OpenHands Agent"');
    expect(app).toContain('partition="persist:openhands"');
  });

  it("documents screenshot refresh expectations for contributors", () => {
    const contributing = read("CONTRIBUTING.md");

    expect(contributing).toContain("Refresh screenshots in `landing/assets/` when UI copy or visible dashboard state changes.");
  });

  it("streams setup output from main through preload into the first-run panel", () => {
    const mainProcess = read("electron/main.ts");
    const processLogic = read("electron/process-logic.ts");
    const preload = read("electron/preload.ts");
    const app = read("src/App.tsx");
    const globalTypes = read("src/global.d.ts");

    expect(mainProcess).toContain("setup:output");
    expect(mainProcess).toContain("streamRun");
    expect(processLogic).toContain("commandResult");
    expect(mainProcess).toContain("sender.isDestroyed()");
    expect(mainProcess).toContain("startPowerShellScript(\"start-openhands.ps1\", sender, \"openhands\")");
    expect(mainProcess).toContain("startPowerShellScript(\"start-openwebui.ps1\", sender, \"open-webui\")");
    expect(preload).toContain("onSetupOutput");
    expect(app).toContain("appendSetupOutput");
    expect(app).toContain("formatSetupOutput");
    expect(app).toContain("Live output streams below while the step runs.");
    expect(globalTypes).toContain("SetupOutput");
  });

  it("moves streaming setup logs from future work to working-now docs", () => {
    const readme = read("README.md");
    const manual = read("USER_MANUAL.md");
    const landing = read("landing/index.html");

    expect(readme).toContain("Streaming setup logs while long installs and downloads run.");
    expect(manual).toContain("Long setup actions stream live output");
    expect(landing).toContain("Live streaming setup logs for installs, model pulls, image pulls, and service starts");
    expect(landing).not.toContain("Streaming progress logs for long model and Docker pulls");
  });

  it("uses typed Ollama model names instead of renderer text parsing", () => {
    const mainProcess = read("electron/main.ts");
    const app = read("src/App.tsx");
    const globalTypes = read("src/global.d.ts");

    expect(mainProcess).toContain("modelNames");
    expect(globalTypes).toContain("modelNames: string[]");
    expect(globalTypes).not.toContain("models: string;");
    expect(app).toContain("status.ollama.modelNames");
    expect(app).not.toContain(".split(\"\\n\")");
  });

  it("keeps shared stream helpers in the renderer-safe source tree", () => {
    const mainProcess = read("electron/main.ts");
    const app = read("src/App.tsx");
    const streamLogic = read("src/stream-logic.ts");
    const developer = read("DEVELOPER.md");

    expect(mainProcess).toContain("../src/stream-logic");
    expect(app).toContain("./stream-logic");
    expect(streamLogic).toContain("formatSetupOutput");
    expect(developer).toContain("`src/stream-logic.ts` contains pure shared streaming helpers");
    expect(developer).toContain("Do not add Electron, Node-only, or filesystem dependencies to this module");
  });

  it("documents environment overrides and runtime behavior for users", () => {
    const manual = read("USER_MANUAL.md");
    const developer = read("DEVELOPER.md");

    expect(manual).toContain("Set `OLLAMA_EXE` to your Ollama executable path");
    expect(manual).toContain("Set `LOCAL_AI_APP_ROOT` to the app root directory");
    expect(manual).toContain("The Dashboard shows a **Restart required** badge");
    expect(manual).toContain("App closed during a model or image pull");
    expect(developer).toContain("OLLAMA_EXE");
    expect(developer).toContain("OLLAMA_PATH");
  });

  it("ships first-run orientation, setup memory, and actionable setup UI", () => {
    const app = read("src/App.tsx");
    const mainProcess = read("electron/main.ts");

    expect(app).toContain("This wizard checks your machine and sets it up for local AI work");
    expect(app).toContain("setup-progress");
    expect(app).toContain("Setup complete. You're ready to use Local AI Control Center.");
    expect(app).toContain("Docker Installed");
    expect(app).toContain("setupFailureGuidance");
    expect(mainProcess).toContain("setup-state.json");
    expect(mainProcess).toContain("system:markSetupComplete");
  });

  it("keeps timer refreshes from locking the manual refresh button", () => {
    const app = read("src/App.tsx");

    expect(app).toContain('type RefreshSource = "user" | "timer" | "initial" | "operation"');
    expect(app).toContain('if (source === "user")');
    expect(app).toContain('window.setInterval(() => void refresh("timer")');
  });

  it("opens a rendered manual and adds user-facing model and reset controls", () => {
    const mainProcess = read("electron/main.ts");
    const app = read("src/App.tsx");
    const preload = read("electron/preload.ts");
    const openHandsScript = read("start-openhands.ps1");
    const openWebUiScript = read("start-openwebui.ps1");

    expect(mainProcess).toContain("https://github.com/scottconverse/local-ai-control-center/blob/main/USER_MANUAL.md");
    expect(app).toContain("User Manual");
    expect(app).toContain("Model Settings And Reset Controls");
    expect(app).toContain("Custom model labels");
    expect(app).toContain("Recommendations are guessed from model names");
    expect(app).toContain("Show labels");
    expect(app).toContain("model-label-scroll");
    expect(preload).toContain("updateConfig");
    expect(preload).toContain("resetServiceData");
    expect(openHandsScript).toContain("$openHandsModel");
    expect(openWebUiScript).toContain("DEFAULT_MODELS");
  });

  it("documents packaged screenshots and keeps the public punch list empty", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const landing = read("landing/index.html");
    const readme = read("README.md");
    const manual = read("USER_MANUAL.md");
    const developer = read("DEVELOPER.md");

    expect(packageJson.scripts["screenshots:packaged"]).toBe("node scripts/capture-packaged-screenshots.cjs");
    expect(readme).toContain("Published landing page:");
    expect(readme).toContain("https://scottconverse.github.io/local-ai-control-center/landing/");
    expect(readme.indexOf("Published landing page:")).toBeLessThan(readme.indexOf("![Local AI Control Center dashboard]"));
    expect(readme.indexOf("Latest Windows download:")).toBeLessThan(readme.indexOf("![Local AI Control Center dashboard]"));
    expect(readme).not.toContain("Static landing page:");
    expect(landing).toContain("control-center-first-run.png");
    expect(landing).toContain("Packaged end-to-end screenshots captured from a clean user-data launch");
    expect(landing).toContain("No open items remain from the ordered punch list.");
    expect(landing).not.toContain("Next hardening pass");
    expect(readme).toContain("Editable labels and model-name recommendations");
    expect(manual).toContain("label installed local models");
    expect(manual).toContain("Custom model labels disappeared");
    expect(developer).toContain("npm run screenshots:packaged");
  });

  it("shows restart-required state and an in-app reset confirmation", () => {
    const app = read("src/App.tsx");

    expect(app).toContain("restartRequired");
    expect(app).toContain("Restart required");
    expect(app).toContain("modal-backdrop");
    expect(app).not.toContain("window.confirm");
  });
});
