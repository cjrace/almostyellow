import { NextRequest } from "next/server";
import { handleRoomRequest } from "@/rooms/route";
import { playerCommand } from "@/rooms/service";

export function POST(request: NextRequest) {
  return handleRoomRequest(request, {
    game: "buzzer",
    actions: ["leave", "buzz"],
    run: (uid, action, input) =>
      playerCommand(uid, action as "leave" | "buzz", input),
  });
}
