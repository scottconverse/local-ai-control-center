export type HardwareCheck = {
  ok: boolean;
  severity: "ok" | "warn" | "fail";
  label: string;
  value: string;
  detail: string;
};

export type GpuInfo = {
  name: string;
  totalGb: number;
  freeGb: number;
};

export const minimumSystemRamGb = 32;
export const minimumFreeDiskGb = 80;
export const minimumTotalVramGb = 16;
export const minimumFreeVramGb = 14.5;

export function okCheck(label: string, value: string, detail: string): HardwareCheck {
  return { ok: true, severity: "ok", label, value, detail };
}

export function failCheck(label: string, value: string, detail: string): HardwareCheck {
  return { ok: false, severity: "fail", label, value, detail };
}

export function parseNvidiaSmiCsv(output: string): GpuInfo[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, totalMb, freeMb] = line.split(",").map((part) => part.trim());
      return {
        name,
        totalGb: Number.parseFloat(totalMb) / 1024,
        freeGb: Number.parseFloat(freeMb) / 1024
      };
    })
    .filter((gpu) => gpu.name && !Number.isNaN(gpu.totalGb) && !Number.isNaN(gpu.freeGb));
}

export function gpuHardwareCheck(output: string, commandOk: boolean): HardwareCheck {
  if (!commandOk || !output) {
    return failCheck(
      "GPU / VRAM",
      "Not detected",
      "NVIDIA GPU was not detected through nvidia-smi. OpenHands-ready local models need a CUDA GPU with about 16 GB available VRAM."
    );
  }

  const best = parseNvidiaSmiCsv(output).sort((a, b) => b.totalGb - a.totalGb)[0];
  if (!best) {
    return failCheck("GPU / VRAM", "Unknown", "nvidia-smi responded, but the app could not parse VRAM details.");
  }

  const total = Math.round(best.totalGb * 10) / 10;
  const free = Math.round(best.freeGb * 10) / 10;
  if (total >= minimumTotalVramGb && free >= minimumFreeVramGb) {
    return okCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. This meets the local OpenHands target.`);
  }
  if (total >= minimumTotalVramGb) {
    return failCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. Close other GPU apps before pulling/running the recommended models.`);
  }
  return failCheck("GPU / VRAM", `${best.name}`, `${total} GB total, ${free} GB free. Recommended minimum is a CUDA GPU with ${minimumTotalVramGb} GB VRAM.`);
}

export function memoryHardwareCheck(total: number, free: number, commandOk: boolean): HardwareCheck {
  if (!commandOk || Number.isNaN(total)) {
    return failCheck("System RAM", "Unknown", "Could not read installed memory.");
  }
  if (total >= minimumSystemRamGb) {
    return okCheck("System RAM", `${total} GB`, `${Number.isNaN(free) ? "?" : free} GB free. Recommended minimum is ${minimumSystemRamGb} GB.`);
  }
  return failCheck("System RAM", `${total} GB`, `This stack is meant for hefty local AI boxes. Install at least ${minimumSystemRamGb} GB system RAM.`);
}

export function diskHardwareCheck(free: number, total: number, drive: string, commandOk: boolean): HardwareCheck {
  if (!commandOk || Number.isNaN(free)) {
    return failCheck("Disk", "Unknown", "Could not read free disk space.");
  }
  if (free >= minimumFreeDiskGb) {
    return okCheck("Disk", `${free} GB free`, `${Number.isNaN(total) ? "?" : total} GB total on ${drive}. Recommended free space is ${minimumFreeDiskGb} GB.`);
  }
  return failCheck("Disk", `${free} GB free`, `Free at least ${minimumFreeDiskGb} GB before pulling models and Docker images.`);
}

export function parseOllamaTags(body: string): string[] {
  try {
    const parsed = JSON.parse(body) as { models?: Array<{ name?: string }> };
    return (parsed.models ?? []).map((model) => model.name).filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

export function parseOllamaListNames(output: string): string[] {
  // `ollama list` emits a header row first; this is only a CLI fallback after the tags API.
  return output
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}
