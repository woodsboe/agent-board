import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogContainer,
  Divider,
  Flex,
  Form,
  Heading,
  Item,
  Picker,
  TabList,
  TabPanels,
  Tabs,
  Text,
  TextArea,
  TextField,
  View,
  Well,
} from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agentProviders, credentialKinds, gitHosts, providerRuntimeKind, type AgentProvider } from "@agentboard/domain";
import type { AgentProfileDto, CredentialDto, GitAccountDto } from "@agentboard/shared";
import { Chip, SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { useAppStore } from "../store";
import { formatProvider } from "../task-presentation";

export function SettingsPage() {
  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Settings" description="Connect agents and Git accounts, and tune your workspace." />
      <Tabs aria-label="Settings sections">
        <TabList>
          <Item key="credentials">Credentials</Item>
          <Item key="agents">Agent Profiles</Item>
          <Item key="git">Git Accounts</Item>
          <Item key="preferences">Preferences</Item>
        </TabList>
        <TabPanels>
          <Item key="credentials"><CredentialsTab /></Item>
          <Item key="agents"><AgentProfilesTab /></Item>
          <Item key="git"><GitAccountsTab /></Item>
          <Item key="preferences"><PreferencesTab /></Item>
        </TabPanels>
      </Tabs>
    </Flex>
  );
}

// ------------------------------------------------------------- Credentials
type CredentialForm = { name: string; kind: string; provider: string; secret: string };

