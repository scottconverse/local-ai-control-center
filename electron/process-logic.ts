import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { commandExitMessage, commandLine, commandResult, timeoutMessage, type CommandResult, type SetupOutput } from "../src/stream-logic";

const execFileAsync = promisify(execFile);

export type ProcessOptions = {
  timeout?: number;
  env?: NodeJS.ProcessEnv;
};

export type StreamProcessOptions = ProcessOptions & {
  action: string;
  onOutput?: (output: SetupOutput) => void;
};

export async function runProcess(command: string, args: string[], options: ProcessOptions = {}): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      timeout: options.timeout ?? 120_000,
      windowsHide: true,
      env: options.env
    });
    return { ok: true, stdout: result.stdout.trim(), stderr: result.stderr.trim() };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & { stdout?: string; stderr?: string };
    return {
      ok: false,
      stdout: err.stdout?.trim() ?? "",
      stderr: err.stderr?.trim() || err.message
    };
  }
}

export function streamProcess(command: string, args: string[], options: StreamProcessOptions): Promise<CommandResult> {
  const timeout = options.timeout ?? 120_000;
  const stdout: string[] = [];
  const stderr: string[] = [];

  options.onOutput?.({ action: options.action, stream: "system", text: commandLine(command, args) });

  return new Promise((resolve) => {
    const child = spawn(command, args, {
      windowsHide: true,
      env: options.env
    });
    const timer = setTimeout(() => {
      stderr.push(timeoutMessage(timeout));
      options.onOutput?.({ action: options.action, stream: "stderr", text: `${stderr[stderr.length - 1]}\n` });
      child.kill();
    }, timeout);

    child.stdout.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout.push(text);
      options.onOutput?.({ action: options.action, stream: "stdout", text });
    });
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr.push(text);
      options.onOutput?.({ action: options.action, stream: "stderr", text });
    });
    child.on("error", (error) => {
      const text = error.message;
      stderr.push(text);
      options.onOutput?.({ action: options.action, stream: "stderr", text: `${text}\n` });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      options.onOutput?.({ action: options.action, stream: "system", text: commandExitMessage(code) });
      resolve(commandResult(code, stdout, stderr));
    });
  });
}
