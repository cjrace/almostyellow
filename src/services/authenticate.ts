"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      const authError = error as AuthError & { code?: string };
      if (authError.code == "credentials") {
        return "Invalid credentials.";
      } else {
        return "An unknown error occurred.";
      }
    }
    throw error;
  }
}
