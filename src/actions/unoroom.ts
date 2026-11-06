"use server";
import { requireAuth } from "@/auth";
import { createRoom } from "@/rooms/service";
import { controlUnoRoom } from "@/unogame/service";
import { RoomError } from "@/buzzer/model";

export async function createUnoRoom(commandId: string) {
  const { uid } = await requireAuth();
  return createRoom(uid, commandId, "uno");
}

export async function controlUno(
  action: "start" | "remove" | "end",
  input: unknown,
) {
  const { uid } = await requireAuth();
  if (!["start", "remove", "end"].includes(action))
    throw new Error("Unknown room command.");
  try {
    await controlUnoRoom(uid, action, input);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }
}
