import { spawn } from "node:child_process";
import type {
  AgentChunkHandler,
  AgentRunInput,
  AgentRunResult,
  AgentTokenUsage,
} from "@agentboard/services";

export const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Cheap, deterministic token estimate (~4 chars/token) for runtimes that don't report usage. */
export const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));

export const round = (value: number) => Number(value.toFixed(6));

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const zeroUsage = (): AgentTokenUsage => ({
  promptTokens: 0,
  completionTokens: 0,
  totalTokens: 0,
  estimatedCost: 0,
});

export const failedResult = (error: string, output = ""): AgentRunResult => ({
  status: "Failed",
  output,
  error,
  tokenUsage: zeroUsage(),
});

/** Estimated usage (no real cost) for CLI runtimes that don't expose token counts. */
export function estimatedUsage(input: AgentRunInput, output: string): AgentTokenUsage {
  const promptTokens = estimateTokens(`${input.systemPrompt}\n${input.prompt}`);
  const completionTokens = estimateTokens(output);
  return { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, estimatedCost: 0 };
}

type CliOptions = {
  command: string;
  args: string[];
  input: AgentRunInput;
  onChunk?: AgentChunkHandler;
  timeoutMs?: number;
};

/**
 * Spawn a local agent CLI inside the project's repository and stream its output.
 * Arguments are passed as an array (never through a shell) so prompt text can't
 * be interpreted as shell syntax. Missing binaries resolve to an actionable error.
 */
export function runCli(options: CliOptions): Promise<AgentRunResult> {
  const { command, args, input, onChunk } = options;
  return new Promise((resolve) => {
    let output = "";
    let settled = false;
    const finish = (result: AgentRunResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(result);
    };

    const child = spawn(command, args, {
      cwd: input.repositoryPath || process.cwd(),
      env: process.env,
    });

    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      finish({ status: "Failed", output, error: `\`${command}\` timed out`, tokenUsage: estimatedUsage(input, output) });
    }, options.timeoutMs ?? 300_000);

    const append = (data: Buffer) => {
      const text = data.toString();
      output += text;
      onChunk?.(text);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);

    child.on("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code;
      const message =
        code === "ENOENT"
          ? `\`${command}\` is not installed or not on PATH. Install it (or set its binary path) and try again.`
          : errorMessage(error);
      finish(failedResult(message, output));
    });

    child.on("close", (code) => {
      if (code === 0) {
        finish({ status: "Completed", output, tokenUsage: estimatedUsage(input, output) });
      } else {
        finish({ status: "Failed", output, error: `\`${command}\` exited with code ${code ?? "unknown"}`, tokenUsage: estimatedUsage(input, output) });
      }
    });
  });
}
