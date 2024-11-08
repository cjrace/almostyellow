# How to seed the database

This shouldn't be needed for a while, though if for any reason we need to add additional users to the database or recreate tables, create a `src/app/seed/route.ts` file with the following code in it.

This file is ignored by Git to avoid you accidentally committing database data, including unencrypted passwords to Git.

Once you've made the file, run the dev environment locally and visit `http://localhost:3000/seed`, this will be an endpoint that triggers the seeding. It should show a message saying 'Database seeded successfully' after a few seconds.

Note that for the users table, it only seeds one user at a time, so update the file and hit the endpoint again for each additional user you need to add (or if you fancy, rewrite this so it takes multiple users!).

```
// Contents of src/app/seed/route.ts

import bcrypt from 'bcrypt';
import { db } from '@vercel/postgres';

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
    password: '',
  },
];

const client = await db.connect();
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

export async function GET() {
    try {
      await client.sql`BEGIN`;
      await seedUsers();
      await client.sql`COMMIT`;
      return Response.json({ message: 'Database seeded successfully' });
    } catch (error) {
      await client.sql`ROLLBACK`;
      return Response.json({ error }, { status: 500 });
    }
}

```
