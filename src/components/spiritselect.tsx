import { Control, Controller, FieldValues } from "react-hook-form";
import { RadioGroup, Radio } from "@mantine/core";

// List the dropdown options
export const spiritOptions = [
  { value: "All spirits", label: "All spirits" },
  { value: "Baileys", label: "Baileys" },
  { value: "Gin", label: "Gin" },
  { value: "Kahlua", label: "Kahlua" },
  { value: "Rum", label: "Rum" },
  { value: "Tequila", label: "Tequila" },
  { value: "Vodka", label: "Vodka" },
  { value: "Whisky", label: "Whisky" },

  // Add other spirit options
];

interface SpiritSelectProps {
  control: Control<FieldValues>;
  setSelectedSpirits: React.Dispatch<
    React.SetStateAction<{ value: string; label: string }[]>
  >;
}

export const SpiritSelect: React.FC<SpiritSelectProps> = ({
  control,
  setSelectedSpirits,
}) => {
  return (
    <Controller
      name="selectedSpirit"
      control={control}
      render={({ field }) => (
        <RadioGroup
          label="Filter by spirit"
          variant="vertical"
          size="lg"
          value={field.value}
          onChange={(value) => {
            field.onChange(value);
            setSelectedSpirits([
              {
                value,
                label:
                  spiritOptions.find((option) => option.value === value)
                    ?.label || "",
              },
            ]);
          }}
        >
          {spiritOptions.map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              label={option.label}
            />
          ))}
        </RadioGroup>
      )}
    />
  );
};
