import { describe, expect, it, vi } from "vitest";
import {
  occupiedPortResult,
  portCheckFailure,
  pullRequiredItems,
  resetContainerOk,
  resolveExternalTarget,
  wingetMissingResult
} from "../electron/ipc-logic";
import { appRootCandidates, resolveAppRoot } from "../electron/path-logic";
import { parseSetupMemory } from "../electron/state-logic";

describe("ipc behavior helpers", () => {
  it("throws on unsupported external targets", () => {
    expect(() =>
      resolveExternalTarget("bad-target", {
        workspace: "C:/workspace",
        manual: "https://example.test/manual",
        openhands: "http://localhost:3000",
        openwebui: "http://localhost:8080"
      })
    ).toThrow("Unsupported external target: bad-target");
  });

  it("returns a clear fallback result when winget is absent", () => {
    expect(wingetMissingResult("https://example.test/download")).toEqual({
      ok: false,
      stdout: "",
      stderr: "winget was not found, so the official download page was opened instead: https://example.test/download"
    });
  });

  it("distinguishes port check command failures from occupied ports", () => {
    expect(portCheckFailure(3000, { ok: false, stdout: "", stderr: "PowerShell failed" }).stderr).toContain("Could not check port 3000");
    expect(occupiedPortResult(8080, "1234|OtherApp").stderr).toContain("OtherApp (PID 1234)");
  });

  it("treats missing containers as successful reset preconditions but preserves real Docker failures", () => {
    expect(resetContainerOk({ ok: false, stdout: "", stderr: "No such container: openhands-app" })).toBe(true);
    expect(resetContainerOk({ ok: false, stdout: "", stderr: "Docker daemon unavailable" })).toBe(false);
  });

  it("stops pulling required items at the first failed item while preserving previous output", async () => {
    const pullItem = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, stdout: "first ok", stderr: "" })
      .mockResolvedValueOnce({ ok: false, stdout: "", stderr: "second failed" })
      .mockResolvedValueOnce({ ok: true, stdout: "third ok", stderr: "" });

    const result = await pullRequiredItems(["first", "second", "third"], "ollama pull", pullItem);

    expect(result.ok).toBe(false);
    expect(result.stdout).toContain("> ollama pull first\nfirst ok");
    expect(result.stdout).toContain("> ollama pull second\nsecond failed");
    expect(result.stdout).not.toContain("third");
    expect(pullItem).toHaveBeenCalledTimes(2);
  });

  it("resolves app root from explicit override or known parent candidates", () => {
    expect(appRootCandidates("C:/repo/dist-electron/electron")[0]).toBe("C:\\repo");
    expect(resolveAppRoot("C:/repo/dist-electron/electron", (candidate) => candidate === "C:\\repo")).toBe("C:\\repo");
    expect(resolveAppRoot("C:/repo/dist-electron/electron", (candidate) => candidate === "D:\\app", "D:\\app")).toBe("D:\\app");
  });

  it("ignores stale setup memory versions", () => {
    expect(parseSetupMemory(JSON.stringify({ version: 0, setupComplete: true, completedAt: "2026-05-14T00:00:00.000Z" }), 1)).toBeNull();
    expect(parseSetupMemory(JSON.stringify({ version: 1, setupComplete: true, completedAt: "2026-05-14T00:00:00.000Z" }), 1)?.completedAt).toBe(
      "2026-05-14T00:00:00.000Z"
    );
  });
});
