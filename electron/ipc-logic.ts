import type { CommandResult } from "../src/stream-logic";

export type ExternalTarget = "workspace" | "manual" | "openhands" | "openwebui";
export type ExternalDestination = { kind: "path" | "url"; value: string };

export function unsupportedTargetError(target: string): Error {
  return new Error(`Unsupported external target: ${target}`);
}

export function resolveExternalTarget(
  target: string,
  values: Record<ExternalTarget, string>
): ExternalDestination {
  switch (target) {
    case "workspace":
      return { kind: "path", value: values.workspace };
    case "manual":
      return { kind: "url", value: values.manual };
    case "openhands":
      return { kind: "url", value: values.openhands };
    case "openwebui":
      return { kind: "url", value: values.openwebui };
    default:
      throw unsupportedTargetError(target);
  }
}

export function wingetMissingResult(fallbackUrl: string): CommandResult {
  return {
    ok: false,
    stdout: "",
    stderr: `winget was not found, so the official download page was opened instead: ${fallbackUrl}`
  };
}

export function portCheckFailure(port: number, result: CommandResult): CommandResult {
  return {
    ok: false,
    stdout: result.stdout,
    stderr: `Could not check port ${port}. ${result.stderr || result.stdout || "PowerShell did not return a port status."}`
  };
}

export function occupiedPortResult(port: number, ownerOutput: string): CommandResult {
  const [pid, name] = ownerOutput.split("|");
  return {
    ok: false,
    stdout: "",
    stderr: `Port ${port} is already in use by ${name || "another process"}${pid ? ` (PID ${pid})` : ""}. Close that app or change its port before starting this service.`
  };
}

export async function pullRequiredItems(
  items: string[],
  commandLabel: string,
  pullItem: (item: string) => Promise<CommandResult>
): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const item of items) {
    const result = await pullItem(item);
    outputs.push(`> ${commandLabel} ${item}\n${result.stdout || result.stderr}`);
    if (!result.ok) {
      return { ok: false, stdout: outputs.join("\n\n"), stderr: result.stderr };
    }
  }
  return { ok: true, stdout: outputs.join("\n\n"), stderr: "" };
}
