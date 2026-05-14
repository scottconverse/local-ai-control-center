import { describe, expect, it } from "vitest";
import { appendCappedOutput, commandExitMessage, commandLine, commandResult, commandTimedOutResult, formatSetupOutput, missingScriptResult, timeoutMessage } from "../src/stream-logic";

describe("streaming setup log logic", () => {
  it("formats command lines and timeout messages", () => {
    expect(commandLine("ollama", ["pull", "gemma4-26b-8k"])).toBe("> ollama pull gemma4-26b-8k\n");
    expect(timeoutMessage(125_000)).toBe("Timed out after 125 seconds.");
  });

  it("maps process close codes to command results", () => {
    expect(commandResult(0, ["ok\n"], [""])).toEqual({ ok: true, stdout: "ok", stderr: "" });
    expect(commandResult(2, [""], ["bad\n"])).toEqual({ ok: false, stdout: "", stderr: "bad" });
    expect(commandTimedOutResult(10_000, ["partial\n"], ["warn\n"])).toEqual({
      ok: false,
      stdout: "partial",
      stderr: "warn\nTimed out after 10 seconds."
    });
    expect(commandExitMessage(0)).toBe("Command completed.\n");
    expect(commandExitMessage(2)).toBe("Command exited with code 2.\n");
  });

  it("reports missing setup scripts clearly before spawning PowerShell", () => {
    expect(missingScriptResult("C:/app/missing.ps1")).toEqual({
      ok: false,
      stdout: "",
      stderr: "Setup script was not found: C:/app/missing.ps1"
    });
  });

  it("caps live output from the tail so recent progress remains visible", () => {
    expect(appendCappedOutput("abcdef", "ghij", 5)).toBe("fghij");
  });

  it("prefixes streamed output with its setup action label", () => {
    expect(formatSetupOutput({ action: "open-webui", stream: "stdout", text: "Pulling\nDone\n" })).toBe(
      "[open-webui] Pulling\n[open-webui] Done\n"
    );
    expect(formatSetupOutput({ action: "open-webui", stream: "stdout", text: "   \nDone\n" })).toBe(
      "   \n[open-webui] Done\n"
    );
    expect(formatSetupOutput({ action: "open-webui", stream: "stdout", text: "   \r\nDone\r\n" })).toBe(
      "   \r\n[open-webui] Done\r\n"
    );
  });
});
