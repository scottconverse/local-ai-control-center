import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import {
  diskHardwareCheck,
  gpuHardwareCheck,
  type HardwareCheck,
  memoryHardwareCheck,
  okCheck,
  minimumFreeDiskGb,
  minimumFreeVramGb,
  minimumSystemRamGb,
  minimumTotalVramGb,
  parseOllamaListNames,
  parseOllamaTags
} from "./setup-logic";
import { commandExitMessage, commandLine, commandResult, timeoutMessage, type CommandResult, type SetupOutput } from "./stream-logic";

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

function emitSetupOutput(sender: Electron.WebContents | undefined, output: SetupOutput) {
  if (!sender || sender.isDestroyed()) {
    return;
  }
  sender.send("setup:output", output);
}

function streamRun(
  sender: Electron.WebContents | undefined,
  action: string,
  command: string,
  args: string[],
  timeout = 120_000
): Promise<CommandResult> {
  const shouldAppendDockerFallback = !process.env.DOCKER_EXE && !process.env.DOCKER_PATH && existsSync(fallbackDockerBin);
  const pathValue = shouldAppendDockerFallback ? `${fallbackDockerBin};${process.env.PATH ?? ""}` : process.env.PATH;
  const stdout: string[] = [];
  const stderr: string[] = [];

  emitSetupOutput(sender, { action, stream: "system", text: commandLine(command, args) });

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: {
        ...process.env,
        PATH: pathValue
      }
    });
    const timer = setTimeout(() => {
      stderr.push(timeoutMessage(timeout));
      emitSetupOutput(sender, { action, stream: "stderr", text: stderr[stderr.length - 1] + "\n" });
      child.kill();
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      emitSetupOutput(sender, { action, stream: "stdout", text });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      emitSetupOutput(sender, { action, stream: "stderr", text });
    });
    child.on("error", (error) => {
      const text = error.message;
      stderr.push(text);
      emitSetupOutput(sender, { action, stream: "stderr", text: `${text}\n` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      emitSetupOutput(sender, { action, stream: "system", text: commandExitMessage(code) });
      resolve(commandResult(code, stdout, stderr));
    });
  });
}

async function fetchText(url: string): Promise<{ ok: boolean; text: string }> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(4_000) });
    return { ok: response.ok, text: response.ok ? await response.text() : "" };
  } catch {
    return { ok: false, text: "" };
  }
}

async function fetchOk(url: string): Promise<boolean> {
  return (await fetchText(url)).ok;
}

async function getContainerStatus(name: string): Promise<string> {
  const result = await run(dockerExe, ["inspect", "-f", "{{.State.Status}}", name], 20_000);
  return result.ok ? result.stdout : "not-found";
}

async function portAvailable(port: number, containerName: string): Promise<CommandResult> {
  const owner = await run(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `$c=Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($c) { $p=Get-Process -Id $c.OwningProcess -ErrorAction SilentlyContinue; "$($c.OwningProcess)|$($p.ProcessName)" }`
    ],
    20_000
  );
  if (!owner.ok || !owner.stdout) {
    return { ok: true, stdout: "", stderr: "" };
  }

  const status = await getContainerStatus(containerName);
  if (status === "running") {
    return { ok: true, stdout: "", stderr: "" };
  }

  const [pid, name] = owner.stdout.split("|");
  return {
    ok: false,
    stdout: "",
    stderr: `Port ${port} is already in use by ${name || "another process"}${pid ? ` (PID ${pid})` : ""}. Close that app or change its port before starting this service.`
  };
}

async function startPowerShellScript(scriptName: string, sender?: Electron.WebContents, action = "start-services"): Promise<CommandResult> {
  const scriptPath = path.join(appRoot, scriptName);
  if (sender) {
    return streamRun(sender, action, "powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", scriptPath], 900_000);
  }
  return run("powershell.exe", ["-ExecutionPolicy", "Bypass", "-File", scriptPath], 900_000);
}

async function startServiceWithPreflight(service: "openhands" | "openwebui"): Promise<CommandResult> {
  const port = service === "openhands" ? 3000 : 8080;
  const container = service === "openhands" ? "openhands-app" : "open-webui";
  const portCheck = await portAvailable(port, container);
  if (!portCheck.ok) {
    return portCheck;
  }
  return startPowerShellScript(service === "openhands" ? "start-openhands.ps1" : "start-openwebui.ps1");
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
  return memoryHardwareCheck(total, free, result.ok);
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
  return diskHardwareCheck(free, total, drive, result.ok);
}

