import { describe, expect, it } from "vitest";
import { parseSetupMemory } from "../electron/state-logic";

describe("setup state parsing", () => {
  it("ignores stale setup memory versions", () => {
    expect(parseSetupMemory(JSON.stringify({ version: 0, setupComplete: true, completedAt: "2026-05-14T00:00:00.000Z" }), 1)).toBeNull();
    expect(parseSetupMemory(JSON.stringify({ version: 1, setupComplete: true, completedAt: "2026-05-14T00:00:00.000Z" }), 1)?.completedAt).toBe(
      "2026-05-14T00:00:00.000Z"
    );
  });

  it("ignores incomplete, disabled, or malformed setup memory", () => {
    expect(parseSetupMemory(JSON.stringify({ version: 1, setupComplete: false, completedAt: "2026-05-14T00:00:00.000Z" }), 1)).toBeNull();
    expect(parseSetupMemory(JSON.stringify({ version: 1, setupComplete: true }), 1)).toBeNull();
    expect(parseSetupMemory("not-json", 1)).toBeNull();
  });
});
