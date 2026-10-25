// Synthetic data for the Firebase emulators. Nothing here comes from the
// production database, and the passwords only exist inside the emulator. IDs
// and timestamps are fixed so tests can assert on exact values.

const CREATED = new Date("2024-11-24T12:00:00Z");

export const users = {
  alice: {
    uid: "test-user-alice",
    email: "alice@example.com",
    password: "emulator-only-alice",
    authorized: true,
  },
  bob: {
    uid: "test-user-bob",
    email: "bob@example.com",
    password: "emulator-only-bob",
    authorized: true,
  },
  // Can sign in, but is not on the allowlist
  mallory: {
    uid: "test-user-mallory",
    email: "mallory@example.com",
    password: "emulator-only-mallory",
    authorized: false,
  },
};

export const whiskies = [
  {
    id: "33675c13-6835-4cc8-b7de-2823b37ae78a",
    name: "Talisker 10 Year Old",
    distillery: "Talisker",
    countryRegion: "Island - Scotland",
    age: 10,
    grain: "Single malt",
    abv: 45.8,
    rating: 5,
    price: 2,
    notes: "Peppery and smoky",
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: "5f3b0a51-84ab-4c1a-9a53-0d1f5a8c2e11",
    name: "Johnnie Walker Black Label",
    distillery: "Johnnie Walker",
    countryRegion: "Mixed - Scotland",
    age: 12,
    grain: "Blend",
    abv: 40,
    rating: 3,
    price: 2,
    notes: "Reliable mixer",
    createdAt: CREATED,
    updatedAt: CREATED,
  },
  {
    id: "a1c5d2e7-3b4f-4f6a-8d09-7e2b9c0f4a33",
    name: "Redbreast 12 Year Old",
    distillery: "Redbreast",
    countryRegion: "Ireland",
    age: 12,
    grain: "Single pot still",
    abv: 40,
    rating: 4,
    price: 3,
    notes: "Sherry and spice",
    createdAt: CREATED,
    updatedAt: CREATED,
  },
];

export const films = [
  {
    id: "0b6a4e02-1f1d-4d3b-9a77-2c6f0e8b1a01",
    name: "Seven Samurai",
    releaseYear: 1954,
    top30: true,
    watched: true,
    notInJar: false,
  },
  {
    id: "0b6a4e02-1f1d-4d3b-9a77-2c6f0e8b1a02",
    name: "Final Destination",
    releaseYear: 2000,
    top30: false,
    watched: true,
    notInJar: false,
  },
  {
    id: "0b6a4e02-1f1d-4d3b-9a77-2c6f0e8b1a03",
    name: "The Godfather",
    releaseYear: 1972,
    top30: true,
    watched: false,
    notInJar: false,
  },
  {
    id: "0b6a4e02-1f1d-4d3b-9a77-2c6f0e8b1a04",
    name: "Paddington 2",
    releaseYear: 2017,
    top30: false,
    watched: false,
    notInJar: true,
  },
];

export const cocktails = [
  {
    id: "negroni",
    name: "Negroni",
    ingredients: ["Gin", "Campari", "Sweet vermouth"],
    method: "Stir over ice, strain and garnish with orange peel",
    rating: 5,
  },
  {
    id: "old-fashioned",
    name: "Old Fashioned",
    ingredients: ["Bourbon", "Sugar", "Angostura bitters"],
    method: "Muddle sugar and bitters, add bourbon and ice",
    rating: 4,
  },
];

export const shoppingItems = [
  {
    id: "item-limes",
    text: "Limes",
    checked: false,
    order: 1,
    createdAt: CREATED,
    updatedAt: CREATED,
    updatedBy: users.alice.uid,
  },
  {
    id: "item-tonic",
    text: "Tonic water",
    checked: true,
    order: 2,
    createdAt: CREATED,
    updatedAt: CREATED,
    updatedBy: users.alice.uid,
  },
];
