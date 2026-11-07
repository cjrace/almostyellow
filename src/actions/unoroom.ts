"use server";
import { requireAuth } from "@/auth";
import { createRoom } from "@/rooms/service";
import { controlUnoRoom, saveRoomToTracker } from "@/unogame/service";
import { RoomError } from "@/buzzer/model";

export async function createUnoRoom(commandId: string) {
  const { uid } = await requireAuth();
  return createRoom(uid, commandId, "uno");
}

export async function controlUno(
  action: "start" | "remove" | "end" | "abandon",
  input: unknown,
) {
  const { uid } = await requireAuth();
  if (!["start", "remove", "end", "abandon"].includes(action))
    throw new Error("Unknown room command.");
  try {
    await controlUnoRoom(uid, action, input);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }
}

export async function saveUnoToTracker(input: unknown) {
  const { uid } = await requireAuth();
  try {
    await saveRoomToTracker(uid, input);
  } catch (error) {
    if (error instanceof RoomError) return { error: error.message };
    throw error;
  }
}