function CredentialsTab() {
  const queryClient = useQueryClient();
  const credentialsQuery = useQuery({ queryKey: ["credentials"], queryFn: api.getCredentials });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["credentials"] });
  const create = useMutation({ mutationFn: api.createCredential, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteCredential, onSuccess: invalidate });
  const [form, setForm] = useState<CredentialForm | null>(null);

  const providerOptions =
    form?.kind === "git_pat"
      ? ["github", "gitlab", "generic"]
      : ["anthropic", "openai", "openai-compatible"];

  return (
    <View marginTop="size-200">
      <SurfaceCard
        title="Credentials"
        description="API keys and Git tokens are encrypted at rest. Only a masked preview is ever shown."
        actions={<Button variant="accent" onPress={() => setForm({ name: "", kind: "provider_api_key", provider: "anthropic", secret: "" })}>Add Credential</Button>}
      >
        <Flex direction="column" gap="size-100">
          {(credentialsQuery.data ?? []).map((credential: CredentialDto) => (
            <Well key={credential.id}>
              <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                <View>
                  <Flex gap="size-75" alignItems="center">
                    <Text>{credential.name}</Text>
                    <Chip label={credential.kind === "git_pat" ? "Git token" : "API key"} tone="accent" />
                    <Chip label={credential.provider} tone="info" />
                  </Flex>
                  <Content>Secret: {credential.preview}</Content>
                </View>
                <Button variant="negative" onPress={() => remove.mutate(credential.id)}>Delete</Button>
              </Flex>
            </Well>
          ))}
          {!(credentialsQuery.data ?? []).length ? <Content>No credentials yet. Add one to connect a real agent or Git host.</Content> : null}
        </Flex>
      </SurfaceCard>

      <DialogContainer onDismiss={() => setForm(null)}>
        {form ? (
          <Dialog>
            <Heading>Add Credential</Heading>
            <Divider />
            <Content>
              <Form>
                <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} autoFocus />
                <Picker label="Type" items={credentialKinds.map((k) => ({ id: k, name: k === "git_pat" ? "Git token" : "Provider API key" }))} selectedKey={form.kind} onSelectionChange={(key) => setForm({ ...form, kind: String(key), provider: String(key) === "git_pat" ? "github" : "anthropic" })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <Picker label="Provider" items={providerOptions.map((p) => ({ id: p, name: p }))} selectedKey={form.provider} onSelectionChange={(key) => setForm({ ...form, provider: String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <TextField label="Secret" type="password" value={form.secret} onChange={(value) => setForm({ ...form, secret: value })} description="Pasted once, encrypted immediately." />
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setForm(null)}>Cancel</Button>
              <Button
                variant="accent"
                isDisabled={!form.name.trim() || !form.secret.trim()}
                onPress={() => {
                  create.mutate({ name: form.name, kind: form.kind as CredentialForm["kind"] as "provider_api_key" | "git_pat", provider: form.provider, secret: form.secret });
                  setForm(null);
                }}
              >
                Save
              </Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </View>
  );
}

// --------------------------------------------------------- Agent Profiles
type ProfileForm = {
  id: string | null;
  name: string;
  description: string;
  systemPrompt: string;
  provider: AgentProvider;
  model: string;
  credentialId: string | null;
  baseUrl: string;
  temperature: string;
  maxTokens: string;
};

const emptyProfile = (): ProfileForm => ({
  id: null,
  name: "",
  description: "",
  systemPrompt: "You are a focused software engineering agent.",
  provider: "anthropic",
  model: "claude-sonnet-4-6",
  credentialId: null,
  baseUrl: "",
  temperature: "",
  maxTokens: "",
});

function AgentProfilesTab() {
  const queryClient = useQueryClient();
  const profilesQuery = useQuery({ queryKey: ["agent-profiles"], queryFn: api.getAgentProfiles });
  const credentialsQuery = useQuery({ queryKey: ["credentials"], queryFn: api.getCredentials });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["agent-profiles"] });
  const create = useMutation({ mutationFn: api.createAgentProfile, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateAgentProfile>[1] }) => api.updateAgentProfile(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteAgentProfile, onSuccess: invalidate });
  const [form, setForm] = useState<ProfileForm | null>(null);

  const apiCredentials = (credentialsQuery.data ?? []).filter((c) => c.kind === "provider_api_key");
  const credentialName = (id: string | null) => apiCredentials.find((c) => c.id === id)?.name ?? "None";

  function openEdit(profile: AgentProfileDto) {
    setForm({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      systemPrompt: profile.systemPrompt,
      provider: profile.provider,
      model: profile.model,
      credentialId: profile.credentialId ?? null,
      baseUrl: profile.baseUrl ?? "",
      temperature: profile.temperature?.toString() ?? "",
      maxTokens: profile.maxTokens?.toString() ?? "",
    });
  }

  function submit() {
    if (!form) return;
    const payload = {
      name: form.name,
      description: form.description,
      systemPrompt: form.systemPrompt,
      provider: form.provider,
      runtimeKind: providerRuntimeKind[form.provider],
      model: form.model,
      credentialId: form.credentialId,
      baseUrl: form.baseUrl.trim() || null,
      temperature: form.temperature.trim() ? Number(form.temperature) : null,
      maxTokens: form.maxTokens.trim() ? Number(form.maxTokens) : null,
    };
    if (form.id) update.mutate({ id: form.id, data: payload });
    else create.mutate(payload);
    setForm(null);
  }

  const isCli = form ? providerRuntimeKind[form.provider] === "cli" : false;

  return (
    <View marginTop="size-200">
      <SurfaceCard
        title="Agent Profiles"
        description="Each profile binds a provider, model, and optional credential. Profiles without a usable credential fall back to the mock runtime."
        actions={<Button variant="accent" onPress={() => setForm(emptyProfile())}>Add Profile</Button>}
      >
        <Flex direction="column" gap="size-100">
          {(profilesQuery.data ?? []).map((profile) => (
            <Well key={profile.id}>
              <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                <View>
                  <Flex gap="size-75" alignItems="center" wrap>
                    <Text>{profile.name}</Text>
                    <Chip label={formatProvider(profile.provider)} tone="accent" />
                    <Chip label={profile.runtimeKind.toUpperCase()} tone="neutral" />
                  </Flex>
                  <Content>{profile.model}{profile.credentialId ? ` • key: ${credentialName(profile.credentialId)}` : " • no key (mock fallback)"}</Content>
                  <Content>{profile.description}</Content>
                </View>
                <ButtonGroup>
                  <Button variant="secondary" onPress={() => openEdit(profile)}>Edit</Button>
                  <Button variant="negative" onPress={() => remove.mutate(profile.id)}>Delete</Button>
                </ButtonGroup>
              </Flex>
            </Well>
          ))}
        </Flex>
      </SurfaceCard>

      <DialogContainer onDismiss={() => setForm(null)}>
        {form ? (
          <Dialog>
            <Heading>{form.id ? "Edit Agent Profile" : "Add Agent Profile"}</Heading>
            <Divider />
            <Content>
              <Form>
                {[
                  <TextField key="name" label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} autoFocus />,
                  <TextArea key="desc" label="Description" value={form.description} onChange={(value) => setForm({ ...form, description: value })} />,
                  <TextArea key="sys" label="System Prompt" value={form.systemPrompt} onChange={(value) => setForm({ ...form, systemPrompt: value })} />,
                  <Picker key="provider" label="Provider" items={agentProviders.map((p) => ({ id: p, name: formatProvider(p) }))} selectedKey={form.provider} onSelectionChange={(key) => setForm({ ...form, provider: String(key) as AgentProvider })}>
                    {(item) => <Item key={item.id}>{item.name}</Item>}
                  </Picker>,
                  <TextField key="model" label="Model" value={form.model} onChange={(value) => setForm({ ...form, model: value })} description={isCli ? "Informational for CLI runtimes." : undefined} />,
                  ...(!isCli
                    ? [
                        <Picker key="cred" label="Credential" items={[{ id: "none", name: "None (mock fallback)" }, ...apiCredentials.map((c) => ({ id: c.id, name: `${c.name} (${c.provider})` }))]} selectedKey={form.credentialId ?? "none"} onSelectionChange={(key) => setForm({ ...form, credentialId: key === "none" ? null : String(key) })}>
                          {(item) => <Item key={item.id}>{item.name}</Item>}
                        </Picker>,
                      ]
                    : []),
                  ...(form.provider === "openai-compatible"
                    ? [<TextField key="baseurl" label="Base URL" value={form.baseUrl} onChange={(value) => setForm({ ...form, baseUrl: value })} description="e.g. http://localhost:11434/v1 (Ollama)" />]
                    : []),
                  ...(!isCli
                    ? [
                        <Flex key="params" gap="size-150">
                          <TextField label="Temperature" value={form.temperature} onChange={(value) => setForm({ ...form, temperature: value })} width="size-1600" />
                          <TextField label="Max Tokens" value={form.maxTokens} onChange={(value) => setForm({ ...form, maxTokens: value })} width="size-1600" />
                        </Flex>,
                      ]
                    : []),
                ]}
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setForm(null)}>Cancel</Button>
              <Button variant="accent" isDisabled={!form.name.trim() || !form.model.trim()} onPress={submit}>Save</Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </View>
  );
}

