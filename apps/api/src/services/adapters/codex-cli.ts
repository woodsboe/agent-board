import type { AgentAdapter, AgentChunkHandler, AgentRunInput, AgentRunResult } from "@agentboard/services";
import { runCli } from "./util";

/**
 * Drives the local Codex CLI (`codex exec <prompt>`) inside the project repo.
 * Override the binary with AGENTBOARD_CODEX_BIN.
 */
export class CodexCliAdapter implements AgentAdapter {
  runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult> {
    return runCli({
      command: process.env.AGENTBOARD_CODEX_BIN ?? "codex",
      args: ["exec", input.prompt],
      input,
      onChunk,
    });
  }
}
