import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;

      // Redirect users to admin if they are logged in and hit the login page
      const isInAdminLoginPage = nextUrl.pathname === "/admin/login";
      if (isLoggedIn && isInAdminLoginPage) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      const isInAdmin = nextUrl.pathname.startsWith("/admin");
      if (isInAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      return true;
    },
  },
  providers: [], // Add Google or GitHub or others at a later point
} satisfies NextAuthConfig;
