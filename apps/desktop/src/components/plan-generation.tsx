import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentTokenUsageDto, GeneratePlanInput, PlanProposalDto } from "@agentboard/shared";
import { api, streamPlanGeneration } from "../api";

export type GenerationStatus = "idle" | "Running" | "Completed" | "Failed";

/**
 * Drives an agent-led plan generation: starts a run, subscribes to its live SSE
 * output, and exposes the streamed text plus the final structured proposal.
 * `proposal` is editable by the caller (inline refinements) — it is the source of truth.
 */
export function usePlanGeneration() {
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<GenerationStatus>("idle");
  const [proposal, setProposal] = useState<PlanProposalDto | null>(null);
  const [tokenUsage, setTokenUsage] = useState<AgentTokenUsageDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generationId) return;
    setOutput("");
    setStatus("Running");
    setError(null);

    return streamPlanGeneration(generationId, {
      onEvent: (event) => {
        if (event.type === "chunk") {
          setOutput((prev) => prev + event.text);
        } else if (event.type === "status") {
          setStatus(event.status);
        } else if (event.type === "done") {
          setStatus("Completed");
          setProposal(event.proposal);
          setTokenUsage(event.tokenUsage);
        } else if (event.type === "error") {
          setStatus("Failed");
          setError(event.message);
        }
      },
    });
  }, [generationId]);

  const start = useCallback(async (input: GeneratePlanInput) => {
    setProposal(null);
    setTokenUsage(null);
    const { generationId: id } = await api.generatePlan(input);
    setGenerationId(id);
  }, []);

  const reset = useCallback(() => {
    setGenerationId(null);
    setOutput("");
    setStatus("idle");
    setProposal(null);
    setTokenUsage(null);
    setError(null);
  }, []);

  // Keep the latest reset accessible without retriggering effects.
  const resetRef = useRef(reset);
  resetRef.current = reset;

  return { start, reset, output, status, proposal, setProposal, tokenUsage, error, isStreaming: status === "Running" };
}
