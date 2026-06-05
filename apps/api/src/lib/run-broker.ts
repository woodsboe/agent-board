import { EventEmitter } from "node:events";
import type { AgentRunEvent } from "@agentboard/shared";

/**
 * In-memory pub/sub for live agent-run output.
 *
 * Agent runs execute asynchronously after `POST /agent-runs` returns, so the SSE
 * endpoint may attach before, during, or after execution. Each run buffers its
 * events; a subscriber first receives the full backlog (replay) and then live
 * events until the run terminates. Terminated runs are evicted after a grace
 * period so late refreshes can still replay.
 */

type RunState = {
  events: AgentRunEvent[];
  done: boolean;
  emitter: EventEmitter;
};

const runs = new Map<string, RunState>();
const EVICT_AFTER_MS = 60_000;

function ensure(runId: string): RunState {
  let state = runs.get(runId);
  if (!state) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(0);
    state = { events: [], done: false, emitter };
    runs.set(runId, state);
  }
  return state;
}

export function publishRunEvent(runId: string, event: AgentRunEvent): void {
  const state = ensure(runId);
  state.events.push(event);
  state.emitter.emit("event", event);

  if (event.type === "done" || event.type === "error") {
    state.done = true;
    setTimeout(() => runs.delete(runId), EVICT_AFTER_MS);
  }
}

/**
 * Replays buffered events then streams new ones. Returns an unsubscribe function
 * and whether the run had already finished (so the caller can close immediately).
 */
export function subscribeToRun(
  runId: string,
  onEvent: (event: AgentRunEvent) => void,
): { unsubscribe: () => void; alreadyDone: boolean } {
  const state = ensure(runId);
  for (const event of state.events) onEvent(event);

  if (state.done) {
    return { unsubscribe: () => {}, alreadyDone: true };
  }

  const handler = (event: AgentRunEvent) => onEvent(event);
  state.emitter.on("event", handler);
  return { unsubscribe: () => state.emitter.off("event", handler), alreadyDone: false };
}
