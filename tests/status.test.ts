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
    expect(packageJson.version).toBe("0.1.2");
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
});
