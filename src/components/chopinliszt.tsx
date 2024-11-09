"use client";

import { useState } from "react";
import {
  Checkbox,
  Modal,
  Button,
  Textarea,
  Space,
  Group,
  ActionIcon,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

interface Item {
  id: string;
  text: string;
  checked: boolean;
}

const ChopinLiszt: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const addItem = () => {
    if (newItemText.trim()) {
      const newItems = newItemText.split(/\r?\n/);
      setItems((prevItems) => [
        ...prevItems,
        ...newItems.map((text) => ({
          id: String(crypto.randomUUID()),
          text: text.trim(),
          checked: false,
        })),
      ]);
      setNewItemText("");
      close();
    }
  };

  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const toggleItem = (itemId: string) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  // Modal opening
  const [opened, { open, close }] = useDisclosure(false);

  return (
    <>
      <Modal
        opened={opened}
        onClose={close}
        closeButtonProps={{ "aria-label": "Close modal" }}
        title="Add new items"
      >
        <Textarea
          data-autofocus
          placeholder="Add new items, one per line..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
          autosize
          minRows={7}
        />
        <Button
          mt="md"
          onClick={addItem}
          aria-label="Add items and close modal"
        >
          Add item(s)
        </Button>
      </Modal>

      <Button onClick={open}>Add new item(s)</Button>
      <Space h="xl" />

      {items.map((item) => (
        <Group justify="space-between" wrap="nowrap" mb="sm" key={item.id}>
          <Checkbox
            id={item.id}
            checked={item.checked}
            onChange={() => toggleItem(item.id)}
            label={item.text}
            size="lg"
          />
          <ActionIcon
            id={item.id}
            aria-label="Delete item"
            size="lg"
            variant="default"
            onClick={() => removeItem(item.id)}
          >
            <IconTrash />
          </ActionIcon>
        </Group>
      ))}
    </>
  );
};

export default ChopinLiszt;
