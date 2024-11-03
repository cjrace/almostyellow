import React, { useState } from "react";
import { Checkbox, Button, TextInput, Space } from "@mantine/core";

interface Item {
  id: number;
  text: string;
  checked: boolean;
}

const Checklist: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [newItemText, setNewItemText] = useState("");

  const addItem = () => {
    if (newItemText.trim()) {
      setItems((prevItems) => [
        ...prevItems,
        { id: Date.now(), text: newItemText, checked: false },
      ]);
      setNewItemText("");
    }
  };

  const removeItem = (itemId: number) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId));
  };

  const toggleItem = (itemId: number) => {
    setItems((prevItems) =>
      prevItems.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item,
      ),
    );
  };

  return (
    <div>
      <div style={{ display: "flex" }}>
        <TextInput
          placeholder="Add a new item..."
          value={newItemText}
          onChange={(e) => setNewItemText(e.target.value)}
        />
        <Button onClick={addItem}>Add</Button>
      </div>

      {items.map((item) => (
        <div key={item.id} style={{ display: "flex" }}>
          <Checkbox
            checked={item.checked}
            onChange={() => toggleItem(item.id)}
            label={item.text}
            labelPosition="left"
            size="xl"
          />
          <Space w="lg" />
          <Button onClick={() => removeItem(item.id)} variant="subtle">
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
};

export default Checklist;