async function getGpuCheck(): Promise<HardwareCheck> {
  const result = await run("nvidia-smi.exe", ["--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"], 20_000);
  return gpuHardwareCheck(result.stdout, result.ok);
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

async function installWithWinget(id: string, fallbackUrl: string, sender?: Electron.WebContents, action = "install"): Promise<CommandResult> {
  const winget = await run("winget.exe", ["--version"], 20_000);
  if (!winget.ok) {
    await shell.openExternal(fallbackUrl);
    return {
      ok: false,
      stdout: "",
      stderr: `winget was not found, so the official download page was opened instead: ${fallbackUrl}`
    };
  }
  return streamRun(sender, action, "winget.exe", ["install", "--exact", "--id", id, "--accept-package-agreements", "--accept-source-agreements"], 1_800_000);
}

async function pullRequiredModels(sender?: Electron.WebContents): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const model of requiredModels) {
    const result = await streamRun(sender, "pull-models", ollamaExe, ["pull", model], 3_600_000);
    outputs.push(`> ollama pull ${model}\n${result.stdout || result.stderr}`);
    if (!result.ok) {
      return { ok: false, stdout: outputs.join("\n\n"), stderr: result.stderr };
    }
  }
  return { ok: true, stdout: outputs.join("\n\n"), stderr: "" };
}

async function pullRequiredDockerImages(sender?: Electron.WebContents): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const image of requiredDockerImages) {
    const result = await streamRun(sender, "pull-images", dockerExe, ["pull", image], 3_600_000);
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
  const [dockerVersion, openHandsStatus, openWebUiStatus, ollamaTagsResult, openHandsOk, openWebUiOk, modelsResult, ollamaVersion] =
    await Promise.all([
      run(dockerExe, ["--version"], 20_000),
      getContainerStatus("openhands-app"),
      getContainerStatus("open-webui"),
      fetchText(`${ollamaApiUrl}/api/tags`),
      fetchOk(openHandsUrl),
      fetchOk(openWebUiUrl),
      run(ollamaExe, ["list"], 20_000),
      run(ollamaExe, ["--version"], 20_000)
    ]);
  const apiModels = parseOllamaTags(ollamaTagsResult.text);
  const modelNames = apiModels.length ? apiModels : parseOllamaListNames(modelsResult.stdout);

  return {
    docker: {
      ok: dockerVersion.ok,
      version: dockerVersion.stdout || dockerVersion.stderr,
      executable: dockerExe,
      message: dockerVersion.ok ? "Docker command is available." : "Docker was not found. Set DOCKER_EXE to your Docker-compatible executable path."
    },
    ollama: {
      ok: ollamaTagsResult.ok && (modelsResult.ok || apiModels.length > 0),
      models: modelsResult.stdout,
      modelNames,
      executable: ollamaExe,
      version: ollamaVersion.stdout || ollamaVersion.stderr,
      message: ollamaTagsResult.ok && (modelsResult.ok || apiModels.length > 0) ? "Ollama is reachable." : "Ollama is not reachable. Start Ollama and confirm it is available on port 11434."
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

ipcMain.handle("system:runSetupAction", async (event, action: string) => {
  const sender = event.sender;
  emitSetupOutput(sender, { action, stream: "system", text: `Starting ${action}...\n` });
  switch (action) {
    case "install-docker":
      return installWithWinget("Docker.DockerDesktop", "https://www.docker.com/products/docker-desktop/", sender, action);
    case "install-ollama":
      return installWithWinget("Ollama.Ollama", "https://ollama.com/download", sender, action);
    case "pull-models":
      return pullRequiredModels(sender);
    case "pull-images":
      return pullRequiredDockerImages(sender);
    case "start-services": {
      const [openHandsPort, openWebUiPort] = await Promise.all([portAvailable(3000, "openhands-app"), portAvailable(8080, "open-webui")]);
      const blocked = [openHandsPort, openWebUiPort].filter((result) => !result.ok);
      if (blocked.length) {
        return { ok: false, stdout: "", stderr: blocked.map((result) => result.stderr).join("\n") };
      }
      const [openHands, openWebUi] = await Promise.all([
        startPowerShellScript("start-openhands.ps1", sender, "openhands"),
        startPowerShellScript("start-openwebui.ps1", sender, "open-webui")
      ]);
      return {
        ok: openHands.ok && openWebUi.ok,
        stdout: [openHands.stdout, openWebUi.stdout].filter(Boolean).join("\n\n"),
        stderr: [openHands.stderr, openWebUi.stderr].filter(Boolean).join("\n\n")
      };
    }
    default:
      throw new Error(`Unsupported setup action: ${action}`);
  }
});

ipcMain.handle("system:startService", async (_event, service: "openhands" | "openwebui") => {
  return startServiceWithPreflight(service);
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
