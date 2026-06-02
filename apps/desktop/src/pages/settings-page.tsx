import { Content, Flex, Form, Item, Picker } from "@adobe/react-spectrum";
import { SectionHeader, SurfaceCard } from "@agentboard/ui";
import { useAppStore } from "../store";

export function SettingsPage() {
  const {
    themeMode,
    setThemeMode,
    boardDensity,
    setBoardDensity,
    sidebarWidth,
    setSidebarWidth,
    detailPanelWidth,
    setDetailPanelWidth,
  } = useAppStore();

  return (
    <Flex direction="column" gap="size-250">
      <SectionHeader title="Settings" />
      <SurfaceCard title="Environment">
        <Content>Local-first mode only. No authentication or SaaS sync configured in V1.</Content>
      </SurfaceCard>
      <SurfaceCard title="Workspace Preferences" description="Persisted locally for this machine and browser profile.">
        <Form>
          <Picker label="Theme" items={[{ id: "dark", name: "Dark" }, { id: "light", name: "Light" }]} selectedKey={themeMode} onSelectionChange={(key) => setThemeMode(String(key) as "dark" | "light")}>
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Board Density"
            items={[{ id: "comfortable", name: "Comfortable" }, { id: "compact", name: "Compact" }]}
            selectedKey={boardDensity}
            onSelectionChange={(key) => setBoardDensity(String(key) as "comfortable" | "compact")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Sidebar Width"
            items={[{ id: "narrow", name: "Narrow" }, { id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]}
            selectedKey={sidebarWidth}
            onSelectionChange={(key) => setSidebarWidth(String(key) as "narrow" | "standard" | "wide")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
          <Picker
            label="Task Detail Width"
            items={[{ id: "standard", name: "Standard" }, { id: "wide", name: "Wide" }]}
            selectedKey={detailPanelWidth}
            onSelectionChange={(key) => setDetailPanelWidth(String(key) as "standard" | "wide")}
          >
            {(item) => <Item key={item.id}>{item.name}</Item>}
          </Picker>
        </Form>
      </SurfaceCard>
    </Flex>
  );
}
