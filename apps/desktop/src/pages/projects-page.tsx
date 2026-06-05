import { useEffect, useState } from "react";
import { Button, ButtonGroup, Content, Flex, Form, Item, Picker, Text, TextArea, TextField, View, Well } from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Chip, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAppStore } from "../store";

type ProjectForm = {
  name: string;
  description: string;
  gitRepositoryPath: string;
  gitAccountId: string | null;
};

const emptyForm = (): ProjectForm => ({
  name: "New Project",
  description: "Local-first software project.",
  gitRepositoryPath: ".",
  gitAccountId: null,
});

export function ProjectsPage() {
  const navigate = useNavigate();
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const setProjectExpanded = useAppStore((state) => state.setProjectExpanded);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const accountsQuery = useQuery({ queryKey: ["git-accounts"], queryFn: api.getGitAccounts });
  const accounts = accountsQuery.data ?? [];
  const accountName = (id: string | null | undefined) => accounts.find((account) => account.id === id)?.name ?? "None";

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["projects"] });
  const createProject = useMutation({ mutationFn: api.createProject, onSuccess: invalidate });
  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateProject>[1] }) => api.updateProject(id, data),
    onSuccess: invalidate,
  });

  const [form, setForm] = useState<ProjectForm>(emptyForm);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingProjectId) return;
    const project = projectsQuery.data?.find((entry) => entry.id === editingProjectId);
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        gitRepositoryPath: project.gitRepositoryPath,
        gitAccountId: project.gitAccountId ?? null,
      });
    }
  }, [editingProjectId, projectsQuery.data]);

  const accountOptions = [{ id: "none", name: "No Git account" }, ...accounts.map((account) => ({ id: account.id, name: account.name }))];

  function submit() {
    if (editingProjectId) updateProject.mutate({ id: editingProjectId, data: form });
    else createProject.mutate(form);
    setEditingProjectId(null);
    setForm(emptyForm());
  }

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Projects" description="Each project tracks a local repository and an optional Git account." />
      <SurfaceCard title={editingProjectId ? "Edit Project" : "Create Project"}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <TextArea label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <TextField label="Git Repository Path" value={form.gitRepositoryPath} onChange={(value) => setForm({ ...form, gitRepositoryPath: value })} />
          <Picker
            label="Git Account"
            items={accountOptions}
            selectedKey={form.gitAccountId ?? "none"}
            onSelectionChange={(key) => setForm({ ...form, gitAccountId: key === "none" ? null : String(key) })}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <ButtonGroup>
            <Button variant="accent" isDisabled={!form.name.trim()} onPress={submit}>
              {editingProjectId ? "Save Project" : "Create Project"}
            </Button>
            {editingProjectId ? (
              <Button variant="secondary" onPress={() => { setEditingProjectId(null); setForm(emptyForm()); }}>Cancel</Button>
            ) : null}
          </ButtonGroup>
        </Form>
      </SurfaceCard>

      <SurfaceCard title="Project List">
        <Flex direction="column" gap="size-150">
          {(projectsQuery.data ?? []).map((project) => (
            <Well key={project.id}>
              <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                <View>
                  <Flex gap="size-75" alignItems="center" wrap>
                    <Text>{project.name}</Text>
                    {activeProjectId === project.id ? <Chip label="Active" tone="positive" /> : null}
                    <Chip label={`Git: ${accountName(project.gitAccountId)}`} tone="neutral" />
                  </Flex>
                  <Content>{project.description}</Content>
                  <Content>Repository: {project.gitRepositoryPath}</Content>
                </View>
                <ButtonGroup>
                  <Button
                    variant="accent"
                    onPress={() => {
                      setActiveProjectId(project.id);
                      setProjectExpanded(project.id, true);
                      navigate(`/projects/${project.id}/dashboard`);
                    }}
                  >
                    Open
                  </Button>
                  <Button variant="secondary" onPress={() => setEditingProjectId(project.id)}>Edit</Button>
                </ButtonGroup>
              </Flex>
            </Well>
          ))}
        </Flex>
      </SurfaceCard>
    </Flex>
  );
}
