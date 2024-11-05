import { useState } from "react";
import { Breadcrumbs, Anchor, Grid } from "@mantine/core";
import { useForm, FieldValues } from "react-hook-form";
import { SpiritSelect } from "@/components/spiritselect";
import { cocktails } from "@/components/cocktails";
import CocktailBox from "@/components/cocktailbox";
import BackToTop from "@/components/backtotop";
import styles from "@/styles/cocktails.module.css";

const crumbitems = [
  { title: "Home", href: "/" },
  { title: "Cocktails", href: "" },
].map((item, index) => (
  <Anchor href={item.href} key={index}>
    {item.title}
  </Anchor>
));

const CocktailsPage: React.FC = () => {
  // Logic for the cocktail selection and filtering
  const { control, handleSubmit } = useForm();
  const [selectedSpirits, setSelectedSpirits] = useState<
    { value: string; label: string }[]
  >([]);
  const handleFormSubmit = (data: FieldValues) => {
    console.log("Selected spirits:", data.selectedSpirits);
  };

  // Show all cocktails if no specific spirits are selected or if "All Spirits" is selected
  const filteredCocktails = cocktails.filter((cocktail) => {
    if (
      selectedSpirits.length === 0 ||
      selectedSpirits.some((spirit) => spirit.value === "All spirits")
    ) {
      return true;
    }
    return cocktail.spirits.some((spirit) =>
      selectedSpirits.some((selectedSpirit) => selectedSpirit.value === spirit),
    );
  });

  return (
    <div>
      <Breadcrumbs>{crumbitems}</Breadcrumbs>

      <h1>Cocktails</h1>

      <Grid>
        <Grid.Col span={{ base: 12, sm: 2 }}>
          <div style={{ position: "sticky", top: "10px" }}>
            <form onSubmit={handleSubmit(handleFormSubmit)}>
              <SpiritSelect
                control={control}
                setSelectedSpirits={setSelectedSpirits}
              />
            </form>
          </div>
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 9 }}>
          <ul className={styles.cocktailList}>
            {filteredCocktails
              .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
              .map((cocktail) => (
                <div key={cocktail.name} className={styles.cocktailCard}>
                  <CocktailBox {...cocktail} />
                </div>
              ))}
          </ul>
        </Grid.Col>
      </Grid>

      <BackToTop />
    </div>
  );
};

export default CocktailsPage;