// ------------------------------------------------------------ Git Accounts
type GitForm = {
  id: string | null;
  name: string;
  host: string;
  authorName: string;
  authorEmail: string;
  apiBaseUrl: string;
  remoteUrl: string;
  credentialId: string | null;
};

const emptyGit = (): GitForm => ({ id: null, name: "", host: "github", authorName: "", authorEmail: "", apiBaseUrl: "", remoteUrl: "", credentialId: null });

function GitAccountsTab() {
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({ queryKey: ["git-accounts"], queryFn: api.getGitAccounts });
  const credentialsQuery = useQuery({ queryKey: ["credentials"], queryFn: api.getCredentials });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["git-accounts"] });
  const create = useMutation({ mutationFn: api.createGitAccount, onSuccess: invalidate });
  const update = useMutation({ mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateGitAccount>[1] }) => api.updateGitAccount(id, data), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: api.deleteGitAccount, onSuccess: invalidate });
  const [form, setForm] = useState<GitForm | null>(null);

  const patCredentials = (credentialsQuery.data ?? []).filter((c) => c.kind === "git_pat");
  const credentialName = (id: string | null | undefined) => patCredentials.find((c) => c.id === id)?.name ?? "No token";

  function openEdit(account: GitAccountDto) {
    setForm({
      id: account.id,
      name: account.name,
      host: account.host,
      authorName: account.authorName,
      authorEmail: account.authorEmail,
      apiBaseUrl: account.apiBaseUrl ?? "",
      remoteUrl: account.remoteUrl ?? "",
      credentialId: account.credentialId ?? null,
    });
  }

  function submit() {
    if (!form) return;
    const payload = {
      name: form.name,
      host: form.host as GitAccountDto["host"],
      authorName: form.authorName,
      authorEmail: form.authorEmail,
      apiBaseUrl: form.apiBaseUrl.trim() || null,
      remoteUrl: form.remoteUrl.trim() || null,
      credentialId: form.credentialId,
    };
    if (form.id) update.mutate({ id: form.id, data: payload });
    else create.mutate(payload);
    setForm(null);
  }

  return (
    <View marginTop="size-200">
      <SurfaceCard
        title="Git Accounts"
        description="Multiple commit identities and host connections. Link a Git token credential to read pull requests and issues."
        actions={<Button variant="accent" onPress={() => setForm(emptyGit())}>Add Account</Button>}
      >
        <Flex direction="column" gap="size-100">
          {(accountsQuery.data ?? []).map((account) => (
            <Well key={account.id}>
              <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                <View>
                  <Flex gap="size-75" alignItems="center">
                    <Text>{account.name}</Text>
                    <Chip label={account.host} tone="accent" />
                  </Flex>
                  <Content>{account.authorName} &lt;{account.authorEmail}&gt;</Content>
                  <Content>Token: {credentialName(account.credentialId)}</Content>
                </View>
                <ButtonGroup>
                  <Button variant="secondary" onPress={() => openEdit(account)}>Edit</Button>
                  <Button variant="negative" onPress={() => remove.mutate(account.id)}>Delete</Button>
                </ButtonGroup>
              </Flex>
            </Well>
          ))}
          {!(accountsQuery.data ?? []).length ? <Content>No Git accounts yet.</Content> : null}
        </Flex>
      </SurfaceCard>

      <DialogContainer onDismiss={() => setForm(null)}>
        {form ? (
          <Dialog>
            <Heading>{form.id ? "Edit Git Account" : "Add Git Account"}</Heading>
            <Divider />
            <Content>
              <Form>
                <TextField label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} autoFocus />
                <Picker label="Host" items={gitHosts.map((h) => ({ id: h, name: h }))} selectedKey={form.host} onSelectionChange={(key) => setForm({ ...form, host: String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
                <Flex gap="size-150">
                  <TextField label="Author Name" value={form.authorName} onChange={(value) => setForm({ ...form, authorName: value })} flex />
                  <TextField label="Author Email" value={form.authorEmail} onChange={(value) => setForm({ ...form, authorEmail: value })} flex />
                </Flex>
                <TextField label="Remote URL" value={form.remoteUrl} onChange={(value) => setForm({ ...form, remoteUrl: value })} description="Used to resolve owner/repo for PRs & issues, e.g. https://github.com/owner/repo" />
                <TextField label="API Base URL" value={form.apiBaseUrl} onChange={(value) => setForm({ ...form, apiBaseUrl: value })} description="Optional — for self-hosted GitHub/GitLab." />
                <Picker label="Access Token" items={[{ id: "none", name: "No token" }, ...patCredentials.map((c) => ({ id: c.id, name: `${c.name} (${c.provider})` }))]} selectedKey={form.credentialId ?? "none"} onSelectionChange={(key) => setForm({ ...form, credentialId: key === "none" ? null : String(key) })}>
                  {(item) => <Item key={item.id}>{item.name}</Item>}
                </Picker>
              </Form>
            </Content>
            <ButtonGroup>
              <Button variant="secondary" onPress={() => setForm(null)}>Cancel</Button>
              <Button variant="accent" isDisabled={!form.name.trim() || !form.authorName.trim() || !form.authorEmail.trim()} onPress={submit}>Save</Button>
            </ButtonGroup>
          </Dialog>
        ) : null}
      </DialogContainer>
    </View>
  );
}

// ------------------------------------------------------------- Preferences
function PreferencesTab() {
  const { themeMode, setThemeMode, boardDensity, setBoardDensity, sidebarWidth, setSidebarWidth, detailPanelWidth, setDetailPanelWidth } = useAppStore();
  return (
    <View marginTop="size-200">
      <SurfaceCard title="Workspace Preferences" description="Persisted locally for this machine and browser profile.">
        <Form>
          <Picker label="Theme" items={[{ id: "dark", name: "Dark" }, { id: "light", name: "Light" }]} selectedKey={themeMode} onSelectionChange={(key) => setThemeMode(String(key) as "dark" | "light")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker label="Board Density" items={[{ id: "comfortable", name: "Comfortable" }, { id: "compact", name: "Compact" }]} selectedKey={boardDensity} onSelectionChange={(key) => setBoardDensity(String(key) as "comfortable" | "compact")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker label="Sidebar Width" items={[{ id: "narrow", name: "Narrow" }, { id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]} selectedKey={sidebarWidth} onSelectionChange={(key) => setSidebarWidth(String(key) as "narrow" | "standard" | "wide")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker label="Task Detail Width" items={[{ id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]} selectedKey={detailPanelWidth} onSelectionChange={(key) => setDetailPanelWidth(String(key) as "standard" | "wide")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
        </Form>
      </SurfaceCard>
    </View>
  );
}
