import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bot,
  Boxes,
  CheckCircle2,
  Cpu,
  Download,
  ExternalLink,
  FolderOpen,
  Globe,
  HardDrive,
  Loader2,
  MessageSquare,
  MonitorCog,
  Play,
  RefreshCw,
  Server,
  Square,
  TerminalSquare,
  XCircle
} from "lucide-react";
import type { LocalAIConfig, LocalAIStatus, ResetTarget, ServiceName, SetupAction, SetupOutput, SetupStatus } from "./global";
import { appendCappedOutput, formatSetupOutput } from "./stream-logic";
import "./styles.css";

type View = "setup" | "dashboard" | "openhands" | "openwebui";
type RefreshSource = "user" | "timer" | "initial" | "operation";

const fallbackStatus: LocalAIStatus = {
  docker: { ok: false, version: "Checking...", executable: "docker.exe", message: "Checking Docker..." },
  ollama: { ok: false, modelNames: [], executable: "ollama.exe", version: "Checking...", message: "Checking Ollama..." },
  services: {
    openHands: { container: "unknown", url: "http://localhost:3000", reachable: false },
    openWebUi: { container: "unknown", url: "http://localhost:8080", reachable: false }
  },
  paths: {
    appRoot: "",
    workspaceDir: ""
  },
  config: {
    openHandsModel: "openai/qwen2.5-coder:14b",
    openWebUiChatModel: "gemma4-26b-8k",
    openWebUiImage: "ghcr.io/open-webui/open-webui:v0.9.5"
  }
};

const fallbackSetup: SetupStatus = {
  ready: false,
  summary: "Checking setup...",
  hardware: {
    cpu: { ok: true, severity: "warn", label: "CPU", value: "Checking...", detail: "Reading CPU details." },
    memory: { ok: false, severity: "warn", label: "System RAM", value: "Checking...", detail: "Reading installed memory." },
    disk: { ok: false, severity: "warn", label: "Disk", value: "Checking...", detail: "Reading free disk space." },
    gpu: { ok: false, severity: "warn", label: "GPU / VRAM", value: "Checking...", detail: "Reading NVIDIA VRAM." }
  },
  tools: {
    winget: { ok: false, message: "Checking winget..." },
    docker: { ok: false, running: false, message: "Checking Docker..." },
    ollama: { ok: false, running: false, message: "Checking Ollama..." }
  },
  assets: {
    models: [],
    dockerImages: []
  },
  nextSteps: ["Checking this machine."]
};

const modelDescriptions: Record<string, string> = {
  "openai/qwen2.5-coder:14b": "Code and project work",
  "gemma4-26b-8k": "General chat"
};

function StatusPill({ ok, label, message, onClick }: { ok: boolean; label: string; message: string; onClick: () => void }) {
  return (
    <button className={`status-pill ${ok ? "ok" : "warn"}`} title={ok ? `${label} is ready.` : message} onClick={onClick}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {label}
    </button>
  );
}

function EmptyWebFrame({ title, url, starting }: { title: string; url: string; starting: boolean }) {
  return (
    <div className="empty-frame">
      {starting ? <Loader2 className="spin" size={38} /> : <Globe size={38} />}
      <h2>{starting ? `${title} is starting` : title}</h2>
      <p>
        {starting
          ? "The container is running but the web interface is not ready yet. This can take a minute after first launch."
          : "Open this local interface in your browser if the embedded view is still starting."}
      </p>
      <button className="primary" onClick={() => window.open(url, "_blank")}>
        <ExternalLink size={18} />
        Open {title}
      </button>
    </div>
  );
}

function SetupCheckCard({
  icon,
  label,
  value,
  detail,
  severity
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  severity: "ok" | "warn" | "fail";
}) {
  const recovery =
    severity === "fail"
      ? label === "GPU / VRAM"
        ? "Next: close games, video tools, or other GPU-heavy apps, then click Refresh."
        : label === "System RAM"
          ? "Next: close heavy apps, then click Refresh. This stack works best with at least 32 GB RAM."
          : label === "Disk"
            ? "Next: free disk space on this drive, then click Refresh."
            : "Next: review this check, then click Refresh."
      : "";

  return (
    <article className={`setup-check ${severity}`}>
      <div className="setup-check-icon">{icon}</div>
      <div>
        <h4>{label}</h4>
        <strong>{value}</strong>
        <p>{detail}</p>
        {recovery && <p className="recovery">{recovery}</p>}
      </div>
    </article>
  );
}

