import OpenAI from "openai";
import type { AgentAdapter, AgentChunkHandler, AgentRunInput, AgentRunResult } from "@agentboard/services";
import { errorMessage, estimateTokens, failedResult, round } from "./util";

// Coarse blended $/token; local/compatible servers report no cost so this stays an estimate.
const COST_PER_TOKEN = 0.0000015;

/**
 * OpenAI and any OpenAI-compatible server (Ollama, LM Studio, vLLM, …) via `baseUrl`.
 * Local servers ignore the API key, so a placeholder is sent when none is configured.
 */
export class OpenAiApiAdapter implements AgentAdapter {
  async runTask(input: AgentRunInput, onChunk?: AgentChunkHandler): Promise<AgentRunResult> {
    const client = new OpenAI({ apiKey: input.apiKey ?? "local", baseURL: input.baseUrl ?? undefined });
    let output = "";

    try {
      const stream = await client.chat.completions.create({
        model: input.model,
        ...(input.temperature != null ? { temperature: input.temperature } : {}),
        ...(input.maxTokens != null ? { max_tokens: input.maxTokens } : {}),
        stream: true,
        stream_options: { include_usage: true },
        messages: [
          { role: "system", content: input.systemPrompt },
          { role: "user", content: input.prompt },
        ],
      });

      let usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } | null = null;
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? "";
        if (delta) {
          output += delta;
          onChunk?.(delta);
        }
        if (chunk.usage) usage = chunk.usage;
      }

      const promptTokens = usage?.prompt_tokens ?? estimateTokens(`${input.systemPrompt}\n${input.prompt}`);
      const completionTokens = usage?.completion_tokens ?? estimateTokens(output);
      const totalTokens = usage?.total_tokens ?? promptTokens + completionTokens;
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
