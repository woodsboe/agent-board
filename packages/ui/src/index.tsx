import type { ReactNode } from "react";
import { Content, Divider, Flex, Heading, View } from "@adobe/react-spectrum";

export function SurfaceCard(props: { title: string; description?: string; children: ReactNode }) {
  return (
    <View backgroundColor="gray-50" borderColor="dark" borderWidth="thin" borderRadius="large" padding="size-250">
      <Heading level={4} marginTop={0} marginBottom="size-100">
        {props.title}
      </Heading>
      {props.description ? (
        <Content marginBottom="size-150">{props.description}</Content>
      ) : null}
      <Divider size="S" marginBottom="size-150" />
      {props.children}
    </View>
  );
}

export function SectionHeader(props: { title: string; actions?: ReactNode }) {
  return (
    <Flex alignItems="center" justifyContent="space-between" marginBottom="size-200">
      <Heading level={3} margin={0}>
        {props.title}
      </Heading>
      {props.actions}
    </Flex>
  );
}
