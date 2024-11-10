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

  const [items, setItems] = useState<Item[]>([]);
  const [newItemText, setNewItemText] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      console.log("Requesting new data");
      const data = await readChopin();
      console.log("Data fetch successful");
      setItems(data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  //  const toggleItem = (itemId: string) => {
  //    setItems((prevItems) =>
  //      prevItems.map((item) =>
  //        item.id === itemId ? { ...item, checked: !item.checked } : item,
  //      ),
  //    );
  //  };

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

  /*
  const addItem = async () => {
    if (newItemText.trim()) {
      const newItems = newItemText.split(/\r?\n/);
      
      for (const text of newItems) {
        try {
          await createChopin({ chopin_id: String(crypto.randomUUID()), chopin_text: text.trim(), checked: false });
        } catch (error) {
          console.error("Error adding item:", error);
        }
      }
      
      setItems((prevItems) => [...prevItems]); // Trigger re-render
      setNewItemText("");
      close();
    }
  };

  const toggleItem = async (itemId: string) => {
    setItems((prevItems) =>
      prevItems.map(async (item) => {
        if (item.id === itemId) {
          const updatedChecked = !item.checked;
          try {
            await updateChopinChecked(itemId, new FormData([["checked", updatedChecked.toString()]]));
          } catch (error) {
            console.error("Error updating checked state:", error);
          }
          return { ...item, checked: updatedChecked };
        }
        return item;
      })
    );
  };

  const removeItem = async (itemId: string) => {
    try {
      await deleteChopin(itemId);
      setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  */

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
