import { afterEach, describe, expect, it, vi } from "vitest";

describe("PowerShell service launcher", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.doUnmock("electron");
    vi.doUnmock("node:fs");
  });

  it("returns the missing-script CommandResult before spawning PowerShell", async () => {
    vi.doMock("electron", () => ({
      app: {
        getPath: vi.fn(() => "C:/user-data"),
        on: vi.fn(),
        quit: vi.fn(),
        whenReady: vi.fn(() => new Promise(() => undefined))
      },
      BrowserWindow: Object.assign(vi.fn(), { getAllWindows: vi.fn(() => []) }),
      ipcMain: { handle: vi.fn() },
      shell: { openExternal: vi.fn(), openPath: vi.fn() }
    }));
    vi.doMock("node:fs", () => ({
      default: { existsSync: vi.fn(() => false) },
      existsSync: vi.fn(() => false)
    }));

    const { startPowerShellScript } = await import("../electron/main");
    const result = await startPowerShellScript("missing-service.ps1");

    expect(result).toEqual({
      ok: false,
      stdout: "",
      stderr: expect.stringContaining("Setup script was not found:")
    });
    expect(result.stderr).toContain("missing-service.ps1");
  });
});
