import { describe, expect, it } from "vitest";
import {
  diskHardwareCheck,
  gpuHardwareCheck,
  memoryHardwareCheck,
  parseNvidiaSmiCsv,
  parseOllamaTags
} from "../electron/setup-logic";

describe("setup hardware logic", () => {
  it("parses nvidia-smi CSV output into GPU memory values", () => {
    expect(parseNvidiaSmiCsv("NVIDIA GeForce RTX 5070 Ti, 16303, 15120")).toEqual([
      {
        name: "NVIDIA GeForce RTX 5070 Ti",
        totalGb: 16303 / 1024,
        freeGb: 15120 / 1024
      }
    ]);
  });

  it("passes GPUs with enough total and free VRAM", () => {
    const check = gpuHardwareCheck("NVIDIA GeForce RTX 5070 Ti, 16384, 15360", true);

    expect(check.ok).toBe(true);
    expect(check.severity).toBe("ok");
    expect(check.detail).toContain("meets the local OpenHands target");
  });

  it("fails GPUs that have 16 GB total VRAM but not enough currently free", () => {
    const check = gpuHardwareCheck("NVIDIA GeForce RTX 5070 Ti, 16384, 12000", true);

    expect(check.ok).toBe(false);
    expect(check.detail).toContain("Close other GPU apps");
  });

  it("selects the strongest GPU when multiple NVIDIA GPUs are present", () => {
    const check = gpuHardwareCheck("NVIDIA RTX 3060, 12288, 11000\nNVIDIA RTX 5090, 32768, 31000", true);

    expect(check.ok).toBe(true);
    expect(check.value).toBe("NVIDIA RTX 5090");
  });

  it("fails clearly when nvidia-smi is unavailable", () => {
    const check = gpuHardwareCheck("", false);

    expect(check.ok).toBe(false);
    expect(check.value).toBe("Not detected");
    expect(check.detail).toContain("nvidia-smi");
  });

  it("fails machines below the memory and disk gates", () => {
    expect(memoryHardwareCheck(16, 8, true).ok).toBe(false);
    expect(diskHardwareCheck(40, 512, "C:", true).ok).toBe(false);
  });

  it("passes machines that meet the memory and disk gates", () => {
    expect(memoryHardwareCheck(32, 20, true).ok).toBe(true);
    expect(diskHardwareCheck(120, 1024, "C:", true).ok).toBe(true);
  });

  it("parses Ollama tags JSON without depending on CLI column output", () => {
    const tags = parseOllamaTags(JSON.stringify({ models: [{ name: "gemma4-26b-8k" }, { name: "openai/qwen2.5-coder:14b" }] }));

    expect(tags).toEqual(["gemma4-26b-8k", "openai/qwen2.5-coder:14b"]);
  });

  it("treats malformed Ollama tag JSON as an empty model list", () => {
    expect(parseOllamaTags("not-json")).toEqual([]);
  });
});
