import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth;
      const nextUrl = request.nextUrl;

      // Stop non-logged in users from accessing any pages starting /admin
      const isInAdmin = nextUrl.pathname.startsWith("/admin");
      if (isInAdmin) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      }

      // Redirect users to admin if they are logged in and hit the login page
      const isInAdminLoginPage = nextUrl.pathname === "/admin/login";
      if (isLoggedIn && isInAdminLoginPage) {
        return Response.redirect(new URL("/admin", nextUrl));
      }

      return true;
    },
  },
  providers: [], // Add Google or GitHub or others at a later point
} satisfies NextAuthConfig;
