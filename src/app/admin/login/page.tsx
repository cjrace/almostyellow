import Header from "@/components/header";
import LoginForm from "@/components/login";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default function Login() {
  return (
    <>
      <Header noCrumbs={true} />

      <main id="main-content">
        <LoginForm />
      </main>
    </>
  );
}
