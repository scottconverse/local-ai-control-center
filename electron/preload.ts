import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localAI", {
  getStatus: () => ipcRenderer.invoke("system:getStatus"),
  startService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:startService", service),
  stopService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:stopService", service),
  runTestCommand: (command: "runner" | "llm") => ipcRenderer.invoke("system:runTestCommand", command),
  openExternal: (target: "workspace" | "manual" | "openhands" | "openwebui") =>
    ipcRenderer.invoke("system:openExternal", target)
});
