import React, { useEffect, useMemo, useRef, useState } from "react";
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
import type { LocalAIStatus, ServiceName, SetupAction, SetupOutput, SetupStatus } from "./global";
import { appendCappedOutput, formatSetupOutput } from "../electron/stream-logic";
import "./styles.css";

type View = "setup" | "dashboard" | "openhands" | "openwebui";

const fallbackStatus: LocalAIStatus = {
  docker: { ok: false, version: "Checking...", executable: "docker.exe", message: "Checking Docker..." },
  ollama: { ok: false, models: "", modelNames: [], executable: "ollama.exe", version: "Checking...", message: "Checking Ollama..." },
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

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`status-pill ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {label}
    </span>
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
  return (
    <article className={`setup-check ${severity}`}>
      <div className="setup-check-icon">{icon}</div>
      <div>
        <h4>{label}</h4>
        <strong>{value}</strong>
        <p>{detail}</p>
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

function App() {
  const [view, setView] = useState<View>("setup");
  const [status, setStatus] = useState<LocalAIStatus>(fallbackStatus);
  const [setup, setSetup] = useState<SetupStatus>(fallbackSetup);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState("Ready.");
  const [operationDetail, setOperationDetail] = useState("");
  const [setupOutput, setSetupOutput] = useState("No setup action has been started from this window yet.");
  const [runnerOutput, setRunnerOutput] = useState("No local runner has been started from this window yet.");
  const refreshingRef = useRef(false);

  const models = useMemo(() => status.ollama.modelNames, [status.ollama.modelNames]);

  async function refresh() {
    if (refreshingRef.current) {
      return;
    }
    refreshingRef.current = true;
    setBusy("refresh");
    try {
      const [nextStatus, nextSetup] = await Promise.all([window.localAI.getStatus(), window.localAI.getSetupStatus()]);
      setStatus(nextStatus);
      setSetup(nextSetup);
      setLastMessage("Status refreshed.");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : "Could not refresh status.");
    } finally {
      refreshingRef.current = false;
      setBusy(null);
    }
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
    setOperationDetail(result.ok ? "" : output || "Check the setup step output below.");
    await refresh();
  }

  async function start(service: ServiceName) {
    setBusy(`start-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Starting ${label}...`);
    setOperationDetail("First launch may pull Docker images and can take several minutes. Keep this window open.");
    const result = await window.localAI.startService(service);
    setLastMessage(result.ok ? `${label} started.` : result.stderr || `Could not start ${label}.`);
    setOperationDetail(result.ok ? "" : "Check Docker Desktop, port availability, and the service logs if this repeats.");
    await refresh();
  }

  async function stop(service: ServiceName) {
    setBusy(`stop-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Stopping ${label}...`);
    setOperationDetail("");
    const result = await window.localAI.stopService(service);
    setLastMessage(result.ok ? `${label} stopped.` : result.stderr || `Could not stop ${label}.`);
    await refresh();
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

  function changeView(nextView: View) {
    setView(nextView);
    setOperationDetail("");
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

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
            <Download size={19} />
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
            Manual File
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
          <button className="refresh" aria-label="Refresh status" onClick={refresh} disabled={!!busy}>
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
                  The setup wizard reads the machine first, then installs or prepares the pieces Local AI Control Center needs:
                  Docker Desktop, Ollama, local models, and Docker images.
                </p>
              </div>
              <div className={`setup-verdict ${setup.ready ? "ready" : hardwareReady ? "partial" : "blocked"}`}>
                <strong>{setup.ready ? "Ready" : hardwareReady ? "Setup needed" : "Hardware check"}</strong>
                <span>{setup.summary}</span>
              </div>
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
                    <h3>Install Runtime Tools</h3>
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
                    {busy === "setup-install-docker" ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
                    Install Docker
                  </button>
                  <button onClick={() => runSetup("install-ollama")} disabled={!!busy || setup.tools.ollama.running}>
                    {busy === "setup-install-ollama" ? <Loader2 className="spin" size={17} /> : <Download size={17} />}
                    Install Ollama
                  </button>
                </div>
              </article>

              <article className="panel">
                <div className="panel-title">
                  <Boxes size={22} />
                  <div>
                    <h3>Prepare Models And Images</h3>
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
                  <h3>Finish Setup</h3>
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
              <StatusPill ok={status.docker.ok} label="Docker" />
              <StatusPill ok={status.ollama.ok} label="Ollama" />
              <StatusPill ok={openHandsReady} label="OpenHands" />
              <StatusPill ok={openWebUiReady} label="Open WebUI" />
            </div>

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
                  <dd>{status.config.openHandsModel}</dd>
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
                  <dd>{status.config.openWebUiChatModel}</dd>
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
                  {models.map((model) => (
                    <span key={model}>{model}</span>
                  ))}
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
              <webview className="webview" title="OpenHands Agent" partition="persist:openhands" src={status.services.openHands.url} />
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
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
