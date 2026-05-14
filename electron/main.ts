import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

const fallbackDockerBin = "C:\\Program Files\\Docker\\Docker\\resources\\bin";
const fallbackDockerExe = path.join(fallbackDockerBin, "docker.exe");
const fallbackOllamaExe = path.join(process.env.LOCALAPPDATA ?? "", "Programs", "Ollama", "ollama.exe");
const dockerExe =
  process.env.DOCKER_EXE ||
  process.env.DOCKER_PATH ||
  (existsSync(fallbackDockerExe) ? fallbackDockerExe : "docker.exe");
const ollamaExe = process.env.OLLAMA_EXE || process.env.OLLAMA_PATH || (existsSync(fallbackOllamaExe) ? fallbackOllamaExe : "ollama.exe");
const appRoot = path.resolve(__dirname, "..");
const workspaceDir = path.join(appRoot, "agent-workspace");
const openHandsUrl = "http://localhost:3000";
const openWebUiUrl = "http://localhost:8080";
const ollamaApiUrl = "http://127.0.0.1:11434";
const openHandsModel = "openai/qwen2.5-coder:14b";
const openWebUiChatModel = "gemma4-26b-8k";
const openWebUiImage = "ghcr.io/open-webui/open-webui:v0.9.5";

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

async function run(command: string, args: string[], timeout = 120_000): Promise<CommandResult> {
  const shouldAppendDockerFallback = !process.env.DOCKER_EXE && !process.env.DOCKER_PATH && existsSync(fallbackDockerBin);
  const pathValue = shouldAppendDockerFallback ? `${fallbackDockerBin};${process.env.PATH ?? ""}` : process.env.PATH;

  try {
    const result = await execFileAsync(command, args, {
      timeout,
      windowsHide: true,
      env: {
        ...process.env,
        PATH: pathValue
      }
    });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: err.stdout?.trim() ?? "",
      stderr: err.stderr?.trim() || err.message
    };
  }
}

async function fetchOk(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function getContainerStatus(name: string): Promise<string> {
  const result = await run(dockerExe, ["inspect", "-f", "{{.State.Status}}", name], 20_000);
  return result.ok ? result.stdout : "not-found";
}

async function startPowerShellScript(scriptName: string): Promise<CommandResult> {
  const scriptPath = path.join(appRoot, scriptName);
  return run("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", scriptPath], 900_000);
}

async function createWindow() {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    backgroundColor: "#f6f4ef",
    title: "Local AI Control Center",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(openHandsUrl) || url.startsWith(openWebUiUrl)) {
      return { action: "allow" };
    }
    void shell.openExternal(url);
    return { action: "deny" };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    await window.loadURL(devServerUrl);
  } else {
    await window.loadFile(path.join(appRoot, "dist", "index.html"));
  }
}

app.whenReady().then(async () => {
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("system:getStatus", async () => {
  await fs.mkdir(workspaceDir, { recursive: true });
  const [dockerVersion, openHandsStatus, openWebUiStatus, ollamaOk, openHandsOk, openWebUiOk, modelsResult, ollamaVersion] =
    await Promise.all([
      run(dockerExe, ["--version"], 20_000),
      getContainerStatus("openhands-app"),
      getContainerStatus("open-webui"),
      fetchOk(`${ollamaApiUrl}/api/tags`),
      fetchOk(openHandsUrl),
      fetchOk(openWebUiUrl),
      run(ollamaExe, ["list"], 20_000),
      run(ollamaExe, ["--version"], 20_000)
    ]);

  return {
    docker: {
      ok: dockerVersion.ok,
      version: dockerVersion.stdout || dockerVersion.stderr,
      executable: dockerExe,
      message: dockerVersion.ok ? "Docker command is available." : "Docker was not found. Set DOCKER_EXE to your Docker-compatible executable path."
    },
    ollama: {
      ok: ollamaOk && modelsResult.ok,
      models: modelsResult.stdout,
      executable: ollamaExe,
      version: ollamaVersion.stdout || ollamaVersion.stderr,
      message: ollamaOk && modelsResult.ok ? "Ollama is reachable." : "Ollama is not reachable. Start Ollama and confirm it is available on port 11434."
    },
    services: {
      openHands: {
        container: openHandsStatus,
        url: openHandsUrl,
        reachable: openHandsOk
      },
      openWebUi: {
        container: openWebUiStatus,
        url: openWebUiUrl,
        reachable: openWebUiOk
      }
    },
    paths: {
      appRoot,
      workspaceDir
    },
    config: {
      openHandsModel,
      openWebUiChatModel,
      openWebUiImage
    }
  };
});

ipcMain.handle("system:startService", async (_event, service: "openhands" | "openwebui") => {
  return startPowerShellScript(service === "openhands" ? "start-openhands.ps1" : "start-openwebui.ps1");
});

ipcMain.handle("system:stopService", async (_event, service: "openhands" | "openwebui") => {
  const container = service === "openhands" ? "openhands-app" : "open-webui";
  return run(dockerExe, ["stop", container], 120_000);
});

ipcMain.handle("system:openExternal", async (_event, target: string) => {
  const targets: Record<string, () => Promise<void>> = {
    workspace: async () => {
      await shell.openPath(workspaceDir);
    },
    manual: async () => {
      await shell.openPath(path.join(appRoot, "USER_MANUAL.md"));
    },
    openhands: async () => {
      await shell.openExternal(openHandsUrl);
    },
    openwebui: async () => {
      await shell.openExternal(openWebUiUrl);
    }
  };

  const handler = targets[target];
  if (!handler) {
    throw new Error(`Unsupported external target: ${target}`);
  }
  await handler();
});

ipcMain.handle("system:runTestCommand", async (_event, command: "runner" | "llm") => {
  const args = command === "runner" ? ["run", "test:runner"] : ["run", "test:llm"];
  return run("npm.cmd", args, command === "runner" ? 900_000 : 240_000);
});
