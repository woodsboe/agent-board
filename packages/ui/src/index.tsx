import type { ReactNode } from "react";
import { Content, Divider, Flex, Heading, Text, View } from "@adobe/react-spectrum";

export function SurfaceCard(props: { title?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <View backgroundColor="gray-50" borderColor="dark" borderWidth="thin" borderRadius="large" padding="size-250">
      {props.title ? (
        <>
          <Flex alignItems="center" justifyContent="space-between" gap="size-100" marginBottom={props.description ? "size-50" : "size-100"}>
            <Heading level={4} margin={0}>
              {props.title}
            </Heading>
            {props.actions}
          </Flex>
          {props.description ? <Content marginBottom="size-150">{props.description}</Content> : null}
          <Divider size="S" marginBottom="size-150" />
        </>
      ) : null}
      {props.children}
    </View>
  );
}

export function SectionHeader(props: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <Flex alignItems="center" justifyContent="space-between" gap="size-200" marginBottom="size-200">
      <View>
        <Heading level={3} margin={0}>
          {props.title}
        </Heading>
        {props.description ? <Content>{props.description}</Content> : null}
      </View>
      {props.actions}
    </Flex>
  );
}

/** Big-number metric tile for dashboards. */
export function StatTile(props: { label: string; value: ReactNode; hint?: string }) {
  return (
    <View
      backgroundColor="gray-50"
      borderColor="dark"
      borderWidth="thin"
      borderRadius="large"
      padding="size-250"
      minWidth="size-2000"
      flex
    >
      <Text UNSAFE_style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.7 }}>
        {props.label}
      </Text>
      <Heading level={1} margin={0} UNSAFE_style={{ fontSize: "34px", lineHeight: 1.1, marginTop: "6px" }}>
        {props.value}
      </Heading>
      {props.hint ? <Content>{props.hint}</Content> : null}
    </View>
  );
}

export type ChipTone = "neutral" | "info" | "positive" | "warning" | "negative" | "accent";

const CHIP_COLORS: Record<ChipTone, { bg: string; fg: string }> = {
  neutral: { bg: "rgba(148, 163, 184, 0.22)", fg: "#cbd5e1" },
  info: { bg: "rgba(96, 165, 250, 0.22)", fg: "#93c5fd" },
  positive: { bg: "rgba(74, 222, 128, 0.20)", fg: "#86efac" },
  warning: { bg: "rgba(251, 191, 36, 0.22)", fg: "#fcd34d" },
  negative: { bg: "rgba(248, 113, 113, 0.22)", fg: "#fca5a5" },
  accent: { bg: "rgba(129, 140, 248, 0.24)", fg: "#c7d2fe" },
};

/** Small rounded status/priority pill. */
export function Chip(props: { label: ReactNode; tone?: ChipTone; title?: string }) {
  const tone = CHIP_COLORS[props.tone ?? "neutral"];
  return (
    <span
      title={props.title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        padding: "2px 9px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: "nowrap",
        background: tone.bg,
        color: tone.fg,
      }}
    >
      {props.label}
    </span>
  );
}
