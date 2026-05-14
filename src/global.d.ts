export type ServiceName = "openhands" | "openwebui";
export type SetupAction = "install-docker" | "install-ollama" | "pull-models" | "pull-images" | "start-services";

export type LocalAIStatus = {
  docker: {
    ok: boolean;
    version: string;
    executable: string;
    message: string;
  };
  ollama: {
    ok: boolean;
    models: string;
    executable: string;
    version: string;
    message: string;
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
  config: {
    openHandsModel: string;
    openWebUiChatModel: string;
    openWebUiImage: string;
  };
};

export type HardwareCheck = {
  ok: boolean;
  severity: "ok" | "warn" | "fail";
  label: string;
  value: string;
  detail: string;
};

export type SetupStatus = {
  ready: boolean;
  summary: string;
  hardware: {
    cpu: HardwareCheck;
    memory: HardwareCheck;
    disk: HardwareCheck;
    gpu: HardwareCheck;
  };
  tools: {
    winget: { ok: boolean; message: string };
    docker: { ok: boolean; running: boolean; message: string };
    ollama: { ok: boolean; running: boolean; message: string };
  };
  assets: {
    models: Array<{ name: string; installed: boolean }>;
    dockerImages: Array<{ name: string; installed: boolean }>;
  };
  nextSteps: string[];
};

declare global {
  interface Window {
    localAI: {
      getStatus: () => Promise<LocalAIStatus>;
      getSetupStatus: () => Promise<SetupStatus>;
      runSetupAction: (action: SetupAction) => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      startService: (service: ServiceName) => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      stopService: (service: ServiceName) => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      runTestCommand: (command: "runner" | "llm") => Promise<{ ok: boolean; stdout: string; stderr: string }>;
      openExternal: (target: "workspace" | "manual" | "openhands" | "openwebui") => Promise<void>;
    };
  }
}
