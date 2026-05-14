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

  it("tracks the patch release version for the safety fix", () => {
    const packageJson = JSON.parse(read("package.json")) as { version: string };
    expect(packageJson.version).toBe("0.2.2");
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
    expect(mainProcess).toContain("setWindowOpenHandler");
    expect(mainProcess).toContain("Unsupported external target");
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
    expect(landing).toContain("First Run screenshot and install-flow diagrams");
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
});
