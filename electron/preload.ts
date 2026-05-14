import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("localAI", {
  getStatus: () => ipcRenderer.invoke("system:getStatus"),
  startService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:startService", service),
  stopService: (service: "openhands" | "openwebui") => ipcRenderer.invoke("system:stopService", service),
  openExternal: (target: "workspace" | "manual" | "openhands" | "openwebui") =>
    ipcRenderer.invoke("system:openExternal", target)
});
