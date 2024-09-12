// import styles from '../app/page.module.css';
import React, { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { Textarea, Button, Grid, GridCol } from '@mantine/core';

type decisionOptions = {
    options: string;
};

const DecisionMaker: React.FC = () => {
    const { register, handleSubmit } = useForm<decisionOptions>();
    const [decidedOption, setChosenItem] = useState<string | null>(null);

    const makeDecision: SubmitHandler<decisionOptions> = (data) => {
        const options = data.options.split('\n').filter((option) => option.trim() !== '');
        if (options.length > 0) {
            const randomIndex = Math.floor(Math.random() * options.length);
            setChosenItem(options[randomIndex]);
        }
    };

    return (
        <Grid grow>
            <Grid.Col span={5}>
                <div style={{margin: 20}}>
            <h1 style={{textAlign: 'center'}}>The Decision Maker</h1>
                <form onSubmit={handleSubmit(makeDecision)}>
                    <Textarea
                        {...register('options')}
                        label="Type the options for your decision, one per line..."
                        autosize
                        minRows={10}
                        maxRows={20}
                    />
                    <Button type="submit" fullWidth>Make a decision</Button>
                </form>
                </div>
            </Grid.Col>

            <Grid.Col span={7}>
                {decidedOption && (
                    <div style={{ fontSize: '24px', textAlign: 'center' }}>
                        <p>The decision has been made, and you should choose:</p>
                        {decidedOption}
                    </div>
                )}
            </Grid.Col>

        </Grid>
    );
};

export default DecisionMaker;
