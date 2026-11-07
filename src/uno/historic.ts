import { emptyBoard, result, type Board, type Game } from "./model";
import type { HistoricGameInput } from "./model";

/**
 * A finished game entered after the fact, and the scoreboard with its rounds
 * added to the lifetime totals. Shared by the history form and by saving an
 * online room, so both count a game in the same way.
 */
export function historicGameEntry(
  data: HistoricGameInput,
  board: Board | undefined,
  now: number,
): { game: Game; board: Board } {
  const current = board ?? emptyBoard();
  return {
    game: {
      ...data,
      status: "completed",
      source: "historic",
      startedAt: now,
      finishedAt: now,
      ...result(data),
      version: 1,
      amended: false,
    },
    board: {
      ...current,
      cam: current.cam + data.cam,
      laura: current.laura + data.laura,
      version: current.version + 1,
      updatedAt: now,
    },
  };
}
