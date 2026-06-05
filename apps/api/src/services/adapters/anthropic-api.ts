import Anthropic from "@anthropic-ai/sdk";
import type { AgentAdapter, AgentChunkHandler, AgentRunInput, AgentRunResult } from "@agentboard/services";
import { errorMessage, failedResult, round } from "./util";

// Coarse blended $/token used only to surface an estimated cost in the UI.
const COST_PER_TOKEN = 0.000004;

export class AnthropicApiAdapter implements AgentAdapter {
  async runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult> {
    if (!input.apiKey) return failedResult("Missing Anthropic API key.");

    const client = new Anthropic({ apiKey: input.apiKey, baseURL: input.baseUrl ?? undefined });
    let output = "";

    try {
      const stream = client.messages.stream({
        model: input.model,
        max_tokens: input.maxTokens ?? 2048,
        ...(input.temperature != null ? { temperature: input.temperature } : {}),
        system: input.systemPrompt,
        messages: [{ role: "user", content: input.prompt }],
      });

      stream.on("text", (text) => {
        output += text;
        onChunk?.(text);
      });

      const final = await stream.finalMessage();
      const promptTokens = final.usage.input_tokens;
      const completionTokens = final.usage.output_tokens;
      const totalTokens = promptTokens + completionTokens;
      return {
        status: "Completed",
        output,
        tokenUsage: { promptTokens, completionTokens, totalTokens, estimatedCost: round(totalTokens * COST_PER_TOKEN) },
      };
    } catch (error) {
      return failedResult(errorMessage(error), output);
    }
  }
}
