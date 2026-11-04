"use client";

import { Button, type ButtonProps } from "@mantine/core";
import Link from "next/link";

// A Mantine Button that opens another page of the site with a Next.js Link.
// Server components can't pass Link to Button themselves, as it's a function
export default function ButtonLink({
  href,
  ...props
}: ButtonProps & { href: string }) {
  return <Button component={Link} href={href} {...props} />;
}
