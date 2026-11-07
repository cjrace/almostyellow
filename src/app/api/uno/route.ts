import { NextRequest } from "next/server";
import { handleRoomRequest } from "@/rooms/route";
import { unoPlayerActions, unoPlayerCommand } from "@/unogame/service";

export function POST(request: NextRequest) {
  return handleRoomRequest(request, {
    game: "uno",
    actions: [...unoPlayerActions],
    run: (uid, action, input) =>
      unoPlayerCommand(uid, action as (typeof unoPlayerActions)[number], input),
  });
}
