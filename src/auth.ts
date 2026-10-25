import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { sql } from "@/db";
import bcrypt from "bcrypt";
import { unauthorized } from "next/navigation";

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
}

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error("Failed to fetch user:", error);
    throw new Error("Failed to fetch user.", { cause: error });
  }
}

export const { auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);

          if (passwordsMatch) return user;
        }

        console.log("Invalid credentials");
        return null;
      },
    }),
  ],
});

// Server actions are callable directly over HTTP, so protecting the /admin
// pages is not enough. Call this at the top of any server action that reads
// private data or changes data, outside of any try/catch.
export async function requireAuth() {
  const session = await auth();
  if (!session?.user) unauthorized();
  return session;
}
