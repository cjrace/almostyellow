# How to seed the database

All the databases can currently be queried through the SQL interface in Vercel by Cam, so we can just edit them there if needed, though code for seeding them locally is kept here incase it is helpful for future reference.

## Overview

First step reate a `src/app/seed/route.ts` file with the following code in it.

This file is ignored by Git to avoid you accidentally committing database data, including unencrypted passwords to Git.

Once you've made the file with the contents you want, run the dev environment locally and visit `http://localhost:3000/seed`, this will be an endpoint that triggers the seeding. It should show a message saying 'Database seeded successfully' after a few seconds.

Note that for the users table, it only seeds one user at a time, so update the file and hit the endpoint again for each additional user you need to add (or if you fancy, rewrite this so it takes multiple users!).

## Code segments

```
// Core contents of src/app/seed/route.ts

import { db } from '@vercel/postgres';
import { v4 as generate_uuid } from "uuid";
// For users table only: import bcrypt from 'bcrypt';
// add other imports as needed

// Put the definitions of types and seed data before connecting to db (important)

const client = await db.connect();

// Add the definition(s) of the function(s) you want to run here

export async function GET() {
    try {
      await client.sql`BEGIN`;
      // Add the function calls you want to run when you hit the endpoint, e.g. await myFunction();
      await client.sql`COMMIT`;
      return Response.json({ message: 'Database seeded successfully' });
    } catch (error) {
      await client.sql`ROLLBACK`;
      return Response.json({ error }, { status: 500 });
    }
}
```

### Users

For the users table we can use the following user `type` and seed data:

```
export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
};

// Note that this only seeds a single user at a time
// Edit this to the details of the user you want to add
const user_id = generate_uuid();

const seeduser = [
  {
    id: user_id,
    name: '',
    email: '',
    password: '', // Put the raw password as the user would enter it, we encrypt it in a later step
  },
];
```

We can then create a `seedUsers()` function to add new users and also create the table from scratch if it doesn't yet exist.

```
async function seedUsers() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;
  const insertedUsers = await Promise.all(
    seeduser.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return client.sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
    }),
  );
  return insertedUsers;
}
```

### Chopin Liszt

Types and example seed data.

```
export type chopin = {
  chopin_id: string;
  chopin_text: string;
  checked: boolean;
};

const random_chopin_id = generate_uuid();

const choping = [
  {
    chopin_id: random_chopin_id,
    chopin_text: 'Limes',
    checked: false,
  },
];
```

Function for `seedChopinLiszt()`, once again this will create the table as well if it doesn't currently exist.

```
async function seedChopinLiszt() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
    CREATE TABLE IF NOT EXISTS chopin_liszt (
      chopin_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      chopin_text VARCHAR(255) NOT NULL,
      checked BOOLEAN NOT NULL
    );
  `;

  const insertedItems = await Promise.all(
    choping.map(
    (chopin) => client.sql`
      INSERT INTO chopin_liszt (chopin_id, chopin_text, checked)
      VALUES (${chopin.chopin_id}, ${chopin.chopin_text}, ${chopin.checked})
      ON CONFLICT (chopin_id) DO NOTHING;
    `,
    ),
  );

  return insertedItems;
};
```

## Whisky journal

Types and example seed data.

```
export type Whisky = {
  last_edited: Date;
  whisky_id: string;
  name: string;
  distillery: string;
  country_region: string;
  age: number;
  grain: string;
  abv: number;
  rating: number;
  price: number;
  notes: string;
};

export const whiskyData: Whisky[] = [
  {
    last_edited: new Date("2024/11/24"),
    whisky_id: generate_uuid(),
    name: "Talisker 10 Year Old",
    distillery: "Talisker",
    country_region: "Highland - Scotland",
    age: 10,
    grain: "Single malt",
    abv: 45.8,
    rating: 5,
    price: 2,
    notes: "Something about the look, nose, palette and finish",
  },
  {
    last_edited: new Date("2024/11/24"),
    whisky_id: generate_uuid(),
    name: "Johnnie Walker Double Black",
    distillery: "Johnnie Walker",
    country_region: "Mixed - Scotland",
    age: 0,
    grain: "Blend",
    abv: 40.0,
    rating: 3,
    price: 2,
    notes: "Best smoky mixer!",
  },
];
```

Function to seed database, this happily maps over all whiskies present.

```
async function seedWhiskyJournal() {
  await client.sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client.sql`
      CREATE TABLE IF NOT EXISTS whisky_journal (
        last_edited TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        whisky_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        distillery VARCHAR(255) NOT NULL,
        country_region VARCHAR(255) NOT NULL,
        age INT NOT NULL,
        grain VARCHAR(255) NOT NULL,
        abv DECIMAL(5,1) NOT NULL,
        rating INT NOT NULL,
        price INT NOT NULL,
        notes TEXT NOT NULL
      );
    `;

  const insertedItems = await Promise.all(
    whiskyData.map(
      (whisky) => client.sql`
          INSERT INTO whisky_journal (
            last_edited, whisky_id, name, distillery, country_region, age, grain, abv, rating, price, notes
          ) VALUES (
            ${whisky.last_edited.toISOString()}, ${whisky.whisky_id}, ${whisky.name}, ${whisky.distillery}, ${whisky.country_region}, ${whisky.age}, ${whisky.grain}, ${whisky.abv}, ${whisky.rating}, ${whisky.price}, ${whisky.notes}
          ) ON CONFLICT (whisky_id) DO NOTHING;
        `,
    ),
  );

  return insertedItems;
}
```
