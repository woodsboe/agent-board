import { useState } from "react";
import { Button, ButtonGroup, Content, Flex, Form, Text, TextArea, TextField, View, Well } from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../store";

export function PlansPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const plansQuery = useQuery({ queryKey: ["plans", projectId], queryFn: () => api.getPlans(projectId!), enabled: Boolean(projectId) });
  const createPlan = useMutation({
    mutationFn: api.createPlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const updatePlan = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updatePlan>[1] }) => api.updatePlan(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const approvePlan = useMutation({
    mutationFn: api.approvePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const archivePlan = useMutation({
    mutationFn: api.archivePlan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans", projectId] }),
  });
  const [form, setForm] = useState({ title: "", description: "" });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  if (!projectId) return <EmptyState label="No project selected" />;

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Plans" />
      <SurfaceCard title={editingPlanId ? "Edit Plan" : "Create Plan"}>
        <Form>
          <TextField name="plan-title" label="Title" value={form.title} onChange={(value) => setForm({ ...form, title: value })} />
          <TextArea name="plan-description" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <Button
            variant="accent"
            onPress={() => {
              if (editingPlanId) {
                updatePlan.mutate({ id: editingPlanId, data: { title: form.title, description: form.description } });
              } else {
                createPlan.mutate({ projectId, title: form.title, description: form.description, status: "Draft" });
              }
              setEditingPlanId(null);
              setForm({ title: "", description: "" });
            }}
          >
            {editingPlanId ? "Save Plan" : "Create Plan"}
          </Button>
        </Form>
      </SurfaceCard>
      <SurfaceCard title="Plan List">
        {(plansQuery.data ?? []).map((plan) => (
          <Well key={plan.id} marginBottom="size-150">
            <Flex justifyContent="space-between" alignItems="center">
              <View>
                <Text>{plan.title}</Text>
                <Content>{plan.description}</Content>
                <Content>Status: {plan.status}</Content>
              </View>
              <ButtonGroup>
                <Button
                  variant="secondary"
                  onPress={() => {
                    setEditingPlanId(plan.id);
                    setForm({ title: plan.title, description: plan.description });
                  }}
                >
                  Edit
                </Button>
                <Button variant="secondary" onPress={() => approvePlan.mutate(plan.id)}>Approve</Button>
                <Button variant="secondary" onPress={() => archivePlan.mutate(plan.id)}>Archive</Button>
              </ButtonGroup>
            </Flex>
          </Well>
        ))}
      </SurfaceCard>
    </Flex>
  );
}
