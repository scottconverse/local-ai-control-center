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
const requiredModels = [openHandsModel, openWebUiChatModel];
const requiredDockerImages = ["docker.openhands.dev/openhands/openhands:1.7", openWebUiImage];
const minimumSystemRamGb = 32;
const minimumFreeDiskGb = 80;
const minimumTotalVramGb = 16;
const minimumFreeVramGb = 14.5;

type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

type HardwareCheck = {
  ok: boolean;
  severity: "ok" | "warn" | "fail";
  label: string;
  value: string;
  detail: string;
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

function okCheck(label: string, value: string, detail: string): HardwareCheck {
  return { ok: true, severity: "ok", label, value, detail };
}

function failCheck(label: string, value: string, detail: string): HardwareCheck {
  return { ok: false, severity: "fail", label, value, detail };
}

async function getCpuName(): Promise<string> {
  const result = await run("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty Name)"], 20_000);
  return result.ok && result.stdout ? result.stdout : "Unknown CPU";
}

async function getMemoryCheck(): Promise<HardwareCheck> {
  const result = await run("powershell.exe", [
    "-NoProfile",
    "-Command",
    "$os=Get-CimInstance Win32_OperatingSystem; [math]::Round($os.TotalVisibleMemorySize/1MB,1).ToString() + '|' + [math]::Round($os.FreePhysicalMemory/1MB,1).ToString()"
  ], 20_000);
  const [totalRaw, freeRaw] = result.stdout.split("|");
  const total = Number.parseFloat(totalRaw);
  const free = Number.parseFloat(freeRaw);
  if (!result.ok || Number.isNaN(total)) {
    return failCheck("System RAM", "Unknown", "Could not read installed memory.");
  }
  if (total >= minimumSystemRamGb) {
    return okCheck("System RAM", `${total} GB`, `${Number.isNaN(free) ? "?" : free} GB free. Recommended minimum is ${minimumSystemRamGb} GB.`);
  }
  return failCheck("System RAM", `${total} GB`, `This stack is meant for hefty local AI boxes. Install at least ${minimumSystemRamGb} GB system RAM.`);
}

async function getDiskCheck(): Promise<HardwareCheck> {
  const drive = path.parse(appRoot).root.replace("\\", "");
  const result = await run("powershell.exe", [
    "-NoProfile",
    "-Command",
    `$d=Get-PSDrive -Name '${drive.replace(":", "")}'; [math]::Round($d.Free/1GB).ToString() + '|' + [math]::Round(($d.Used+$d.Free)/1GB).ToString()`
  ], 20_000);
  const [freeRaw, totalRaw] = result.stdout.split("|");
  const free = Number.parseFloat(freeRaw);
  const total = Number.parseFloat(totalRaw);
  if (!result.ok || Number.isNaN(free)) {
    return failCheck("Disk", "Unknown", "Could not read free disk space.");
  }
  if (free >= minimumFreeDiskGb) {
    return okCheck("Disk", `${free} GB free`, `${Number.isNaN(total) ? "?" : total} GB total on ${drive}. Recommended free space is ${minimumFreeDiskGb} GB.`);
  }
  return failCheck("Disk", `${free} GB free`, `Free at least ${minimumFreeDiskGb} GB before pulling models and Docker images.`);
}

