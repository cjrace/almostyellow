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
        
        <script src="https://run.confettipage.com/here.js"
          data-confetticode="U2FsdGVkX193OrwhDdQijJwJq+gY+clAC4OsNYdgWOMqe/yukJzjxwJiqWXUevIbeRzYFVoVr1tRJiuyd71Yy5z7dkuOkaPo/MOgDsBsBVZYOblIczhO/CYfkYJxNKOJuCAFHpvQeFZqd9FSp9ccxdJCfMTfTWUj18p9MBriUdi1r08UftcTuO8onusTIh7Fz2phQpniZqcrVIR58TzxZFWH3g1uBOo1pkcizcVKpkdFHV8chSkfLPZIiWezQml/fOpJ8DoDXUyqSN3kuliUFNxV5FiQhSgAdtgb/kJA/1X+e6ZDJmBklX7pKez+5Y0fbLxwOMDACrg1UE4WOopbAch4HKdSQceKBzcoPFW6LjHJM8pXfNfrv/m9kyK+0jnM3eq1HAV2fmnSu8k5ByDT8BMAY6xRpOl5DJAAUS+cHGWZC1V07BNgSuZf+MxDsSpnETxw/wZwz8Z4Uxz8dXg2eGfar4KUV5pBZr+L9dv635001DSbaqt9c0PTGywWnRia2pzuwHdlUlLsOivC2V1XITd0jkzSV3VQSjkuOdZLemOn8GZDs0yt+E8MqGthCt2hDLzgE2HO1bJWO6i+sUGAuyzIIj0X2aSEC5V6C4mG52bHoLO1h8kA56yMrXFQ8GlLXheVXwQif/GS/t+RTCroV8WaPNMe7E9hdesdX+tC51D2dTSdeoNrewEdZ/sqZYyv"></script>
        
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
