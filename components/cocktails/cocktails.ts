// Create the options for the cocktails page, could be a database table eventually
export const cocktails = [
    {
        name: 'Old Fashioned',
        spirits: ['Bourbon'],
        rating: 2.0 as number, // Rated out of 5
        photoUrl: "/images/cocktail-placeholder.jpg",
        recipe: {
            ingredients: ['Bourbon', 'Sugar', 'Water', 'Bitters'],
            instructions:
                '1. Add a load of crushed ice to the cocktail shaker.\n' +
                '2. Add bourbon, sugar, water, and bitters.\n' +
                '3. Shake loads.\n' +
                '4. Pour into glasses and enjoy.',
        },
    },
    {
        name: 'Cocktail 2',
        spirits: ['Rum'],
        rating: 4.5 as number, // Rated out of 5
        photoUrl: "/images/cocktail-placeholder.jpg",
        recipe: {
            ingredients: ['Rum', 'Something fruity', 'Ice'],
            instructions:
                '1. Add a load of crushed ice to the cocktail shaker.\n' +
                '2. Add alcohol and then something fruity.\n' +
                '3. Shake loads.\n' +
                '4. Pour into glasses and enjoy.',
        },
    },
    {
        name: 'Cocktail 3',
        spirits: ['Rum', 'Bourbon'],
        rating: 5.0 as number, // Rated out of 5
        photoUrl: "/images/cocktail-placeholder.jpg",
        recipe: {
            ingredients: ['Rum', 'Bourbon', 'Something fruity', 'Ice'],
            instructions:
                '1. Add a load of crushed ice to the cocktail shaker.\n' +
                '2. Add alcohol and then something fruity.\n' +
                '3. Shake loads.\n' +
                '4. Pour into glasses and enjoy.',
        },
    },
    // Add more cocktails...
];