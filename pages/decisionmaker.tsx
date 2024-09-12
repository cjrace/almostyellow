// pages/decisionmaker.tsx

import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';

type FormValues = {
    items: string;
};

const DecisionMaker: React.FC = () => {
    const { register, handleSubmit } = useForm<FormValues>();
    const [chosenItem, setChosenItem] = useState<string | null>(null);

    const makeDecision: SubmitHandler<FormValues> = (data) => {
        const items = data.items.split('\n').filter((item) => item.trim() !== '');
        if (items.length > 0) {
            const randomIndex = Math.floor(Math.random() * items.length);
            setChosenItem(items[randomIndex]);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
            <h1 style={{ textAlign: 'center' }}>The Decision Maker</h1>
            <div style={{ width: '50%', padding: '20px' }}>
                <form onSubmit={handleSubmit(makeDecision)}>
                    <textarea
                        {...register('items')}
                        placeholder="Type your items (one per line)"
                        style={{ width: '100%', height: '200px' }}
                    />
                    <button type="submit">Make a decision</button>
                </form>
            </div>
            <div style={{ width: '50%', padding: '20px' }}>
                {chosenItem && (
                    <div style={{ fontSize: '24px', textAlign: 'center' }}>
                        {chosenItem}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DecisionMaker;