async function getGpuCheck(): Promise<HardwareCheck> {
  const result = await run("nvidia-smi.exe", ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"], 20_000);
  if (!result.ok || !result.stdout) {
    return failCheck("GPU / VRAM", "Not detected", "NVIDIA GPU was not detected through nvidia-smi. OpenHands-ready local models need a CUDA GPU with about 16 GB available VRAM.");
  }

  const rows = result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, totalMb, freeMb] = line.split(",").map((part) => part.trim());
      return {
        name,
        totalGb: Number.parseFloat(totalMb) / 1024,
        freeGb: Number.parseFloat(freeMb) / 1024
      };
    })
    .filter((gpu) => !Number.isNaN(gpu.totalGb));
  const best = rows.sort((a, b) => b.totalGb - a.totalGb)[0];
  if (!best) {
    return failCheck("GPU / VRAM", "Unknown", "nvidia-smi responded, but the app could not parse VRAM details.");
  }

  const total = Math.round(best.totalGb * 10) / 10;
  const free = Math.round(best.freeGb * 10) / 10;
  if (total >= minimumTotalVramGb && free >= minimumFreeVramGb) {
    return okCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. This meets the local OpenHands target.`);
  }
  if (total >= minimumTotalVramGb) {
    return failCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. Close other GPU apps before pulling/running the recommended models.`);
  }
  return failCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. Recommended minimum is a CUDA GPU with ${minimumTotalVramGb} GB VRAM.`);
}

async function getSetupStatus() {
  const [cpuName, memory, disk, gpu, winget, dockerVersion, dockerPs, ollamaTags, dockerImages, ollamaModels] = await Promise.all([
    getCpuName(),
    getMemoryCheck(),
    getDiskCheck(),
    getGpuCheck(),
    run("winget.exe", ["--version"], 20_000),
    run(dockerExe, ["--version"], 20_000),
    run(dockerExe, ["ps"], 20_000),
    fetchOk(`${ollamaApiUrl}/api/tags`),
    run(dockerExe, ["images", "--format", "{{.Repository}}:{{.Tag}}"], 30_000),
    run(ollamaExe, ["list"], 30_000)
  ]);

  const cpu = okCheck("CPU", cpuName, "CPU brand detected. GPU and memory matter most for this stack.");
  const modelText = ollamaModels.stdout;
  const imageText = dockerImages.stdout;
  const models = requiredModels.map((name) => ({ name, installed: modelText.includes(name) }));
  const dockerImagesReady = requiredDockerImages.map((name) => ({ name, installed: imageText.includes(name) }));
  const dockerInstalled = dockerVersion.ok;
  const dockerRunning = dockerInstalled && dockerPs.ok;
  const ollamaRunning = ollamaTags && ollamaModels.ok;
  const hardwareOk = memory.ok && disk.ok && gpu.ok;
  const assetsOk = models.every((model) => model.installed) && dockerImagesReady.every((image) => image.installed);
  const ready = hardwareOk && dockerRunning && ollamaRunning && assetsOk;
  const nextSteps: string[] = [];

  if (!hardwareOk) nextSteps.push("Review the hardware findings before installing the stack.");
  if (!dockerInstalled) nextSteps.push("Install Docker Desktop.");
  else if (!dockerRunning) nextSteps.push("Start Docker Desktop and wait for the engine.");
  if (!ollamaRunning) nextSteps.push("Install or start Ollama.");
  if (ollamaRunning && models.some((model) => !model.installed)) nextSteps.push("Pull the required Ollama models.");
  if (dockerRunning && dockerImagesReady.some((image) => !image.installed)) nextSteps.push("Pull the Docker images.");
  if (ready) nextSteps.push("Start OpenHands and Open WebUI.");

  return {
    ready,
    summary: ready ? "This machine is ready for Local AI Control Center." : "Setup is not complete yet.",
    hardware: { cpu, memory, disk, gpu },
    tools: {
      winget: {
        ok: winget.ok,
        message: winget.ok ? `winget available (${winget.stdout})` : "winget was not found. The app can still open official download pages."
      },
      docker: {
        ok: dockerInstalled,
        running: dockerRunning,
        message: dockerInstalled
          ? dockerRunning
            ? "Docker is installed and the engine is responding."
            : "Docker is installed, but the engine is not responding yet."
          : "Docker Desktop is not installed or docker.exe is not on PATH."
      },
      ollama: {
        ok: ollamaModels.ok,
        running: ollamaRunning,
        message: ollamaRunning ? "Ollama is installed and reachable." : "Ollama is not installed or not reachable on port 11434."
      }
    },
    assets: {
      models,
      dockerImages: dockerImagesReady
    },
    nextSteps
  };
}

async function installWithWinget(id: string, fallbackUrl: string): Promise<CommandResult> {
  const winget = await run("winget.exe", ["--version"], 20_000);
  if (!winget.ok) {
    await shell.openExternal(fallbackUrl);
    return {
      ok: false,
      stdout: "",
      stderr: `winget was not found, so the official download page was opened instead: ${fallbackUrl}`
    };
  }
  return run("winget.exe", ["install", "--exact", "--id", id, "--accept-package-agreements", "--accept-source-agreements"], 1_800_000);
}

async function pullRequiredModels(): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const model of requiredModels) {
    const result = await run(ollamaExe, ["pull", model], 3_600_000);
    outputs.push(`> ollama pull ${model}\n${result.stdout || result.stderr}`);
    if (!result.ok) {
      return { ok: false, stdout: outputs.join("\n\n"), stderr: result.stderr };
    }
  }
  return { ok: true, stdout: outputs.join("\n\n"), stderr: "" };
}

async function pullRequiredDockerImages(): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const image of requiredDockerImages) {
    const result = await run(dockerExe, ["pull", image], 3_600_000);
    outputs.push(`> docker pull ${image}\n${result.stdout || result.stderr}`);
    if (!result.ok) {
      return { ok: false, stdout: outputs.join("\n\n"), stderr: result.stderr };
    }
  }
  return { ok: true, stdout: outputs.join("\n\n"), stderr: "" };
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

ipcMain.handle("system:getSetupStatus", async () => {
  return getSetupStatus();
});

ipcMain.handle("system:runSetupAction", async (_event, action: string) => {
  switch (action) {
    case "install-docker":
      return installWithWinget("Docker.DockerDesktop", "https://www.docker.com/products/docker-desktop/");
    case "install-ollama":
      return installWithWinget("Ollama.Ollama", "https://ollama.com/download");
    case "pull-models":
      return pullRequiredModels();
    case "pull-images":
      return pullRequiredDockerImages();
    case "start-services": {
      const openHands = await startPowerShellScript("start-openhands.ps1");
      if (!openHands.ok) return openHands;
      const openWebUi = await startPowerShellScript("start-openwebui.ps1");
      return {
        ok: openWebUi.ok,
        stdout: [openHands.stdout, openWebUi.stdout].filter(Boolean).join("\n\n"),
        stderr: openWebUi.stderr
      };
    }
    default:
      throw new Error(`Unsupported setup action: ${action}`);
  }
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
