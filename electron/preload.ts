import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localAI", {
  getStatus: () => ipcRenderer.invoke("system:getStatus"),
  getSetupStatus: () => ipcRenderer.invoke("system:getSetupStatus"),
  markSetupComplete: () => ipcRenderer.invoke("system:markSetupComplete"),
  updateConfig: (config: Partial<{ openHandsModel: string; openWebUiChatModel: string; openWebUiImage: string }>) =>
    ipcRenderer.invoke("system:updateConfig", config),
  resetServiceData: (target: "openhands" | "openwebui") => ipcRenderer.invoke("system:resetServiceData", target),
  runSetupAction: (action: "install-docker" | "install-ollama" | "pull-models" | "pull-images" | "start-services") =>
    ipcRenderer.invoke("system:runSetupAction", action),
  onSetupOutput: (callback: (output: { action: string; stream: "stdout" | "stderr" | "system"; text: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, output: { action: string; stream: "stdout" | "stderr" | "system"; text: string }) => {
      callback(output);
    };
    ipcRenderer.on("setup:output", listener);
    return () => ipcRenderer.removeListener("setup:output", listener);
  },
  startService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:startService", service),
  stopService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:stopService", service),
  runTestCommand: (command: "runner" | "llm") => ipcRenderer.invoke("system:runTestCommand", command),
  openExternal: (target: "workspace" | "manual" | "openhands" | "openwebui") =>
    ipcRenderer.invoke("system:openExternal", target)
});
