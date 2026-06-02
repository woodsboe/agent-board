import { useState } from "react";
import {
  Button,
  ButtonGroup,
  Cell,
  Column,
  Content,
  Flex,
  Form,
  Heading,
  Item,
  Picker,
  Row,
  SearchField,
  TableBody,
  TableHeader,
  TableView,
  Text,
  TextArea,
  TextField,
  View,
  Well,
} from "@adobe/react-spectrum";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contextTypes } from "@agentboard/domain";
import type { ContextItemDto, ContextPackDto } from "@agentboard/shared";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { api } from "../api";
import { EmptyState } from "../components/EmptyState";
import { useAppStore } from "../store";

export function ContextPage() {
  const projectId = useAppStore((state) => state.activeProjectId);
  const queryClient = useQueryClient();
  const itemsQuery = useQuery({ queryKey: ["context-items", projectId], queryFn: () => api.getContextItems(projectId!), enabled: Boolean(projectId) });
  const packsQuery = useQuery({ queryKey: ["context-packs", projectId], queryFn: () => api.getContextPacks(projectId!), enabled: Boolean(projectId) });
  const createItem = useMutation({
    mutationFn: api.createContextItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const updateItem = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateContextItem>[1] }) => api.updateContextItem(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const deleteItem = useMutation({
    mutationFn: api.deleteContextItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-items", projectId] }),
  });
  const createPack = useMutation({
    mutationFn: api.createContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const updatePack = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateContextPack>[1] }) => api.updateContextPack(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const deletePack = useMutation({
    mutationFn: api.deleteContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const duplicatePack = useMutation({
    mutationFn: api.duplicateContextPack,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["context-packs", projectId] }),
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("updated");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemForm, setItemForm] = useState({
    title: "",
    summary: "",
    content: "",
    type: "Architecture",
    tokenEstimate: 120,
    tags: "architecture",
    sourceType: "Manual",
    sourceReference: "manual",
  });
  const [packForm, setPackForm] = useState({ name: "", description: "", tokenBudget: 800 });
  const [editingPackId, setEditingPackId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const typeFilterOptions = [{ id: "All", name: "All types" }, ...contextTypes.map((type) => ({ id: type, name: type }))];
  const sortOptions = [
    { id: "updated", name: "Last updated" },
    { id: "title", name: "Title" },
    { id: "tokens", name: "Token estimate" },
  ];

  if (!projectId) return <EmptyState label="No project selected" />;

  const filteredItems = (itemsQuery.data ?? [])
    .filter((item) => `${item.title} ${item.summary} ${item.tags.join(" ")}`.toLowerCase().includes(search.toLowerCase()))
    .filter((item) => typeFilter === "All" || item.type === typeFilter)
    .sort((left, right) => {
      if (sortBy === "title") return left.title.localeCompare(right.title);
      if (sortBy === "tokens") return right.tokenEstimate - left.tokenEstimate;
      return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
    });
  const selectedItems = filteredItems.filter((item) => selectedItemIds.includes(item.id));
  const availableItems = filteredItems.filter((item) => !selectedItemIds.includes(item.id));

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Context" />
      <Flex gap="size-200" wrap>
        <SurfaceCard title={editingItemId ? "Edit Context Item" : "Create Context Item"}>
          <Form>
            <TextField name="context-title" label="Title" value={itemForm.title} onChange={(value) => setItemForm({ ...itemForm, title: value })} />
            <TextField name="context-summary" label="Summary" value={itemForm.summary} onChange={(value) => setItemForm({ ...itemForm, summary: value })} />
            <TextArea name="context-content" label="Content" value={itemForm.content} onChange={(value) => setItemForm({ ...itemForm, content: value })} />
            <TextField name="context-type" label="Type" value={itemForm.type} onChange={(value) => setItemForm({ ...itemForm, type: value })} />
            <TextField
              name="context-token-estimate"
              label="Token Estimate"
              type="number"
              value={String(itemForm.tokenEstimate)}
              onChange={(value) => setItemForm({ ...itemForm, tokenEstimate: Number(value) || 0 })}
            />
            <TextField name="context-tags" label="Tags" value={itemForm.tags} onChange={(value) => setItemForm({ ...itemForm, tags: value })} />
            <TextField name="context-source-type" label="Source Type" value={itemForm.sourceType} onChange={(value) => setItemForm({ ...itemForm, sourceType: value })} />
            <TextField
              name="context-source-reference"
              label="Source Reference"
              value={itemForm.sourceReference}
              onChange={(value) => setItemForm({ ...itemForm, sourceReference: value })}
            />
            <Button
              variant="accent"
              onPress={() => {
                const payload = {
                  projectId,
                  title: itemForm.title,
                  summary: itemForm.summary,
                  content: itemForm.content,
                  type: itemForm.type as ContextItemDto["type"],
                  tokenEstimate: itemForm.tokenEstimate,
                  tags: itemForm.tags.split(",").map((entry) => entry.trim()).filter(Boolean),
                  sourceType: itemForm.sourceType as ContextItemDto["sourceType"],
                  sourceReference: itemForm.sourceReference,
                };
                if (editingItemId) {
                  updateItem.mutate({ id: editingItemId, data: payload });
                } else {
                  createItem.mutate(payload);
                }
                setEditingItemId(null);
                setItemForm({
                  title: "",
                  summary: "",
                  content: "",
                  type: "Architecture",
                  tokenEstimate: 120,
                  tags: "architecture",
                  sourceType: "Manual",
                  sourceReference: "manual",
                });
              }}
            >
              {editingItemId ? "Save Context Item" : "Create Context Item"}
            </Button>
          </Form>
        </SurfaceCard>
        <SurfaceCard title={editingPackId ? "Edit Context Pack" : "Build Context Pack"}>
          <Form>
            <TextField name="pack-name" label="Name" value={packForm.name} onChange={(value) => setPackForm({ ...packForm, name: value })} />
            <TextArea name="pack-description" label="Description" value={packForm.description} onChange={(value) => setPackForm({ ...packForm, description: value })} />
            <TextField
              name="pack-token-budget"
              label="Token Budget"
              type="number"
              value={String(packForm.tokenBudget)}
              onChange={(value) => setPackForm({ ...packForm, tokenBudget: Number(value) || 0 })}
            />
            <Button
              variant="accent"
              onPress={() => {
                const payload = {
                  projectId,
                  name: packForm.name,
                  description: packForm.description,
                  tokenBudget: packForm.tokenBudget,
                  itemIds: selectedItemIds,
                };
                if (editingPackId) {
                  updatePack.mutate({ id: editingPackId, data: payload });
                } else {
                  createPack.mutate(payload);
                }
                setEditingPackId(null);
                setPackForm({ name: "", description: "", tokenBudget: 800 });
                setSelectedItemIds([]);
              }}
            >
              {editingPackId ? "Save Pack" : "Create Pack"}
            </Button>
          </Form>
        </SurfaceCard>
      </Flex>
      <SurfaceCard title="Context Library" description="Search, filter, tag, and sort reusable context.">
        <Flex gap="size-150" wrap marginBottom="size-150">
          <SearchField aria-label="Search context" value={search} onChange={setSearch} />
          <Picker label="Type Filter" items={typeFilterOptions} selectedKey={typeFilter} onSelectionChange={(key) => setTypeFilter(String(key))}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker label="Sort By" items={sortOptions} selectedKey={sortBy} onSelectionChange={(key) => setSortBy(String(key))}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
        </Flex>
        <TableView aria-label="Context library" selectionMode="multiple" selectedKeys={selectedItemIds} onSelectionChange={(keys) => setSelectedItemIds(Array.from(keys).map(String))}>
          <TableHeader>
            <Column key="title">Title</Column>
            <Column key="type">Type</Column>
            <Column key="tags">Tags</Column>
            <Column key="tokens">Tokens</Column>
            <Column key="updated">Last Updated</Column>
          </TableHeader>
          <TableBody>
            {filteredItems.map((item) => (
              <Row key={item.id}>
                <Cell>{item.title}</Cell>
                <Cell>{item.type}</Cell>
                <Cell>
                  <Text>{item.tags.join(", ")}</Text>
                </Cell>
                <Cell>{item.tokenEstimate}</Cell>
                <Cell>{new Date(item.updatedAt).toLocaleString()}</Cell>
              </Row>
            ))}
          </TableBody>
        </TableView>
      </SurfaceCard>
      <SurfaceCard title="Context Pack Builder" description="Add and remove context items in the current draft before saving the pack.">
        <Flex gap="size-150" wrap marginBottom="size-200">
          <Button variant="secondary" onPress={() => setSelectedItemIds(filteredItems.map((item) => item.id))}>Add All Filtered</Button>
          <Button variant="secondary" onPress={() => setSelectedItemIds([])}>Clear Draft</Button>
          <Content>{selectedItemIds.length} items currently selected for this pack draft</Content>
        </Flex>
        <Flex gap="size-250" wrap>
          <View flex>
            <Heading level={4}>Available Context Items</Heading>
            {availableItems.length ? availableItems.map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                    <Content>{item.tags.join(", ")}</Content>
                  </View>
                  <Button variant="secondary" onPress={() => setSelectedItemIds([...selectedItemIds, item.id])}>Add</Button>
                </Flex>
              </Well>
            )) : <Content>No more items match the current filters.</Content>}
          </View>
          <View flex>
            <Heading level={4}>Selected For Current Pack</Heading>
            {selectedItems.length ? selectedItems.map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.type} • {item.tokenEstimate} tokens</Content>
                    <Content>{item.tags.join(", ")}</Content>
                  </View>
                  <Button variant="secondary" onPress={() => setSelectedItemIds(selectedItemIds.filter((id) => id !== item.id))}>Remove</Button>
                </Flex>
              </Well>
            )) : <Content>No context items selected yet.</Content>}
          </View>
        </Flex>
      </SurfaceCard>
      <SurfaceCard title="Context Packs" description="Saved packs and maintenance actions.">
        <Flex gap="size-250" wrap>
          <View flex>
            <Heading level={4}>Available Context Items</Heading>
            {(itemsQuery.data ?? []).map((item) => (
              <Well key={item.id} marginBottom="size-100">
                <Flex justifyContent="space-between" alignItems="center" gap="size-150">
                  <View>
                    <Text>{item.title}</Text>
                    <Content>{item.summary}</Content>
                    <Content>{item.sourceType} • {item.sourceReference}</Content>
                    <Content>{item.tokenEstimate} tokens</Content>
                  </View>
                  <ButtonGroup>
                    <Button
                      variant="secondary"
                      onPress={() => {
                        setEditingItemId(item.id);
                        setItemForm({
                          title: item.title,
                          summary: item.summary,
                          content: item.content,
                          type: item.type,
                          tokenEstimate: item.tokenEstimate,
                          tags: item.tags.join(", "),
                          sourceType: item.sourceType,
                          sourceReference: item.sourceReference,
                        });
                      }}
                    >
                      Edit
                    </Button>
                    <Button variant="secondary" onPress={() => deleteItem.mutate(item.id)}>Delete</Button>
                  </ButtonGroup>
                </Flex>
              </Well>
            ))}
          </View>
          <View flex>
            <Heading level={4}>Selected Context Packs</Heading>
            {(packsQuery.data ?? []).map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                onDuplicate={() => duplicatePack.mutate(pack.id)}
                onDelete={() => deletePack.mutate(pack.id)}
                onEdit={() => {
                  setEditingPackId(pack.id);
                  setPackForm({ name: pack.name, description: pack.description, tokenBudget: pack.tokenBudget });
                  setSelectedItemIds(pack.itemIds);
                }}
              />
            ))}
          </View>
        </Flex>
      </SurfaceCard>
    </Flex>
  );
}

function PackCard(props: { pack: ContextPackDto; onDuplicate: () => void; onDelete: () => void; onEdit: () => void }) {
  return (
    <Well marginBottom="size-150">
      <Flex direction="column" gap="size-100">
        <Text>{props.pack.name}</Text>
        <Content>{props.pack.description}</Content>
        <Content>Token Budget: {props.pack.tokenBudget}</Content>
        <Content>Current Tokens: {props.pack.currentTokens}</Content>
        <Content>Remaining Tokens: {props.pack.remainingTokens}</Content>
        <Content>Items in Pack: {props.pack.itemIds.length}</Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={props.onEdit}>Edit</Button>
          <Button variant="secondary" onPress={props.onDuplicate}>Duplicate</Button>
          <Button variant="secondary" onPress={props.onDelete}>Delete</Button>
        </ButtonGroup>
      </Flex>
    </Well>
  );
}
