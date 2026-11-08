import { describe, expect, test } from "vitest";
import {
  SENDING_GRACE_MS,
  SLOW_SEND_MS,
  sendingState,
} from "@/unogame/sending";

const sent = { version: 5, at: 1000 };

describe("Move in flight", () => {
  test("nothing is in flight until a move is sent", () => {
    expect(sendingState(null, 5, 1000)).toBeNull();
  });

  test("a sent move is sending, then still sending after about two seconds", () => {
    expect(sendingState(sent, 5, 1000)).toBe("sending");
    expect(sendingState(sent, 5, 1000 + SLOW_SEND_MS - 1)).toBe("sending");
    expect(sendingState(sent, 5, 1000 + SLOW_SEND_MS)).toBe("slow");
  });

  test("it clears when the room changes", () => {
    expect(sendingState(sent, 6, 1100)).toBeNull();
    expect(sendingState(sent, 6, 9000)).toBeNull();
  });

  test("once the server has answered it waits a short while for the room, then clears", () => {
    const answered = { version: 5, at: 1400, answeredAt: 1500 };
    expect(sendingState(answered, 5, 1500 + SENDING_GRACE_MS)).toBe("slow");
    expect(sendingState(answered, 5, 1500 + SENDING_GRACE_MS + 1)).toBeNull();
  });
});
