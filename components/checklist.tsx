import React, { useState } from "react";

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
      <input
        type="text"
        placeholder="Add a new item..."
        value={newItemText}
        onChange={(e) => setNewItemText(e.target.value)}
      />
      <button onClick={addItem}>Add</button>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
            />
            <span>{item.text}</span>
            <button onClick={() => removeItem(item.id)}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Checklist;