function AssetRow({ name, installed }: { name: string; installed: boolean }) {
  return (
    <li className={installed ? "asset-ok" : "asset-missing"}>
      {installed ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      <span>{name}</span>
      <strong>{installed ? "Ready" : "Missing"}</strong>
    </li>
  );
}

export function App() {
  const [view, setView] = useState<View>("setup");
  const [status, setStatus] = useState<LocalAIStatus>(fallbackStatus);
  const [setup, setSetup] = useState<SetupStatus>(fallbackSetup);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState("Ready.");
  const [operationDetail, setOperationDetail] = useState("");
  const [setupOutput, setSetupOutput] = useState("No setup action has been started from this window yet.");
  const [runnerOutput, setRunnerOutput] = useState("No local runner has been started from this window yet.");
  const [setupCompleteMessage, setSetupCompleteMessage] = useState("");
  const [openHandsGuideDismissed, setOpenHandsGuideDismissed] = useState(() => window.localStorage.getItem("openhands-guide-dismissed") === "true");
  const [configDraft, setConfigDraft] = useState<LocalAIConfig>(fallbackStatus.config);
  const [restartRequired, setRestartRequired] = useState({ openhands: false, openwebui: false });
  const [pendingReset, setPendingReset] = useState<ResetTarget | null>(null);
  const refreshingRef = useRef(false);
  const userSelectedViewRef = useRef(false);

  const models = status.ollama.modelNames;

  async function refresh(source: RefreshSource = "user") {
    if (refreshingRef.current) {
      return;
    }
    refreshingRef.current = true;
    if (source === "user") {
      setBusy("refresh");
    }
    try {
      const [nextStatus, setupResult] = await Promise.all([window.localAI.getStatus(), window.localAI.getSetupStatus()]);
      let nextSetup = setupResult;
      const servicesReady = nextStatus.services.openHands.reachable && nextStatus.services.openWebUi.reachable;
      if (nextSetup.ready && servicesReady) {
        const memory = nextSetup.completedAt ? { completedAt: nextSetup.completedAt } : await window.localAI.markSetupComplete();
        nextSetup = { ...nextSetup, completedAt: memory.completedAt };
        setSetupCompleteMessage(`Setup complete. Last verified ${new Date(memory.completedAt).toLocaleString()}.`);
        if (!userSelectedViewRef.current && source === "initial") {
          setView("dashboard");
        }
      } else if (nextSetup.completedAt && !userSelectedViewRef.current && source === "initial") {
        setView("dashboard");
      }
      setStatus(nextStatus);
      setSetup(nextSetup);
      if (source === "user") {
        setLastMessage("Status refreshed.");
      }
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : "Could not refresh status.");
    } finally {
      refreshingRef.current = false;
      if (source === "user") {
        setBusy(null);
      }
    }
  }

  function setupFailureGuidance(action: SetupAction) {
    const guidance: Record<SetupAction, string> = {
      "install-docker": "If Windows blocked the installer, approve the prompt or open the official Docker Desktop download page, then click Install Docker again.",
      "install-ollama": "If the installer did not finish, approve the Windows prompt or open the Ollama download page, then click Install Ollama again.",
      "pull-models": "Keep Ollama running, check the log for the failed model name, then click Pull Models again. Completed downloads are reused.",
      "pull-images": "Keep Docker Desktop running, check the log for the failed image name, then click Pull Images again. Completed downloads are reused.",
      "start-services": "Check the port message above, close the conflicting app if one is named, then click Start Both Services again."
    };
    return guidance[action];
  }

  async function runSetup(action: SetupAction) {
    setBusy(`setup-${action}`);
    const labels: Record<SetupAction, string> = {
      "install-docker": "Installing Docker Desktop",
      "install-ollama": "Installing Ollama",
      "pull-models": "Pulling Ollama models",
      "pull-images": "Pulling Docker images",
      "start-services": "Starting local services"
    };
    setLastMessage(`${labels[action]}...`);
    setOperationDetail("This setup step can take several minutes. Keep this window open and approve any Windows installer prompts.");
    setSetupOutput("");
    const result = await window.localAI.runSetupAction(action);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n\n");
    setSetupOutput((current) => {
      const summary = result.ok ? `${labels[action]} complete.` : `${labels[action]} needs attention.`;
      if (current.trim()) {
        return `${current.trim()}\n\n${summary}`;
      }
      return output ? `${summary}\n${output}` : summary;
    });
    setLastMessage(result.ok ? `${labels[action]} complete.` : `${labels[action]} needs attention.`);
    setOperationDetail(result.ok ? "" : setupFailureGuidance(action));
    await refresh("operation");
    setBusy(null);
  }

  async function start(service: ServiceName) {
    setBusy(`start-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Starting ${label}...`);
    setOperationDetail("First launch may pull Docker images and can take several minutes. Keep this window open.");
    const result = await window.localAI.startService(service);
    setLastMessage(result.ok ? `${label} started.` : result.stderr || `Could not start ${label}.`);
    setOperationDetail(result.ok ? "" : "Check Docker Desktop, port availability, and the service logs if this repeats.");
    if (result.ok) {
      setRestartRequired((current) => ({ ...current, [service]: false }));
    }
    await refresh("operation");
    setBusy(null);
  }

  async function stop(service: ServiceName) {
    setBusy(`stop-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Stopping ${label}...`);
    setOperationDetail("");
    const result = await window.localAI.stopService(service);
    setLastMessage(result.ok ? `${label} stopped.` : result.stderr || `Could not stop ${label}.`);
    await refresh("operation");
    setBusy(null);
  }

  async function runTests(command: "runner" | "llm") {
    const label = command === "runner" ? "local runner" : "local LLM smoke";
    setBusy(`test-${command}`);
    setLastMessage(`Running ${label}...`);
    setRunnerOutput(`Running ${label}. This may take a minute.`);
    const result = await window.localAI.runTestCommand(command);
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n\n");
    setRunnerOutput(output || `${label} finished with no output.`);
    setLastMessage(result.ok ? `${label} passed.` : `${label} failed.`);
    setBusy(null);
  }

  async function saveConfig() {
    setBusy("config-save");
    setLastMessage("Saving model settings...");
    const nextConfig = await window.localAI.updateConfig(configDraft);
    setRestartRequired((current) => ({
      openhands: current.openhands || nextConfig.openHandsModel !== status.config.openHandsModel,
      openwebui: current.openwebui || nextConfig.openWebUiChatModel !== status.config.openWebUiChatModel
    }));
    setStatus((current) => ({ ...current, config: nextConfig }));
    setLastMessage("Model settings saved. Restart affected services for changes to take effect.");
    await refresh("operation");
    setBusy(null);
  }

  async function resetServiceData(target: ResetTarget) {
    const label = target === "openhands" ? "OpenHands" : "Open WebUI";
    setPendingReset(null);
    setBusy(`reset-${target}`);
    setLastMessage(`Resetting ${label} data...`);
    const result = await window.localAI.resetServiceData(target);
    setLastMessage(result.ok ? `${label} data reset.` : result.stderr || `${label} reset needs attention.`);
    setOperationDetail(result.ok ? "" : "Close the service, make sure Docker Desktop is running, then try the reset again.");
    await refresh("operation");
    setBusy(null);
  }

  function changeView(nextView: View) {
    userSelectedViewRef.current = true;
    setView(nextView);
    setOperationDetail("");
  }

  useEffect(() => {
    void refresh("initial");
    const timer = window.setInterval(() => void refresh("timer"), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setConfigDraft(status.config);
  }, [status.config]);

  useEffect(() => {
    function appendSetupOutput(output: SetupOutput) {
      setSetupOutput((current) => appendCappedOutput(current, formatSetupOutput(output)));
    }

    return window.localAI.onSetupOutput(appendSetupOutput);
  }, []);

  const openHandsReady = status.services.openHands.reachable;
  const openWebUiReady = status.services.openWebUi.reachable;
  const prerequisiteMessage = !status.docker.ok
    ? status.docker.message
    : !status.ollama.ok
      ? status.ollama.message
      : "";
  const missingModels = setup.assets.models.some((model) => !model.installed);
  const missingImages = setup.assets.dockerImages.some((image) => !image.installed);
  const hardwareReady = setup.hardware.memory.ok && setup.hardware.disk.ok && setup.hardware.gpu.ok;
  const setupActionRunning = busy?.startsWith("setup-");
  const workInProgress = Boolean(busy && busy !== "refresh");
  const servicesReady = openHandsReady && openWebUiReady;
  const setupComplete = setup.ready && servicesReady;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Bot size={28} />
          </div>
          <div>
            <h1>Local AI</h1>
            <p>Control Center</p>
          </div>
        </div>

        <nav>
          <button className={view === "setup" ? "active" : ""} onClick={() => changeView("setup")}>
            {workInProgress ? <Loader2 className="spin nav-spinner" size={19} /> : <Download size={19} />}
            First Run
          </button>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => changeView("dashboard")}>
            <MonitorCog size={19} />
            Dashboard
          </button>
          <button className={view === "openhands" ? "active" : ""} onClick={() => changeView("openhands")}>
            <TerminalSquare size={19} />
            OpenHands
          </button>
          <button className={view === "openwebui" ? "active" : ""} onClick={() => changeView("openwebui")}>
            <MessageSquare size={19} />
            Open WebUI
          </button>
        </nav>

        <div className="sidebar-actions">
          <button aria-label="Open workspace folder" onClick={() => window.localAI.openExternal("workspace")}>
            <FolderOpen size={18} />
            Workspace
          </button>
          <button aria-label="Open user manual file" onClick={() => window.localAI.openExternal("manual")}>
            <ExternalLink size={18} />
            User Manual
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h2>
              {view === "setup" && "First Run Setup"}
              {view === "dashboard" && "Dashboard"}
              {view === "openhands" && "OpenHands Agent"}
              {view === "openwebui" && "Open WebUI Chat"}
            </h2>
            <p>{lastMessage}</p>
          </div>
          <button className="refresh" aria-label="Refresh status" onClick={() => refresh("user")} disabled={!!busy}>
            {busy === "refresh" ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            Refresh
          </button>
        </header>

        {(busy?.startsWith("start-") || operationDetail || prerequisiteMessage) && (
          <div className={`notice ${!status.docker.ok || !status.ollama.ok ? "error" : ""}`}>
            {operationDetail || prerequisiteMessage}
          </div>
        )}

        {view === "setup" && (
          <section className="setup-page">
            <div className="setup-hero">
              <div>
                <p className="eyebrow">No-terminal onboarding</p>
                <h3>Make this machine ready for local agent work.</h3>
                <p>
                  This wizard checks your machine and sets it up for local AI work. It installs Docker Desktop and Ollama,
                  downloads the required models and container images, and starts both services. Follow the steps in order;
                  each one enables the next.
                </p>
              </div>
              <div className={`setup-verdict ${setup.ready ? "ready" : hardwareReady ? "partial" : "blocked"}`}>
                <strong>{setup.ready ? "Ready" : hardwareReady ? "Setup needed" : "Hardware check"}</strong>
                <span>{setup.summary}</span>
              </div>
            </div>

            {setupComplete && (
              <div className="completion-banner">
                <div>
                  <strong>Setup complete. You're ready to use Local AI Control Center.</strong>
                  <span>{setupCompleteMessage || setup.summary}</span>
                </div>
                <button className="primary" onClick={() => changeView("dashboard")}>
                  Go to Dashboard
                </button>
              </div>
            )}

            <div className="setup-progress">
              <span className={hardwareReady ? "done" : "active"}>1. Check machine</span>
              <span className={setup.tools.docker.running && setup.tools.ollama.running ? "done" : hardwareReady ? "active" : ""}>2. Install tools</span>
              <span className={!missingModels && !missingImages ? "done" : setup.tools.docker.running && setup.tools.ollama.running ? "active" : ""}>3. Pull assets</span>
              <span className={setupComplete ? "done" : !missingModels && !missingImages ? "active" : ""}>4. Start services</span>
            </div>

            <div className="section-heading">
              <span className="step-label">Step 1</span>
              <strong>Check Your Machine</strong>
            </div>

            <div className="setup-grid">
              <SetupCheckCard
                icon={<Cpu size={22} />}
                label={setup.hardware.cpu.label}
                value={setup.hardware.cpu.value}
                detail={setup.hardware.cpu.detail}
                severity={setup.hardware.cpu.severity}
              />
              <SetupCheckCard
                icon={<Boxes size={22} />}
                label={setup.hardware.memory.label}
                value={setup.hardware.memory.value}
                detail={setup.hardware.memory.detail}
                severity={setup.hardware.memory.severity}
              />
              <SetupCheckCard
                icon={<HardDrive size={22} />}
                label={setup.hardware.disk.label}
                value={setup.hardware.disk.value}
                detail={setup.hardware.disk.detail}
                severity={setup.hardware.disk.severity}
              />
              <SetupCheckCard
                icon={<MonitorCog size={22} />}
                label={setup.hardware.gpu.label}
                value={setup.hardware.gpu.value}
                detail={setup.hardware.gpu.detail}
                severity={setup.hardware.gpu.severity}
              />
            </div>

            <div className="grid two">
              <article className="panel">
                <div className="panel-title">
                  <Server size={22} />
                  <div>
                    <h3><span className="step-label">Step 2</span> Install Runtime Tools</h3>
                    <p>Use Windows installers from inside the app. Docker Desktop may ask for administrator approval.</p>
                  </div>
                </div>
                <ul className="setup-list">
                  <li>
                    <span>Installer helper</span>
                    <strong>{setup.tools.winget.message}</strong>
                  </li>
                  <li>
                    <span>Docker Desktop</span>
                    <strong>{setup.tools.docker.message}</strong>
                  </li>
                  <li>
                    <span>Ollama</span>
                    <strong>{setup.tools.ollama.message}</strong>
                  </li>
                </ul>
                <div className="button-row">
                  <button onClick={() => runSetup("install-docker")} disabled={!!busy || setup.tools.docker.running}>
                    {busy === "setup-install-docker" ? <Loader2 className="spin" size={17} /> : setup.tools.docker.running ? <CheckCircle2 size={17} /> : <Download size={17} />}
                    {setup.tools.docker.running ? "Docker Installed" : "Install Docker"}
                  </button>
                  <button onClick={() => runSetup("install-ollama")} disabled={!!busy || setup.tools.ollama.running}>
                    {busy === "setup-install-ollama" ? <Loader2 className="spin" size={17} /> : setup.tools.ollama.running ? <CheckCircle2 size={17} /> : <Download size={17} />}
                    {setup.tools.ollama.running ? "Ollama Installed" : "Install Ollama"}
                  </button>
                </div>
              </article>

              <article className="panel">
                <div className="panel-title">
                  <Boxes size={22} />
                  <div>
                    <h3><span className="step-label">Step 3</span> Prepare Models And Images</h3>
                    <p>Download the local model files and container images before starting services.</p>
                  </div>
                </div>
                <ul className="asset-list">
                  {setup.assets.models.map((model) => (
                    <AssetRow key={model.name} name={model.name} installed={model.installed} />
                  ))}
                  {setup.assets.dockerImages.map((image) => (
                    <AssetRow key={image.name} name={image.name} installed={image.installed} />
                  ))}
                </ul>
                <div className="button-row">
                  <button onClick={() => runSetup("pull-models")} disabled={!!busy || !setup.tools.ollama.running || !missingModels}>
                    {busy === "setup-pull-models" ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
                    Pull Models
                  </button>
                  <button onClick={() => runSetup("pull-images")} disabled={!!busy || !setup.tools.docker.running || !missingImages}>
                    {busy === "setup-pull-images" ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
                    Pull Images
                  </button>
                </div>
              </article>
            </div>

            <article className="panel runner-panel">
              <div className="panel-title">
                <CheckCircle2 size={22} />
                  <div>
                  <h3><span className="step-label">Step 4</span> Finish Setup</h3>
                  <p>When the checks are ready, start both services and run the local smoke check.</p>
                </div>
              </div>
              <ol className="steps">
                {setup.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div className="button-row">
                <button className="primary" onClick={() => runSetup("start-services")} disabled={!!busy || !hardwareReady || !setup.tools.docker.running || !setup.tools.ollama.running || missingModels || missingImages}>
                  {busy === "setup-start-services" ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
                  Start Both Services
                </button>
                <button onClick={() => runTests("runner")} disabled={!!busy}>
                  {busy === "test-runner" ? <Loader2 className="spin" size={17} /> : <CheckCircle2 size={17} />}
                  Run Local Runner
                </button>
              </div>
              {setupActionRunning && <p className="setup-footnote">Installer and download steps can take a while. Live output streams below while the step runs.</p>}
              <pre className="test-output">{setupOutput}</pre>
            </article>
          </section>
        )}

        {view === "dashboard" && (
          <section className="dashboard">
            <div className="health-row">
              <StatusPill ok={status.docker.ok} label="Docker" message={status.docker.message} onClick={() => changeView("setup")} />
              <StatusPill ok={status.ollama.ok} label="Ollama" message={status.ollama.message} onClick={() => changeView("setup")} />
              <StatusPill ok={openHandsReady} label="OpenHands" message={`Container: ${status.services.openHands.container}`} onClick={() => changeView("openhands")} />
              <StatusPill ok={openWebUiReady} label="Open WebUI" message={`Container: ${status.services.openWebUi.container}`} onClick={() => changeView("openwebui")} />
            </div>

            <article className="panel">
              <div className="panel-title">
                <Boxes size={22} />
                <div>
                  <h3>Model Settings And Reset Controls</h3>
                  <p>Choose the models this control center launches, then restart the affected services. Reset controls clear local saved service data.</p>
                </div>
              </div>
              <div className="settings-grid">
                <label>
                  <span>OpenHands model</span>
                  <input
                    list="local-models"
                    value={configDraft.openHandsModel}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, openHandsModel: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Open WebUI chat model</span>
                  <input
                    list="local-models"
                    value={configDraft.openWebUiChatModel}
                    onChange={(event) => setConfigDraft((current) => ({ ...current, openWebUiChatModel: event.target.value }))}
                  />
                </label>
                <datalist id="local-models">
                  {models.map((model) => (
                    <option key={model} value={model} />
                  ))}
                </datalist>
              </div>
              <div className="button-row">
                <button className="primary" onClick={saveConfig} disabled={!!busy}>
                  {busy === "config-save" ? <Loader2 className="spin" size={17} /> : <CheckCircle2 size={17} />}
                  Save Model Settings
                </button>
                <button onClick={() => setPendingReset("openhands")} disabled={!!busy}>
                  Reset OpenHands Data
                </button>
                <button onClick={() => setPendingReset("openwebui")} disabled={!!busy}>
                  Reset Open WebUI Data
                </button>
              </div>
            </article>

            <div className="grid two">
              <article className="panel service-panel">
                <div className="panel-title">
                  <TerminalSquare size={22} />
                  <div>
                    <h3>OpenHands</h3>
                    <p>Local agent for files, commands, and project work.</p>
                  </div>
                </div>
                <dl>
                  <dt>Status</dt>
                  <dd>{status.services.openHands.container}</dd>
                  <dt>Model</dt>
                  <dd>{status.config.openHandsModel} {restartRequired.openhands && <span className="restart-badge">Restart required</span>}</dd>
                  <dt>Workspace</dt>
                  <dd>{status.paths.workspaceDir || "agent-workspace"}</dd>
                </dl>
                <div className="button-row">
                  <button className="primary" onClick={() => start("openhands")} disabled={!!busy}>
                    <Play size={17} />
                    Start
                  </button>
                  <button onClick={() => stop("openhands")} disabled={!!busy}>
                    <Square size={17} />
                    Stop
                  </button>
                  <button onClick={() => window.localAI.openExternal("openhands")}>
                    <ExternalLink size={17} />
                    Browser
                  </button>
                </div>
              </article>

              <article className="panel service-panel">
                <div className="panel-title">
                  <MessageSquare size={22} />
                  <div>
                    <h3>Open WebUI</h3>
                    <p>Friendly chat surface for local Ollama models.</p>
                  </div>
                </div>
                <dl>
                  <dt>Status</dt>
                  <dd>{status.services.openWebUi.container}</dd>
                  <dt>Default chat model</dt>
                  <dd>{status.config.openWebUiChatModel} {restartRequired.openwebui && <span className="restart-badge">Restart required</span>}</dd>
                  <dt>Image</dt>
                  <dd>{status.config.openWebUiImage}</dd>
                </dl>
                <div className="button-row">
                  <button className="primary" onClick={() => start("openwebui")} disabled={!!busy}>
                    <Play size={17} />
                    Start
                  </button>
                  <button onClick={() => stop("openwebui")} disabled={!!busy}>
                    <Square size={17} />
                    Stop
                  </button>
                  <button onClick={() => window.localAI.openExternal("openwebui")}>
                    <ExternalLink size={17} />
                    Browser
                  </button>
                </div>
              </article>
            </div>

            <div className="grid two">
              <article className="panel">
                <div className="panel-title">
                  <Boxes size={22} />
                  <div>
                    <h3>Local Models</h3>
                    <p>Models currently visible to Ollama.</p>
                  </div>
                </div>
                <div className="model-list">
                  {models.length ? (
                    models.map((model) => (
                      <span key={model}>
                        <strong>{model}</strong>
                        {modelDescriptions[model] && <small>{modelDescriptions[model]}</small>}
                      </span>
                    ))
                  ) : (
                    <p className="empty-state">No models detected. Make sure Ollama is running, or go to First Run to pull the required models.</p>
                  )}
                </div>
              </article>

              <article className="panel">
                <div className="panel-title">
                  <Activity size={22} />
                  <div>
                    <h3>First Test</h3>
                    <p>Confirm the file loop without touching a terminal.</p>
                  </div>
                </div>
                <ol className="steps">
                  <li>Click Workspace and add a small text file.</li>
                  <li>Open the OpenHands tab.</li>
                  <li>Ask it to read the file and write /workspace/summary.md.</li>
                </ol>
              </article>
            </div>

            <article className="panel">
              <div className="panel-title">
                <CheckCircle2 size={22} />
                <div>
                  <h3>Prerequisites</h3>
                  <p>What the app can currently resolve on this machine.</p>
                </div>
              </div>
              <dl>
                <dt>Docker</dt>
                <dd>{status.docker.message}</dd>
                <dt>Docker exe</dt>
                <dd>{status.docker.executable}</dd>
                <dt>Ollama</dt>
                <dd>{status.ollama.message}</dd>
                <dt>Ollama exe</dt>
                <dd>{status.ollama.executable}</dd>
              </dl>
            </article>

            <article className="panel runner-panel">
              <div className="panel-title">
                <CheckCircle2 size={22} />
                <div>
                  <h3>Local Runner</h3>
                  <p>Run verification locally before publishing, packaging, or changing service behavior.</p>
                </div>
              </div>
              <div className="button-row">
                <button className="primary" onClick={() => runTests("runner")} disabled={!!busy}>
                  {busy === "test-runner" ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
                  Run Local Runner
                </button>
                <button onClick={() => runTests("llm")} disabled={!!busy}>
                  {busy === "test-llm" ? <Loader2 className="spin" size={17} /> : <Bot size={17} />}
                  Run LLM Smoke
                </button>
              </div>
              <pre className="test-output">{runnerOutput}</pre>
            </article>
          </section>
        )}

        {view === "openhands" && (
          <section className="embedded">
            {openHandsReady ? (
              <>
                {!openHandsGuideDismissed && (
                  <div className="webview-guide">
                    <span>Your files go in the workspace folder on this machine. Inside OpenHands they appear at /workspace. Ask OpenHands to inspect /workspace before making changes.</span>
                    <button
                      onClick={() => {
                        window.localStorage.setItem("openhands-guide-dismissed", "true");
                        setOpenHandsGuideDismissed(true);
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                <webview className="webview" title="OpenHands Agent" partition="persist:openhands" src={status.services.openHands.url} />
              </>
            ) : (
              <EmptyWebFrame
                title="OpenHands"
                url={status.services.openHands.url}
                starting={status.services.openHands.container === "running"}
              />
            )}
          </section>
        )}

        {view === "openwebui" && (
          <section className="embedded">
            {openWebUiReady ? (
              <webview className="webview" title="Open WebUI Chat" partition="persist:openwebui" src={status.services.openWebUi.url} />
            ) : (
              <EmptyWebFrame
                title="Open WebUI"
                url={status.services.openWebUi.url}
                starting={status.services.openWebUi.container === "running"}
              />
            )}
          </section>
        )}
      </main>
      {pendingReset && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reset-title">
          <div className="modal">
            <h3 id="reset-title">Reset {pendingReset === "openhands" ? "OpenHands" : "Open WebUI"} data?</h3>
            <p>This stops the service and removes saved local state. Use it when you want a clean slate or a service is stuck.</p>
            <div className="button-row">
              <button className="primary" onClick={() => resetServiceData(pendingReset)}>
                Reset data
              </button>
              <button onClick={() => setPendingReset(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
