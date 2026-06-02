import { Heading, IllustratedMessage } from "@adobe/react-spectrum";

export function EmptyState(props: { label: string }) {
  return (
    <IllustratedMessage>
      <Heading>{props.label}</Heading>
    </IllustratedMessage>
  );
}
