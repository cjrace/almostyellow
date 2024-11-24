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
      <List.Item>Would only drink again if paid</List.Item>
      <List.Item>Unhappy about drinking again</List.Item>
      <List.Item>Shrugs, can drink it</List.Item>
      <List.Item>Tasty, would order at a bar</List.Item>
      <List.Item>Would happily buy bottles of it</List.Item>
    </List>
  );
};
