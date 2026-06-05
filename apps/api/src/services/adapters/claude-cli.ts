import type { AgentAdapter, AgentChunkHandler, AgentRunInput, AgentRunResult } from "@agentboard/services";
import { runCli } from "./util";

/**
 * Drives the local Claude Code CLI (`claude -p <prompt>`) inside the project repo.
 * Override the binary with AGENTBOARD_CLAUDE_BIN.
 */
export class ClaudeCliAdapter implements AgentAdapter {
  runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult> {
    return runCli({
      command: process.env.AGENTBOARD_CLAUDE_BIN ?? "claude",
      args: ["-p", input.prompt],
      input,
      onChunk,
    });
  }
}
