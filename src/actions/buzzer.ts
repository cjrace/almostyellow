"use server";
import { requireAuth } from "@/auth";
import { createRoom, hostCommand } from "@/rooms/service";
import { RoomError } from "@/buzzer/model";
export async function createBuzzer(commandId: string) {
  const { uid } = await requireAuth();
  return createRoom(uid, commandId);
}
export async function controlBuzzer(
  action: "reset" | "remove" | "end",
  input: unknown,
) {
  const { uid } = await requireAuth();
  if (!["reset", "remove", "end"].includes(action))
    throw new Error("Unknown room command.");
  try {
    await hostCommand(uid, action, input);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }
}
