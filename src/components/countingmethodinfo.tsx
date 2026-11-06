"use client";

import { Anchor, Modal, Stack, Table, Text, Title } from "@mantine/core";
import { countText, countingMethods } from "@/lib/text-count";

const example = "My mother-in-law 👩‍💻";

export default function CountingMethodInfo({
  opened,
  onClose,
  segmentationSupported,
}: {
  opened: boolean;
  onClose: () => void;
  segmentationSupported: boolean;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="How counting works"
      size="lg"
      closeButtonProps={{ "aria-label": "Close" }}
    >
      <Stack>
        <Text>
          Different applications count words and characters differently. Choose
          the method that best matches what you need.
        </Text>
        <Text size="xl" fw={600}>
          {example}
        </Text>
        <Table captionSide="top" withTableBorder>
          <Table.Caption>Counts for the example above</Table.Caption>
          <Table.Thead>
            <Table.Tr>
              <Table.Th scope="col">Counting method</Table.Th>
              <Table.Th scope="col">Words</Table.Th>
              <Table.Th scope="col">Characters</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {countingMethods.map((method) => {
              const counts =
                !method.needsSegmenter || segmentationSupported
                  ? countText(example, method.value)
                  : null;
              return (
                <Table.Tr key={method.value}>
                  <Table.Th scope="row" fw={400}>
                    {method.name}
                  </Table.Th>
                  <Table.Td>{counts?.words ?? "Unavailable"}</Table.Td>
                  <Table.Td>{counts?.characters ?? "Unavailable"}</Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
        <Stack gap="xs">
          <Title order={3} size="h5">
            Unicode-aware (recommended)
          </Title>
          <Text>
            Recognises individual words within &quot;mother-in-law&quot;,
            ignores the standalone emoji when counting words, and treats the
            emoji as one visible character.
          </Text>
          <Title order={3} size="h5">
            Whitespace-separated
          </Title>
          <Text>
            Treats &quot;mother-in-law&quot; as one word because there are no
            spaces within it. Counts the standalone emoji as a word, but treats
            it as one visible character.
          </Text>
          <Title order={3} size="h5">
            Legacy string counting
          </Title>
          <Text>
            Uses the same word-counting approach as whitespace-separated
            counting, but measures character length using UTF-16 code units. The
            emoji occupies five code units rather than one visible character.
          </Text>
        </Stack>
        <Text size="sm" c="dimmed">
          Spaces and line breaks count as characters too. These methods do not
          guarantee matching results in Microsoft Word or other applications.
        </Text>
        <Text size="sm">
          Unicode-aware counting follows the approach introduced in newer GOV.UK
          Frontend releases. Other applications may count differently. See the{" "}
          <Anchor
            href="https://github.com/alphagov/govuk-frontend/releases/tag/v6.6.0"
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
          >
            GOV.UK Frontend v6.6.0 release notes
          </Anchor>
          .
        </Text>
      </Stack>
    </Modal>
  );
}
