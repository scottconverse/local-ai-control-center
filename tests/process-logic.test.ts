import { describe, expect, it } from "vitest";
import { runProcess, streamProcess } from "../electron/process-logic";

describe("main-process child process execution", () => {
  it("returns CommandResult data from a real child process error exit", async () => {
    const result = await runProcess(process.execPath, ["-e", "console.log('child-out'); console.error('child-err'); process.exit(7);"], {
      timeout: 2_000
    });

    expect(result).toEqual({
      ok: false,
      stdout: "child-out",
      stderr: "child-err"
    });
  });

  it("returns timeout output from a real streamed child process", async () => {
    const events: string[] = [];
    const result = await streamProcess(process.execPath, ["-e", "setTimeout(() => {}, 2000);"], {
      action: "timeout-check",
      timeout: 50,
      onOutput: (output) => events.push(`${output.stream}:${output.text}`)
    });

    expect(result.ok).toBe(false);
    expect(result.stderr).toContain("Timed out after");
    expect(events.some((event) => event.includes("> "))).toBe(true);
    expect(events.some((event) => event.includes("Timed out after"))).toBe(true);
  });
});
