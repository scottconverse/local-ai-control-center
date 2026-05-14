import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  Bot,
  BookOpen,
  Boxes,
  CheckCircle2,
  ExternalLink,
  FolderOpen,
  Globe,
  Loader2,
  MessageSquare,
  MonitorCog,
  Play,
  RefreshCw,
  Square,
  TerminalSquare,
  XCircle
} from "lucide-react";
import type { LocalAIStatus, ServiceName } from "./global";
import "./styles.css";

type View = "dashboard" | "openhands" | "openwebui" | "manual";

const fallbackStatus: LocalAIStatus = {
  docker: { ok: false, version: "Checking..." },
  ollama: { ok: false, models: "" },
  services: {
    openHands: { container: "unknown", url: "http://localhost:3000", reachable: false },
    openWebUi: { container: "unknown", url: "http://localhost:8080", reachable: false }
  },
  paths: {
    appRoot: "",
    workspaceDir: ""
  }
};

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`status-pill ${ok ? "ok" : "warn"}`}>
      {ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
      {label}
    </span>
  );
}

function EmptyWebFrame({ title, url }: { title: string; url: string }) {
  return (
    <div className="empty-frame">
      <Globe size={38} />
      <h2>{title}</h2>
      <p>Open this local interface in your browser if the embedded view is still starting.</p>
      <button className="primary" onClick={() => window.open(url, "_blank")}>
        <ExternalLink size={18} />
        Open {title}
      </button>
    </div>
  );
}

function App() {
  const [view, setView] = useState<View>("dashboard");
  const [status, setStatus] = useState<LocalAIStatus>(fallbackStatus);
  const [busy, setBusy] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState("Ready.");

  const models = useMemo(() => {
    return status.ollama.models
      .split("\n")
      .slice(1)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter(Boolean);
  }, [status.ollama.models]);

  async function refresh() {
    setBusy("refresh");
    try {
      const nextStatus = await window.localAI.getStatus();
      setStatus(nextStatus);
      setLastMessage("Status refreshed.");
    } catch (error) {
      setLastMessage(error instanceof Error ? error.message : "Could not refresh status.");
    } finally {
      setBusy(null);
    }
  }

  async function start(service: ServiceName) {
    setBusy(`start-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Starting ${label}...`);
    const result = await window.localAI.startService(service);
    setLastMessage(result.ok ? `${label} started.` : result.stderr || `Could not start ${label}.`);
    await refresh();
  }

  async function stop(service: ServiceName) {
    setBusy(`stop-${service}`);
    const label = service === "openhands" ? "OpenHands" : "Open WebUI";
    setLastMessage(`Stopping ${label}...`);
    const result = await window.localAI.stopService(service);
    setLastMessage(result.ok ? `${label} stopped.` : result.stderr || `Could not stop ${label}.`);
    await refresh();
  }

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const openHandsReady = status.services.openHands.reachable;
  const openWebUiReady = status.services.openWebUi.reachable;

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
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            <MonitorCog size={19} />
            Dashboard
          </button>
          <button className={view === "openhands" ? "active" : ""} onClick={() => setView("openhands")}>
            <TerminalSquare size={19} />
            OpenHands
          </button>
          <button className={view === "openwebui" ? "active" : ""} onClick={() => setView("openwebui")}>
            <MessageSquare size={19} />
            Open WebUI
          </button>
          <button className={view === "manual" ? "active" : ""} onClick={() => setView("manual")}>
            <BookOpen size={19} />
            Manual
          </button>
        </nav>

        <div className="sidebar-actions">
          <button onClick={() => window.localAI.openExternal("workspace")}>
            <FolderOpen size={18} />
            Workspace
          </button>
          <button onClick={() => window.localAI.openExternal("manual")}>
            <ExternalLink size={18} />
            Manual File
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h2>
              {view === "dashboard" && "Dashboard"}
              {view === "openhands" && "OpenHands Agent"}
              {view === "openwebui" && "Open WebUI Chat"}
              {view === "manual" && "Manual"}
            </h2>
            <p>{lastMessage}</p>
          </div>
          <button className="refresh" onClick={refresh} disabled={busy === "refresh"}>
            {busy === "refresh" ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
            Refresh
          </button>
        </header>

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
                  <dd>openai/qwen2.5-coder:14b</dd>
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
                  <dd>gemma4-26b-8k</dd>
                  <dt>Local URL</dt>
                  <dd>{status.services.openWebUi.url}</dd>
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
          </section>
        )}

        {view === "openhands" && (
          <section className="embedded">
            {openHandsReady ? (
              <webview className="webview" src={status.services.openHands.url} />
            ) : (
              <EmptyWebFrame title="OpenHands" url={status.services.openHands.url} />
            )}
          </section>
        )}

        {view === "openwebui" && (
          <section className="embedded">
            {openWebUiReady ? (
              <webview className="webview" src={status.services.openWebUi.url} />
            ) : (
              <EmptyWebFrame title="Open WebUI" url={status.services.openWebUi.url} />
            )}
          </section>
        )}

        {view === "manual" && (
          <section className="manual-view">
            <article className="panel manual-panel">
              <BookOpen size={34} />
              <h3>How to use this setup</h3>
              <p>
                The full manual is stored beside the app so it can be opened, edited, and committed with the
                project. It covers first run, workspace rules, model choices, troubleshooting, and safe usage.
              </p>
              <div className="button-row">
                <button className="primary" onClick={() => window.localAI.openExternal("manual")}>
                  <ExternalLink size={18} />
                  Open Manual
                </button>
                <button onClick={() => window.localAI.openExternal("workspace")}>
                  <FolderOpen size={18} />
                  Open Workspace
                </button>
              </div>
            </article>
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
