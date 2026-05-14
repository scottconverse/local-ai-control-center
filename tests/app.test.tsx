import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App, describeModel } from "../src/App";
import type { LocalAIStatus, SetupStatus } from "../src/global";

const readyStatus: LocalAIStatus = {
  docker: { ok: true, version: "Docker", executable: "docker.exe", message: "Docker command is available." },
  ollama: { ok: true, modelNames: [], executable: "ollama.exe", version: "Ollama", message: "Ollama is reachable." },
  services: {
    openHands: { container: "not-found", url: "http://localhost:3000", reachable: false },
    openWebUi: { container: "not-found", url: "http://localhost:8080", reachable: false }
  },
  paths: { appRoot: "C:/app", workspaceDir: "C:/app/agent-workspace" },
  config: {
    openHandsModel: "openai/qwen2.5-coder:14b",
    openWebUiChatModel: "gemma4-26b-8k",
    openWebUiImage: "ghcr.io/open-webui/open-webui:v0.9.5",
    modelLabels: {}
  }
};

const setupNeeded: SetupStatus = {
  ready: false,
  summary: "Setup is not complete yet.",
  hardware: {
    cpu: { ok: true, severity: "ok", label: "CPU", value: "CPU", detail: "CPU detected." },
    memory: { ok: true, severity: "ok", label: "System RAM", value: "32 GB", detail: "Enough RAM." },
    disk: { ok: true, severity: "ok", label: "Disk", value: "120 GB free", detail: "Enough disk." },
    gpu: { ok: true, severity: "ok", label: "GPU / VRAM", value: "GPU", detail: "Enough VRAM." }
  },
  tools: {
    winget: { ok: true, message: "winget available" },
    docker: { ok: false, running: false, message: "Docker missing" },
    ollama: { ok: false, running: false, message: "Ollama missing" }
  },
  assets: {
    models: [{ name: "gemma4-26b-8k", installed: false }],
    dockerImages: [{ name: "ghcr.io/open-webui/open-webui:v0.9.5", installed: false }]
  },
  nextSteps: ["Install Docker Desktop."]
};

function renderApp() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  return { container, root };
}

