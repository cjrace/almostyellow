"use client";

import { Button, Group } from "@mantine/core";
import { signOutAction } from "@/actions/signOutAction";

export function SignOutButton() {
  return (
    <Group justify="center">
      <form action={signOutAction}>
        <Button type="submit">Sign out</Button>
      </form>
    </Group>
  );
}
