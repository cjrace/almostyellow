import React from 'react';
import Select from 'react-select';
import { Controller, Control, FieldValues } from 'react-hook-form';

// List the dropdown options
export const spiritOptions = [
    { value: 'All spirits', label: 'All spirits' },
    { value: 'Baileys', label: 'Baileys' },
    { value: 'Gin', label: 'Gin' },
    { value: 'Kahlua', label: 'Kahlua' },
    { value: 'Rum', label: 'Rum' },
    { value: 'Tequila', label: 'Tequila' },
    { value: 'Vodka', label: 'Vodka' },
    
    // Add other spirit options
];

// Create and export the dropdown selection code
interface SpiritSelectProps {
    control: Control<FieldValues>;
    setSelectedSpirits: React.Dispatch<React.SetStateAction<{ value: string; label: string }[]>>;
}

export const SpiritSelect: React.FC<SpiritSelectProps> = ({ control, setSelectedSpirits }) => {
    return (
        <Controller
            name="selectedSpirits"
            control={control}
            render={({ field }) => (
                <Select
                    {...field}
                    options={spiritOptions}
                    onChange={(selectedOption) => {
                        setSelectedSpirits(selectedOption ? [selectedOption] : []);
                    }}
                />
            )}
        />
    );
};

export default SpiritSelect;
