import React, { useState } from 'react';
import { useForm, FieldValues } from 'react-hook-form';
import styles from '../app/page.module.css';
import Link from 'next/link';
import { SpiritSelect } from '../components/cocktails/spiritselect';
import { cocktails } from '../components/cocktails/cocktails';
import CocktailBox from '../components/cocktails/cocktailbox';

const CocktailsPage: React.FC = () => {

  // Logic for the cocktail selection and filtering
  const { control, handleSubmit } = useForm();
  const [selectedSpirits, setSelectedSpirits] = useState<{ value: string; label: string }[]>([]);
  const handleFormSubmit = (data: FieldValues) => {console.log('Selected spirits:', data.selectedSpirits);};

  // Show all cocktails if no specific spirits are selected or if "All Spirits" is selected
  const filteredCocktails = cocktails.filter((cocktail) => {
    if (selectedSpirits.length === 0 || selectedSpirits.some((spirit) => spirit.value === 'All spirits')) {
      return true;
    }
    return cocktail.spirits.some((spirit) => selectedSpirits.some((selectedSpirit) => selectedSpirit.value === spirit));
  });

  // Main page
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        
        <h1>Cocktails</h1>

        {/* Dropdown selector */}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <p>Filter by spirit:</p>
          <SpiritSelect control={control} setSelectedSpirits={setSelectedSpirits} />
        </form>

        {/* List of cocktails */}
        <ul className={styles.cocktailList}>
          {filteredCocktails
            .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
            .map((cocktail) => (
              <div key={cocktail.name} className={styles.cocktailCard}>
                <CocktailBox {...cocktail} />
              </div>
            ))}
        </ul>

        <div className={styles.ctas}>
          <Link href="/" className={styles.secondary}>
            Back to homepage
          </Link>
        </div>

      </main>
    </div>
  );
};

export default CocktailsPage;
