"use client";

import { useState, useEffect } from "react";
import {
  Checkbox,
  Modal,
  Button,
  Textarea,
  Space,
  Group,
  ActionIcon,
  Text,
  Divider,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import {
  createChopin,
  readChopin,
  updateChopinChecked,
  deleteChopin,
} from "@/services/chopinliszt";

export interface Item {
  id: string;
  text: string;
  checked: boolean;
}

const ChopinLiszt: React.FC = () => {
  const [modalOpened, { open, close }] = useDisclosure(false);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Item[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const fetchItems = async () => {
    try {
      console.log("Requesting new data");
      const data = await readChopin();
      console.log("Data fetch successful");
      setItems(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        console.log("Requesting new data");
        const data = await readChopin();
        console.log("Data fetch successful");
        setItems(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    })();
  }, []);

  const addItem = async () => {
    // Split the user input into separate lines for each item
    const itemsToAdd = newItemText.trim().split("\n");

    for (const itemText of itemsToAdd) {
      if (itemText.trim()) {
        // if not empty
        const formData = new FormData();
        formData.append("chopin_text", itemText);
        try {
          console.log("Attempting to insert: ", ...formData.entries());
          await createChopin(formData);
        } catch {
          console.error("Error adding: ", ...formData.entries());
        }
      }
    }
    await fetchItems();
    close(); // Close user modal
    setNewItemText(""); // Clear the input field after successful add
  };

  const toggleItem = async (itemId: string) => {
    try {
      const updatedItem = items.find((item) => item.id === itemId);
      if (updatedItem) {
        const newCheckedState = !updatedItem.checked;
        console.log("Sending update request:", itemId, newCheckedState);
        await updateChopinChecked(itemId, newCheckedState);
        console.log("Update successful");
        await fetchItems();
      }
    } catch (error) {
      console.error("Error updating checked state:", error);
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      console.log("Deleting item:", itemId);
      await deleteChopin(itemId);
      console.log("Delete successful");
      await fetchItems();
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };

  if (loading) {
    return <Text>Fetching list...</Text>;
  }

  // Separate items into checked and unchecked
  const uncheckedItems = items.filter((item) => !item.checked);
  const checkedItems = items.filter((item) => item.checked);

  return (
    <>
      <Modal
        opened={modalOpened}
        onClose={close}
        closeButtonProps={{ "aria-label": "Close modal" }}
        title="Add new items"
      >
        <Textarea
          data-autofocus
          placeholder="Add new items, one per line..."
          value={newItemText}
          onChange={(e) => {
            setNewItemText(e.target.value);
          }}
          autosize
          minRows={7}
        />
        <Button
          mt="md"
          onClick={() => {
            void addItem();
          }}
          aria-label="Add items and close modal"
        >
          Add item(s)
        </Button>
      </Modal>

      <Button onClick={open}>Add new item(s)</Button>
      <Space h="xl" />

      {/* Unchecked items */}
      {uncheckedItems.map((item) => (
        <Group justify="space-between" wrap="nowrap" mb="sm" key={item.id}>
          <Checkbox
            id={item.id}
            checked={item.checked}
            onChange={() => {
              void toggleItem(item.id);
            }}
            label={item.text}
            size="lg"
          />
          <ActionIcon
            id={item.id}
            aria-label="Delete item"
            size="lg"
            variant="default"
            onClick={() => {
              void removeItem(item.id);
            }}
          >
            <IconTrash />
          </ActionIcon>
        </Group>
      ))}

      {/* Checked items, if any */}
      {checkedItems.length > 0 && (
        <>
          <Space h="xl" />
          <Divider mb="sm" />
          <Text size="md" mb="xs">
            Completed
          </Text>
          {checkedItems.map((item) => (
            <Group justify="space-between" wrap="nowrap" mb="sm" key={item.id}>
              <Checkbox
                id={item.id}
                checked={item.checked}
                onChange={() => {
                  void toggleItem(item.id);
                }}
                label={item.text}
                size="lg"
              />
              <ActionIcon
                id={item.id}
                aria-label="Delete item"
                size="lg"
                variant="default"
                onClick={() => {
                  void removeItem(item.id);
                }}
              >
                <IconTrash />
              </ActionIcon>
            </Group>
          ))}
        </>
      )}
    </>
  );
};

export default ChopinLiszt;
