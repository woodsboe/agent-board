import { useEffect, useRef, useState } from "react";
import { Flex, ProgressCircle, Text } from "@adobe/react-spectrum";
import { Chip } from "@agentboard/ui";
import type { AgentRunStatus } from "@agentboard/domain";
import type { AgentRunDto } from "@agentboard/shared";
import { streamAgentRun } from "../api";
import { runStatusTone } from "../task-presentation";

/** Subscribes to a run's live SSE output and exposes accumulating text + status. */
export function useRunStream(runId: string | null, onFinal?: (run: AgentRunDto) => void) {
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<AgentRunStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    if (!runId) {
      setOutput("");
      setStatus(null);
      setError(null);
      return;
    }

    setOutput("");
    setStatus("Running");
    setError(null);

    return streamAgentRun(runId, {
      onEvent: (event) => {
        if (event.type === "chunk") {
          setOutput((prev) => prev + event.text);
        } else if (event.type === "status") {
          setStatus(event.status);
        } else if (event.type === "done") {
          setStatus(event.run.status);
          if (event.run.output) setOutput(event.run.output);
          onFinalRef.current?.(event.run);
        } else if (event.type === "error") {
          setStatus("Failed");
          setError(event.message);
        }
      },
    });
  }, [runId]);

  return { output, status, error, isStreaming: status === "Running" };
}

/** Terminal-style live output panel. */
export function LiveRunOutput(props: { output: string; status: AgentRunStatus | null; error?: string | null }) {
  return (
    <Flex direction="column" gap="size-100">
      <Flex alignItems="center" gap="size-100">
        {props.status === "Running" ? <ProgressCircle size="S" aria-label="Running" isIndeterminate /> : null}
        {props.status ? <Chip label={props.status} tone={runStatusTone[props.status]} /> : null}
      </Flex>
      <pre
        style={{
          margin: 0,
          padding: "12px 14px",
          borderRadius: "10px",
          background: "rgba(8, 12, 20, 0.55)",
          border: "1px solid rgba(167, 187, 226, 0.18)",
          maxHeight: "320px",
          overflow: "auto",
          fontSize: "12.5px",
          lineHeight: 1.5,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {props.output || (props.status === "Running" ? "Waiting for output…" : "No output.")}
      </pre>
      {props.error ? <Text UNSAFE_style={{ color: "#fca5a5" }}>{props.error}</Text> : null}
    </Flex>
  );
}
