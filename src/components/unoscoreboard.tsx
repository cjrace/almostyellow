import { Table, Text } from "@mantine/core";

interface UnoScoreboardProps {
  players: { id: string; name: string; wins: number }[];
}

// Wins this session, most first. A tie for the lead names nobody.
export default function UnoScoreboard({ players }: UnoScoreboardProps) {
  const sorted = [...players].sort((a, b) => b.wins - a.wins);
  const best = sorted[0]?.wins ?? 0;
  const leaders = sorted.filter((p) => p.wins === best);
  return (
    <Table>
      <Table.Caption>Rounds won this session</Table.Caption>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Player</Table.Th>
          <Table.Th ta="right">Wins</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {sorted.map((player) => (
          <Table.Tr key={player.id}>
            <Table.Td style={{ overflowWrap: "anywhere" }}>
              {player.name}
              {leaders.length === 1 && best > 0 && player.wins === best ? (
                <Text span c="dimmed">
                  {" "}
                  (leading)
                </Text>
              ) : null}
            </Table.Td>
            <Table.Td ta="right">{player.wins}</Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
