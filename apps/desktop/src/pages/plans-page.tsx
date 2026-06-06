import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Divider,
  Flex,
  Heading,
  Item,
  Picker,
  ProgressCircle,
  Text,
  TextArea,
  TextField,
  View,
  Well,
} from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Chip, type ChipTone, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { taskPriorities, type TaskPriority } from "@agentboard/domain";
import type { PlanItemDto, PlanMessage } from "@agentboard/shared";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { usePlanGeneration } from "../components/plan-generation";
import { priorityTone } from "../task-presentation";
import { useProjectId } from "../use-project-id";

const planStatusTone: Record<string, ChipTone> = {
  Draft: "info",
  Approved: "positive",
  Archived: "neutral",
};

function formatCost(value: number): string {
  return value >= 0.01 ? `$${value.toFixed(2)}` : `$${value.toFixed(4)}`;
}

export function PlansPage() {
  const projectId = useProjectId();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ["plans", projectId],
    queryFn: () => api.getPlans(projectId!),
    enabled: Boolean(projectId),
  });
  const profilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const profiles = profilesQuery.data ?? [];

  const [composing, setComposing] = useState(false);
  const [agentProfileId, setAgentProfileId] = useState<string | null>(null);
  const [goal, setGoal] = useState("");
  const [instruction, setInstruction] = useState("");
  const [convertResult, setConvertResult] = useState<{ planId: string; created: number; skipped: number } | null>(null);

  const gen = usePlanGeneration();
  const selectedProfileId = agentProfileId ?? profiles[0]?.id ?? null;
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;

  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] });

  const createPlan = useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => {
      invalidatePlans();
      closeComposer();
    },
  });
  const approvePlan = useMutation({ mutationFn: api.approvePlan, onSuccess: invalidatePlans });
  const archivePlan = useMutation({ mutationFn: api.archivePlan, onSuccess: invalidatePlans });
  const convertPlan = useMutation({
    mutationFn: (id: string) => api.convertPlanToTasks(id),
    onSuccess: (result, id) => {
      setConvertResult({ planId: id, created: result.created, skipped: result.skipped });
      invalidatePlans();
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  function closeComposer() {
    setComposing(false);
    setGoal("");
    setInstruction("");
    gen.reset();
  }

  function generate() {
    if (!projectId || !selectedProfileId || !goal.trim()) return;
    void gen.start({ projectId, agentProfileId: selectedProfileId, goal: goal.trim() });
  }

  function refine() {
    if (!projectId || !selectedProfileId || !gen.proposal || !instruction.trim()) return;
    const messages: PlanMessage[] = [
      { role: "assistant", content: JSON.stringify(gen.proposal) },
      { role: "user", content: instruction.trim() },
    ];
    void gen.start({ projectId, agentProfileId: selectedProfileId, goal: goal.trim(), messages });
    setInstruction("");
  }

  function store() {
    if (!projectId || !gen.proposal) return;
    const messages: PlanMessage[] = [
      { role: "user", content: goal.trim() },
      { role: "assistant", content: JSON.stringify(gen.proposal) },
    ];
    createPlan.mutate({
      projectId,
      title: gen.proposal.title,
      description: gen.proposal.summary,
      status: "Draft",
      generatedByProfileId: selectedProfileId,
      generationModel: selectedProfile?.model ?? null,
      generationMessages: messages,
      generationTokens: gen.tokenUsage,
      items: gen.proposal.items,
    });
  }

  function patchItem(index: number, patch: Partial<{ title: string; description: string; priority: TaskPriority }>) {
    if (!gen.proposal) return;
    gen.setProposal({
      ...gen.proposal,
      items: gen.proposal.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });
  }

  function removeItem(index: number) {
    if (!gen.proposal) return;
    gen.setProposal({ ...gen.proposal, items: gen.proposal.items.filter((_, i) => i !== index) });
  }

  function addItem() {
    if (!gen.proposal) return;
    gen.setProposal({
      ...gen.proposal,
      items: [...gen.proposal.items, { title: "New task", description: "", priority: "Medium" }],
    });
  }

  if (!projectId) return <EmptyState label="No project selected" />;

  const plans = plansQuery.data ?? [];

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader
        title="Plans"
        description="Draft a plan with an agent, store it, then turn an approved plan into tasks."
        actions={
          composing ? (
            <Button variant="secondary" onPress={closeComposer}>
              Close composer
            </Button>
          ) : (
            <Button variant="accent" onPress={() => setComposing(true)} isDisabled={profiles.length === 0}>
              New plan with agent
            </Button>
          )
        }
      />

      {composing ? (
        <SurfaceCard title="Plan composer">
          <Flex direction="column" gap="size-200">
            <Flex gap="size-200" alignItems="end" wrap>
              <Picker
                label="Agent"
                items={profiles}
                selectedKey={selectedProfileId ?? undefined}
                onSelectionChange={(key) => setAgentProfileId(String(key))}
                minWidth="size-2400"
              >
                {(profile) => <Item key={profile.id}>{profile.name}</Item>}
              </Picker>
            </Flex>
            <TextArea
              label="Goal"
              value={goal}
              onChange={setGoal}
              placeholder="e.g. Add passwordless email login with magic links"
              width="100%"
            />
            <Flex gap="size-100">
              <Button
                variant="accent"
                onPress={generate}
                isDisabled={!goal.trim() || !selectedProfileId || gen.isStreaming}
              >
                {gen.proposal ? "Regenerate" : "Generate plan"}
              </Button>
              {gen.isStreaming ? (
                <Flex alignItems="center" gap="size-100">
                  <ProgressCircle size="S" isIndeterminate aria-label="Generating" />
                  <Text>Agent is drafting the plan…</Text>
                </Flex>
              ) : null}
            </Flex>

            {gen.status === "Failed" ? <Text UNSAFE_style={{ color: "#fca5a5" }}>{gen.error}</Text> : null}

            {gen.isStreaming && gen.output ? (
              <pre
                style={{
                  margin: 0,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "rgba(8, 12, 20, 0.55)",
                  border: "1px solid rgba(167, 187, 226, 0.18)",
                  maxHeight: "160px",
                  overflow: "auto",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  opacity: 0.75,
                }}
              >
                {gen.output}
              </pre>
            ) : null}

            {gen.proposal ? (
              <>
                <Divider size="S" />
                <TextField
                  label="Plan title"
                  value={gen.proposal.title}
                  onChange={(value) => gen.setProposal({ ...gen.proposal!, title: value })}
                  width="100%"
                />
                <TextArea
                  label="Summary"
                  value={gen.proposal.summary}
                  onChange={(value) => gen.setProposal({ ...gen.proposal!, summary: value })}
                  width="100%"
                />
                <Heading level={5} margin={0}>
                  Tasks ({gen.proposal.items.length})
                </Heading>
                {gen.proposal.items.map((item, index) => (
                  <Well key={index}>
                    <Flex direction="column" gap="size-100">
                      <Flex gap="size-100" alignItems="end" wrap>
                        <TextField
                          label={`Task ${index + 1}`}
                          value={item.title}
                          onChange={(value) => patchItem(index, { title: value })}
                          flex
                        />
                        <Picker
                          label="Priority"
                          selectedKey={item.priority}
                          onSelectionChange={(key) => patchItem(index, { priority: key as TaskPriority })}
                        >
                          {taskPriorities.map((priority) => (
                            <Item key={priority}>{priority}</Item>
                          ))}
                        </Picker>
                        <Button variant="secondary" onPress={() => removeItem(index)}>
                          Remove
                        </Button>
                      </Flex>
                      <TextArea
                        label="Description"
                        value={item.description}
                        onChange={(value) => patchItem(index, { description: value })}
                        width="100%"
                      />
                    </Flex>
                  </Well>
                ))}
                <Flex gap="size-100" wrap>
                  <Button variant="secondary" onPress={addItem}>
                    Add task
                  </Button>
                </Flex>

                <Divider size="S" />
                <Text>Refine with the agent</Text>
                <Flex gap="size-100" alignItems="end" wrap>
                  <TextArea
                    aria-label="Refinement instruction"
                    value={instruction}
                    onChange={setInstruction}
                    placeholder="e.g. Split the migration task into smaller steps"
                    flex
                  />
                  <Button variant="primary" onPress={refine} isDisabled={!instruction.trim() || gen.isStreaming}>
                    Refine
                  </Button>
                </Flex>

                <Divider size="S" />
                <Flex justifyContent="space-between" alignItems="center" wrap gap="size-100">
                  {gen.tokenUsage ? (
                    <Text>
                      Generation cost: {gen.tokenUsage.totalTokens.toLocaleString()} tokens ·{" "}
                      {formatCost(gen.tokenUsage.estimatedCost)}
                    </Text>
                  ) : (
                    <span />
                  )}
                  <Button variant="cta" onPress={store} isDisabled={createPlan.isPending || gen.proposal.items.length === 0}>
                    Store as plan
                  </Button>
                </Flex>
              </>
            ) : null}
          </Flex>
        </SurfaceCard>
      ) : null}

      <SurfaceCard title="Stored plans">
        {plans.length === 0 ? (
          <Content>No plans yet. Use “New plan with agent” to draft one.</Content>
        ) : (
          plans.map((plan) => {
            const convertedItems = plan.items.filter((item) => item.taskId).length;
            const result = convertResult?.planId === plan.id ? convertResult : null;
            return (
              <div key={plan.id} data-testid="plan-card">
                <Well marginBottom="size-150">
                <Flex direction="column" gap="size-100">
                  <Flex justifyContent="space-between" alignItems="center" gap="size-100" wrap>
                    <Flex alignItems="center" gap="size-100">
                      <Text UNSAFE_style={{ fontWeight: 600 }}>{plan.title}</Text>
                      <Chip label={plan.status} tone={planStatusTone[plan.status] ?? "neutral"} />
                      {plan.generatedByProfileId ? <Chip label="AI-drafted" tone="accent" /> : null}
                    </Flex>
                    <ButtonGroup>
                      {plan.status === "Draft" ? (
                        <Button variant="secondary" onPress={() => approvePlan.mutate(plan.id)}>
                          Approve
                        </Button>
                      ) : null}
                      <Button
                        variant="cta"
                        onPress={() => convertPlan.mutate(plan.id)}
                        isDisabled={plan.status !== "Approved" || plan.items.length === 0 || convertPlan.isPending}
                      >
                        Create tasks
                      </Button>
                      {plan.status !== "Archived" ? (
                        <Button variant="secondary" onPress={() => archivePlan.mutate(plan.id)}>
                          Archive
                        </Button>
                      ) : null}
                    </ButtonGroup>
                  </Flex>

                  <Content>{plan.description}</Content>

                  {plan.items.length > 0 ? (
                    <Flex direction="column" gap="size-50">
                      {plan.items.map((item: PlanItemDto) => (
                        <Flex key={item.id} alignItems="center" gap="size-100">
                          <Chip label={item.priority} tone={priorityTone[item.priority]} />
                          <Text>{item.title}</Text>
                          {item.taskId ? <Chip label="✓ task" tone="positive" /> : null}
                        </Flex>
                      ))}
                    </Flex>
                  ) : null}

                  <Flex gap="size-200" wrap>
                    <Text UNSAFE_style={{ opacity: 0.7, fontSize: "12px" }}>
                      {plan.items.length} task{plan.items.length === 1 ? "" : "s"}
                      {convertedItems > 0 ? ` · ${convertedItems} converted` : ""}
                    </Text>
                    {plan.generationTokens ? (
                      <Text UNSAFE_style={{ opacity: 0.7, fontSize: "12px" }}>
                        Generation cost: {plan.generationTokens.totalTokens.toLocaleString()} tokens ·{" "}
                        {formatCost(plan.generationTokens.estimatedCost)}
                      </Text>
                    ) : null}
                  </Flex>

                  {plan.status !== "Approved" && plan.items.length > 0 && !plan.convertedAt ? (
                    <Text UNSAFE_style={{ opacity: 0.7, fontSize: "12px" }}>Approve the plan to create tasks.</Text>
                  ) : null}
                  {result ? (
                    <Text UNSAFE_style={{ color: "#86efac", fontSize: "12px" }}>
                      Created {result.created} task{result.created === 1 ? "" : "s"}
                      {result.skipped > 0 ? `, skipped ${result.skipped} already converted` : ""}.
                    </Text>
                  ) : null}
                </Flex>
                </Well>
              </div>
            );
          })
        )}
      </SurfaceCard>
    </Flex>
  );
}
