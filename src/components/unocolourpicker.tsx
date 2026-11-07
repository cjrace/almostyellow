import { Button, Modal } from "@mantine/core";
import { colours, type Colour } from "@/unogame/engine/cards";
import { colourNames } from "@/unogame/cards";
import styles from "@/styles/unotable.module.css";

interface UnoColourPickerProps {
  opened: boolean;
  onChoose: (colour: Colour) => void;
  onCancel: () => void;
}

// Shown after picking a wild card. Each button has the colour's name and
// shape as well as its colour, and focus starts on the first.
export default function UnoColourPicker({
  opened,
  onChoose,
  onCancel,
}: UnoColourPickerProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      centered
      title="Choose a colour for your wild card"
      returnFocus={false}
      closeButtonProps={{ "aria-label": "Choose a different card" }}
    >
      <div role="group" aria-label="Colours">
        <div className={styles.picker}>
          {colours.map((colour, index) => (
            <Button
              key={colour}
              data-autofocus={index === 0 ? true : undefined}
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
    </Modal>
  );
}
