import type { AgentAdapter, AgentChunkHandler, AgentRunInput, AgentRunResult } from "@agentboard/services";
import { delay, estimateTokens, round } from "./util";

const COST_PER_TOKEN = 0.0000025;

/**
 * Offline runtime. Used for the demo experience and as the automatic fallback
 * when a profile's real runtime has no usable credential, so the app always works.
 */
export class MockAdapter implements AgentAdapter {
  constructor(private readonly note?: string) {}

  async runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult> {
    const lines = [
      this.note ?? `Mock run for model "${input.model}".`,
      `Read the task prompt (${input.prompt.length} chars) with ${input.contextSnapshot.length} context item(s).`,
      "Analyzed the request and drafted an approach.",
      "Generated recommended changes.",
      "Review required before applying.",
    ];

    let output = "";
    for (const line of lines) {
      const text = `${line}\n`;
      output += text;
      onChunk?.(text);
      await delay(120);
    }

    const promptTokens = 300 + input.contextSnapshot.reduce((sum, item) => sum + item.tokenEstimate, 0);
    const completionTokens = estimateTokens(output);
    const totalTokens = promptTokens + completionTokens;
    return {
      status: "Completed",
      output,
      tokenUsage: { promptTokens, completionTokens, totalTokens, estimatedCost: round(totalTokens * COST_PER_TOKEN) },
    };
  }
}
