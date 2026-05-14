export type ServiceName = "openhands" | "openwebui";

export type LocalAIStatus = {
  docker: {
    ok: boolean;
    version: string;
  };
  ollama: {
    ok: boolean;
    models: string;
  };
  services: {
    openHands: {
      container: string;
      url: string;
      reachable: boolean;
    };
    openWebUi: {
      container: string;
      url: string;
      reachable: boolean;
    };
  };
  paths: {
    appRoot: string;
    workspaceDir: string;
  };
};

declare global {
  interface Window {
    localAI: {
      getStatus: () => Promise<LocalAIStatus>;
      startService: (service: ServiceName) => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      stopService: (service: ServiceName) => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      runTestCommand: (command: "runner" | "llm") => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      openExternal: (target: "workspace" | "manual" | "openhands" | "openwebui") => Promise<void>;
    };
  }
}
