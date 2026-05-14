import { describe, expect, it } from "vitest";
import { appRootCandidates, resolveAppRoot } from "../electron/path-logic";

describe("app root path logic", () => {
  it("resolves app root from explicit override or known parent candidates", () => {
    expect(appRootCandidates("C:/repo/dist-electron/electron")[0]).toBe("C:\\repo");
    expect(resolveAppRoot("C:/repo/dist-electron/electron", (candidate) => candidate === "C:\\repo")).toBe("C:\\repo");
    expect(resolveAppRoot("C:/repo/dist-electron/electron", (candidate) => candidate === "D:\\app", "D:\\app")).toBe("D:\\app");
  });

  it("falls back to the parent directory when no candidate matches", () => {
    expect(resolveAppRoot("C:/repo/dist-electron/electron", () => false)).toBe("C:\\repo\\dist-electron");
  });
});
