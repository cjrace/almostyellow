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
const seeduser = [
  {
    id: '', // Should be a unique GUID
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

const choping = [
  {
    chopin_id: '79741fda-d3fd-40ca-b012-024f283a94cb',
    chopin_text: 'Tin of beans',
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
