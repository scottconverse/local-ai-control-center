export type CommandResult = {
  ok: boolean;
  stdout: string;
  stderr: string;
};

export type SetupOutput = {
  action: string;
  stream: "stdout" | "stderr" | "system";
  text: string;
};

export function commandLine(command: string, args: string[]): string {
  return `> ${command} ${args.join(" ")}\n`;
}

export function timeoutMessage(timeout: number): string {
  return `Timed out after ${Math.round(timeout / 1000)} seconds.`;
}

export function commandExitMessage(code: number | null): string {
  return code === 0 ? "Command completed.\n" : `Command exited with code ${code}.\n`;
}

export function commandResult(code: number | null, stdout: string[], stderr: string[]): CommandResult {
  return {
    ok: code === 0,
    stdout: stdout.join("").trim(),
    stderr: stderr.join("").trim()
  };
}

export function appendCappedOutput(current: string, next: string, cap = 40_000): string {
  return `${current}${next}`.slice(-cap);
}

export function formatSetupOutput(output: SetupOutput): string {
  const prefix = `[${output.action}]`;
  return output.text
    .split(/(\r?\n)/)
    .map((part) => {
      if (part === "\n" || part === "\r\n" || part.trim() === "") return part;
      return `${prefix} ${part}`;
    })
    .join("");
}
