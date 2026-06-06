import { planProposalSchema, type PlanMessage, type PlanProposalDto } from "@agentboard/shared";

/**
 * System instruction appended to a profile's own system prompt to force a
 * single structured JSON plan (no prose) — the source of truth we persist.
 */
export const PLAN_SYSTEM_INSTRUCTION = `You are a planning assistant for a software project. Break the goal into a concise, actionable implementation plan.
Respond with ONLY a single JSON object — no prose, no markdown fences — matching exactly:
{"title": string, "summary": string, "items": [{"title": string, "description": string, "priority": "Low" | "Medium" | "High" | "Critical"}]}
Each item must be one independently actionable task. Use between 3 and 8 items. Output nothing outside the JSON object.`;

/** Build the user-side prompt from the goal plus any prior refine turns (empty on first run). */
export function buildGenerationPrompt(goal: string, messages: PlanMessage[]): string {
  const parts = [`Goal: ${goal}`];
  if (messages.length) {
    parts.push("", "Refinement so far:");
    for (const message of messages) {
      parts.push(
        message.role === "assistant"
          ? `Previous draft (JSON): ${message.content}`
          : `Requested change: ${message.content}`,
      );
    }
    parts.push("", "Apply the requested change(s) and return the full updated plan as a single JSON object.");
  }
  return parts.join("\n");
}

/** Pull the most plausible JSON object out of a model response (handles fenced and bare JSON). */
function extractJsonCandidate(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1].includes("{")) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) return text.slice(start, end + 1);
  return null;
}

/** Parse + validate a structured proposal from raw model output. Returns null if not recoverable. */
export function extractProposal(text: string): PlanProposalDto | null {
  const candidate = extractJsonCandidate(text);
  if (!candidate) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  const result = planProposalSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Deterministic structured plan used offline (mock runtime) or when a real model
 * fails to return parseable JSON — so the credential-free demo always yields a
 * usable, convertible plan rather than gibberish.
 */
export function mockPlanProposal(goal: string): PlanProposalDto {
  const trimmed = goal.trim().replace(/[.\s]+$/, "");
  const lower = trimmed ? trimmed.charAt(0).toLowerCase() + trimmed.slice(1) : "achieve the stated goal";
  const title = trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed || "Untitled plan";
  return {
    title,
    summary: `A structured plan to ${lower}.`,
    items: [
      {
        title: "Clarify scope and acceptance criteria",
        description: `Define the concrete scope, constraints, and done-criteria for: ${trimmed || goal}.`,
        priority: "High",
      },
      {
        title: "Implement the core changes",
        description: `Build the primary changes required to ${lower}.`,
        priority: "Medium",
      },
      {
        title: "Add tests and verify",
        description: `Cover the new behaviour with tests and verify ${lower} end to end.`,
        priority: "Medium",
      },
    ],
  };
}
