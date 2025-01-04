import { List } from "@mantine/core";

export const WhiskyPricingScale = () => {
  return (
    <List type="ordered">
      <List.Item>Under £40 a bottle</List.Item>
      <List.Item>£40 - £85 a bottle</List.Item>
      <List.Item>Over £85 a bottle</List.Item>
    </List>
  );
};

export const WhiskyRatingScale = () => {
  return (
    <List type="ordered">
      <List.Item>Unhappy about drinking again</List.Item>
      <List.Item>Shrugs, can drink it</List.Item>
      <List.Item>Solid, though perhaps unspectacular</List.Item>
      <List.Item>Tasty, would choose to order at a bar</List.Item>
      <List.Item>Exceptional, top tier</List.Item>
    </List>
  );
};