function clickButton(container: HTMLElement, text: string) {
  const button = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  expect(button, `button containing "${text}"`).toBeTruthy();
  button?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

async function mount(root: Root) {
  await act(async () => {
    root.render(<App />);
  });
}

describe("App first-run behavior", () => {
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    unsubscribe = vi.fn();
    window.localStorage.clear();
    Object.defineProperty(window, "localAI", {
      configurable: true,
      value: {
        getStatus: vi.fn().mockResolvedValue(readyStatus),
        getSetupStatus: vi.fn().mockResolvedValue(setupNeeded),
        markSetupComplete: vi.fn().mockResolvedValue({ completedAt: "2026-05-14T12:00:00.000Z" }),
        updateConfig: vi.fn(async (config) => ({ ...readyStatus.config, ...config })),
        resetServiceData: vi.fn().mockResolvedValue({ ok: true, stdout: "reset", stderr: "" }),
        runSetupAction: vi.fn().mockResolvedValue({ ok: false, stdout: "", stderr: "installer blocked" }),
        onSetupOutput: vi.fn(() => unsubscribe),
        startService: vi.fn(),
        stopService: vi.fn(),
        runTestCommand: vi.fn().mockResolvedValue({ ok: true, stdout: "ok", stderr: "" }),
        openExternal: vi.fn()
      }
    });
  });

  it("orients first-time users with a sequenced setup flow", async () => {
    const { container, root } = renderApp();
    await mount(root);

    expect(container.textContent).toContain("This wizard checks your machine and sets it up for local AI work");
    expect(container.textContent).toContain("1. Check machine");
    expect(container.textContent).toContain("Step 2");

    root.unmount();
  });

  it("shows an empty model state on the dashboard", async () => {
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Dashboard");
    });

    expect(container.textContent).toContain("No models detected. Make sure Ollama is running");

    root.unmount();
  });

  it("clears setup failure guidance when the user changes views", async () => {
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Install Docker");
    });
    expect(container.textContent).toContain("If Windows blocked the installer");

    await act(async () => {
      clickButton(container, "Dashboard");
    });
    expect(container.textContent).not.toContain("If Windows blocked the installer");

    root.unmount();
  });

  it("unsubscribes from setup output on unmount", async () => {
    const { root } = renderApp();
    await mount(root);

    root.unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it("saves model settings and marks services as restart-required", async () => {
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Dashboard");
    });
    const openHandsInput = Array.from(container.querySelectorAll("input")).find((input) => input.value.includes("qwen"));
    expect(openHandsInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(openHandsInput, "new-code-model:latest");
      openHandsInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      clickButton(container, "Save Model Settings");
    });

    expect(window.localAI.updateConfig).toHaveBeenCalledWith(expect.objectContaining({ openHandsModel: "new-code-model:latest" }));
    expect(container.textContent).toContain("Restart required");

    root.unmount();
  });

  it("saves custom labels for private model libraries", async () => {
    const statusWithPrivateModel: LocalAIStatus = {
      ...readyStatus,
      ollama: { ...readyStatus.ollama, modelNames: ["private-model:latest"] },
      config: { ...readyStatus.config, modelLabels: {} }
    };
    window.localAI.getStatus = vi.fn().mockResolvedValue(statusWithPrivateModel);
    window.localAI.updateConfig = vi.fn(async (config) => ({ ...statusWithPrivateModel.config, ...config }));
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Dashboard");
    });
    expect(container.textContent).toContain("Recommendations are guessed from model names");
    const labelInput = container.querySelector('input[aria-label="Label for private-model:latest"]') as HTMLInputElement | null;
    expect(labelInput).toBeTruthy();
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(labelInput, "Internal research assistant");
      labelInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      clickButton(container, "Save Model Settings");
    });

    expect(window.localAI.updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ modelLabels: { "private-model:latest": "Internal research assistant" } })
    );

    root.unmount();
  });

  it("does not reset service data when the in-app confirmation is cancelled", async () => {
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Dashboard");
    });
    await act(async () => {
      clickButton(container, "Reset OpenHands Data");
    });
    expect(container.textContent).toContain("Reset OpenHands data?");
    await act(async () => {
      clickButton(container, "Cancel");
    });

    expect(window.localAI.resetServiceData).not.toHaveBeenCalled();

    root.unmount();
  });

  it("clears restart-required state after a successful reset", async () => {
    const { container, root } = renderApp();
    await mount(root);

    await act(async () => {
      clickButton(container, "Dashboard");
    });
    const openHandsInput = Array.from(container.querySelectorAll("input")).find((input) => input.value.includes("qwen"));
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(openHandsInput, "new-code-model:latest");
      openHandsInput!.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => {
      clickButton(container, "Save Model Settings");
    });
    expect(container.textContent).toContain("Restart required");

    await act(async () => {
      clickButton(container, "Reset OpenHands Data");
    });
    await act(async () => {
      clickButton(container, "Reset data");
    });

    expect(window.localAI.resetServiceData).toHaveBeenCalledWith("openhands");
    expect(container.textContent).not.toContain("Restart required");

    root.unmount();
  });
});

describe("model descriptions", () => {
  it("describes default and non-default local models", () => {
    expect(describeModel("openai/qwen2.5-coder:14b")).toBe("Code and project work");
    expect(describeModel("deepseek-coder:6.7b")).toBe("Likely useful for code and project work");
    expect(describeModel("llava-vl:latest")).toBe("Vision or image-capable model");
    expect(describeModel("llama3:8b")).toBe("General local chat and reasoning");
    expect(describeModel("nomic-embed-text:latest")).toBe("Embedding/search model");
    expect(describeModel("private-model:latest", { "private-model:latest": "Internal research assistant" })).toBe("Internal research assistant");
    expect(describeModel("custom-model:latest")).toBe("Installed local model");
  });
});
