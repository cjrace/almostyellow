import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/admin";
import { joinGuestRoom, joinInputSchema, playerCommand } from "@/rooms/service";
import { RoomError } from "@/buzzer/model";
import { z } from "zod";
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json(
      { error: "forbidden", message: "Use this website to join." },
      { status: 403 },
    );
  try {
    const { action, input } = z
      .object({ action: z.enum(["join", "leave", "buzz"]), input: z.unknown() })
      .parse(await request.json());
    if (action === "join") {
      const data = joinInputSchema.parse(input);
      const cookieName = `buzzer-guest-${data.code}`;
      const secret = request.cookies.get(cookieName)?.value;
      if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
        // Confirm that the browser keeps the credential before allocating a
        // seat. Retrying the join then needs no key in JavaScript or its body.
        const response = NextResponse.json(
          { retry: true },
          {
            headers: { "Cache-Control": "no-store" },
          },
        );
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(
          request.nextUrl.hostname,
        );
        response.cookies.set(cookieName, randomBytes(32).toString("hex"), {
          httpOnly: true,
          secure: !local,
          sameSite: "strict",
          path: "/api/buzzer",
          maxAge: 6 * 60 * 60,
        });
        return response;
      }
      return Response.json(await joinGuestRoom(data, secret), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
      return Response.json(
        { error: "unauthorised", message: "Reconnect to continue." },
        { status: 401 },
      );
    let uid: string;
    try {
      const identity = await adminAuth().verifyIdToken(token, true);
      const code = z.object({ code: z.string() }).parse(input).code;
      if (identity.buzzerRoom !== code) throw new Error("Wrong room.");
      uid = identity.uid;
    } catch {
      return Response.json(
        { error: "unauthorised", message: "Reconnect to continue." },
        { status: 401 },
      );
    }
    await playerCommand(uid, action, input);
    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof RoomError)
      return Response.json(
        { error: error.code, message: error.message },
        { status: error.code === "rate_limited" ? 429 : 409 },
      );
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json(
        { error: "invalid", message: "Check the room code and name." },
        { status: 400 },
      );
    console.error("Buzzer command failed", error);
    return Response.json(
      {
        error: "unavailable",
        message: "Could not confirm the change. Reconnect to check.",
      },
      { status: 503 },
    );
  }
}
