import { IconTrophy } from "@tabler/icons-react";
import { Paper, Text } from "@mantine/core";
import styles from "@/styles/unotable.module.css";

// Who won the round, centred and colourful. It is a status, so it is read out
// when it appears.
export default function UnoWinner({
  name,
  you,
}: {
  name: string;
  you: boolean;
}) {
  return (
    <Paper
      role="status"
      shadow="md"
      p="xl"
      radius="lg"
      className={styles.winner}
    >
      <IconTrophy
        size={96}
        stroke={1.5}
        className={styles.trophy}
        aria-hidden="true"
      />
      <Text className={styles.winnerName} fw={900}>
        {you ? "You" : name}
      </Text>
      <Text fw={700} size="xl">
        won the round!
      </Text>
    </Paper>
  );
}
