import { useEffect, useState } from "react";
import { Button, ButtonGroup, Content, Flex, Form, Text, TextArea, TextField, View, Well } from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { useAppStore } from "../store";

export function ProjectsPage() {
  const activeProjectId = useAppStore((state) => state.activeProjectId);
  const setActiveProjectId = useAppStore((state) => state.setActiveProjectId);
  const queryClient = useQueryClient();
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: api.getProjects });
  const createProject = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const updateProject = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateProject>[1] }) => api.updateProject(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
  const [form, setForm] = useState({
    name: "New Project",
    description: "Local-first software project.",
    gitRepositoryPath: ".",
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (!editingProjectId) return;
    const project = projectsQuery.data?.find((entry) => entry.id === editingProjectId);
    if (project) {
      setForm({
        name: project.name,
        description: project.description,
        gitRepositoryPath: project.gitRepositoryPath,
      });
    }
  }, [editingProjectId, projectsQuery.data]);

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Projects" />
      <SurfaceCard title={editingProjectId ? "Edit Project" : "Create Project"}>
        <Form onSubmit={(event) => event.preventDefault()}>
          <TextField name="project-name" label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
          <TextArea name="project-description" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />
          <TextField name="project-git-path" label="Git Repository Path" value={form.gitRepositoryPath} onChange={(value) => setForm({ ...form, gitRepositoryPath: value })} />
          <Button
            variant="accent"
            onPress={() => {
              if (editingProjectId) {
                updateProject.mutate({ id: editingProjectId, data: form });
              } else {
                createProject.mutate(form);
              }
              setEditingProjectId(null);
              setForm({ name: "New Project", description: "Local-first software project.", gitRepositoryPath: "." });
            }}
          >
            {editingProjectId ? "Save Project" : "Create Project"}
          </Button>
        </Form>
      </SurfaceCard>
      <SurfaceCard title="Project List">
        {(projectsQuery.data ?? []).map((project) => (
          <Well key={project.id} marginBottom="size-150">
            <Flex justifyContent="space-between" alignItems="center">
              <View>
                <Text>{project.name}</Text>
                <Content>{project.description}</Content>
                <Content>Repository: {project.gitRepositoryPath}</Content>
              </View>
              <ButtonGroup>
                <Button variant={activeProjectId === project.id ? "accent" : "secondary"} onPress={() => setActiveProjectId(project.id)}>
                  {activeProjectId === project.id ? "Selected" : "Open"}
                </Button>
                <Button variant="secondary" onPress={() => setEditingProjectId(project.id)}>Edit</Button>
              </ButtonGroup>
            </Flex>
          </Well>
        ))}
      </SurfaceCard>
    </Flex>
  );
}
