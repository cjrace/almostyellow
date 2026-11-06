import { useEffect, useRef } from "react";
import { Button, Text } from "@mantine/core";
import { colours, type Colour } from "@/unogame/engine/cards";
import { colourNames } from "@/unogame/cards";
import styles from "@/styles/unotable.module.css";

interface UnoColourPickerProps {
  onChoose: (colour: Colour) => void;
  onCancel: () => void;
}

// Shown after picking a wild card. Each button has the colour's name and
// shape as well as its colour, and focus starts on the first.
export default function UnoColourPicker({
  onChoose,
  onCancel,
}: UnoColourPickerProps) {
  const firstRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
  }, []);
  return (
    <div role="group" aria-labelledby="uno_colour_prompt">
      <Text id="uno_colour_prompt" fw={700} mb="xs">
        Choose a colour for your wild card
      </Text>
      <div className={styles.picker}>
        {colours.map((colour, index) => (
          <Button
            key={colour}
            ref={index === 0 ? firstRef : undefined}
            variant="filled"
            color={colour}
            leftSection={
              <span
                className={styles.swatch}
                data-colour={colour}
                aria-hidden="true"
              />
            }
            onClick={() => {
              onChoose(colour);
            }}
          >
            {colourNames[colour]}
          </Button>
        ))}
      </div>
      <Button variant="subtle" mt="xs" onClick={onCancel}>
        Choose a different card
      </Button>
    </div>
  );
}
