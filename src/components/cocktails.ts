// Create the options for the cocktails page, could be a database table eventually
export const cocktails = [
  {
    name: "Stone cold margarita",
    spirits: ["Tequila"],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Tequila",
        "1 x Triple sec",
        "1 x Lime juice",
        "Few drops Agave syrup",
        "1 x Grand marnier",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add Tequila, triple sec, lime juice and agave syrup to a cocktail shaker with ice",
        "Shake loads",
        "Add more ice to glass",
        "Pour over ice and top with grand marnier",
      ],
    },
  },
  {
    name: "Toffspresso martini",
    spirits: ["Vodka", "Kahlua"],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Toffee vodka",
        "1 x Khalua (or Tia Maria)",
        "1 x Espresso pod",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Make espresso and chill in the fridge for a while if you can",
        "Add espresso, toffee vodka and khalua to a cocktail shaker with ice",
        "Shake as much as you possibly can",
        "Pour into glass",
      ],
    },
  },
  {
    name: "Rum sunset",
    spirits: ["Rum"],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Spiced rum",
        "4 x Orange juice (or just top to preference)",
        "1 x Grenadine",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add ice to a glass (even better if you use the tiki ones)",
        "Pour orange juice over rum and then slowly pour grenadine on top",
      ],
    },
  },
  {
    name: "Gin fizz",
    spirits: ["Gin"],
    rating: 4.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Gin",
        "1 x Lemon juice",
        "1 x Sugar syrup",
        "1 x Egg white",
        "Soda water",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Pour the gin, lemon juice, egg white and sugar syrup in to a cocktail shaker",
        "Shake well",
        "Add ice cubes to the shaker and then shake again as much as you can",
        "Add ice to a glass",
        "Strain into glass and top up with a dash of soda water",
      ],
    },
  },
  {
    name: "Baileys milkshake",
    spirits: ["Baileys"],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Baileys",
        "3 x Chocomel (or milk)",
        "Vanilla ice cream",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Blend together baileys, ice cream and chocomel until it looks tasty",
        "[Alternative - add a scoop of ice cream to a glass and pour baileys and chocomel over it]",
      ],
    },
  },
  {
    name: "Mai tai",
    spirits: ["Rum"],
    rating: 4.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "1 x White rum",
        "1 x Spiced rum",
        "1 x Orange curacao",
        "1 x Orgeat syrup",
        "1 x Lime juice",
        "2 x Pineapple juice",
        "Grenadine (optional)",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add all ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour into glass",
        "Optional - pour a dash of grenadine on top once in the glass",
      ],
    },
  },
  {
    name: "Bramble",
    spirits: ["Gin"],
    rating: 5.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Gin",
        "1 x Lemon juice",
        "1 x Sugar syrup",
        "1 x Fruity liquer (chambord, creme de chassis etc)",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add all ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour into glass",
      ],
    },
  },
  {
    name: "Tequila sunrise",
    spirits: ["Tequila"],
    rating: 4.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Tequila",
        "1 x Triple sec",
        "1 x Lemon juice",
        "4 x Orange juice",
        "Grenadine",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add a bit of grenadine to a glass with ice",
        "Add all other ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour slowly into glass on top of grenadine",
      ],
    },
  },
  {
    name: "Luigi",
    spirits: ["Gin"],
    rating: 4.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "4 x Gin",
        "2 x Orange Juice",
        "2 x Vermouth (dry officially, but sweet is usually nicer)",
        "1 x Cointreau",
        "Grenadine",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add all ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour into glass",
        "Optional - pour a dash of grenadine on top once in the glass",
        "Optional - orange twist to garnish",
      ],
    },
  },
  {
    name: "Honolulu",
    spirits: ["Gin"],
    rating: 4.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "3 x Gin",
        "1 x Pineapple juice",
        "1 x Orange juice",
        "1 x Lemon juice",
        "Grenadine",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add all ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour into glass",
        "Optional - pour a dash of grenadine on top once in the glass",
        "Optional - cherries on top",
      ],
    },
  },
  {
    name: "Manhattan",
    spirits: ["Whisky"],
    rating: 3.0 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "2 x Whisky (Rye)",
        "1 x Vermouth (sweet)",
        "Angostura bitters (2 dashes)",
        "Orange bitters (1 dash)",
      ],
      instructions: [
        "Need to redo this to retest the method",
        "Add all ingredients to a cocktail shaker with ice",
        "Shake loads",
        "Pour into glass",
      ],
    },
  },
  {
    name: "Laura's cloudy surprise",
    spirits: ["Rum"],
    rating: 4.5 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "1 x Dark rum",
        "1 x Cherry rum",
        "1 x Triple sec",
        "Cloudy cider (some)",
        "Sugar syrup (1 splash)",
      ],
      instructions: ["Pour everything into glass and shake or stir"],
    },
  },
  {
    name: "Cam's cloudy surprise",
    spirits: ["Rum", "Whisky"],
    rating: 4.5 as number, // Rated out of 5
    photoUrl: "/images/cocktail-placeholder.jpg",
    recipe: {
      ingredients: [
        "1 x Dark rum",
        "1 x Cherry rum",
        "1 x Whisky (smoky)",
        "1 x Triple sec",
        "Cloudy cider (some)",
        "Sugar syrup (1 splash)",
      ],
      instructions: ["Pour everything into glass and shake or stir"],
    },
  },

  // Add more cocktails...
];
