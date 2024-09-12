// pages/decisionmaker.tsx

import React, { useState } from 'react';

const DecisionMaker: React.FC = () => {
  const [inputText, setInputText] = useState<string>('');
  const [chosenItem, setChosenItem] = useState<string | null>(null);

  const makeDecision = () => {
    const items = inputText.split('\n').filter((item) => item.trim() !== '');
    if (items.length > 0) {
      const randomIndex = Math.floor(Math.random() * items.length);
      setChosenItem(items[randomIndex]);
    }
  };

  return (
    <div>
      <textarea
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        placeholder="Type your items (one per line)"
      />
      <button onClick={makeDecision}>Make a decision</button>

      {chosenItem && (
        <div style={{ fontSize: '24px', textAlign: 'right' }}>
          {chosenItem}
        </div>
      )}
    </div>
  );
};

export default DecisionMaker;
