"use client";

import { useMemo, useState } from "react";
import { NativeSelect, Stack } from "@mantine/core";
import UnoTable from "@/components/unotable";
import { getUnoCardName } from "@/unogame/cards";
import {
  buildPreview,
  previewScenarios,
  type PreviewScenario,
} from "@/unogame/preview";

// Synthetic tables for checking layouts and interaction. Nothing here plays
// the game: choosing a card just reports the choice.
export default function UnoPreview() {
  const [scenario, setScenario] = useState<PreviewScenario>("two-players");
  const preview = useMemo(() => buildPreview(scenario), [scenario]);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Stack gap="xs" style={{ flex: 1 }}>
      <NativeSelect
        label="Scenario"
        value={scenario}
        data={previewScenarios}
        onChange={(event) => {
          setScenario(event.currentTarget.value as PreviewScenario);
          setMessage(null);
        }}
      />
      <UnoTable
        key={scenario}
        view={preview.view}
        mine={preview.mine}
        me={preview.me}
        names={preview.names}
        scores={preview.scores}
        announcement={message ?? preview.announcement}
        onPlay={(cardId, colour, declareUno) => {
          const card = preview.mine.hand.find((c) => c.id === cardId);
          setMessage(
            `You chose ${card ? getUnoCardName(card) : "a card"}${colour ? ` and ${colour}` : ""}${declareUno ? ", saying Uno" : ""}.`,
          );
        }}
        onDraw={() => {
          setMessage("You chose to draw a card.");
        }}
        onKeep={() => {
          setMessage("You kept the card you drew.");
        }}
        onCatch={() => {
          setMessage("You caught a player for Uno.");
        }}
        onSayUno={() => {
          setMessage("You said Uno.");
        }}
      />
    </Stack>
  );
}
