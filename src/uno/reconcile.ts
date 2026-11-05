import type { Lease, UnoState } from "./model";
import type { LocalData } from "./storage";

export interface Reconciliation {
  state: UnoState;
  // These events existed before a non-replay request and may already be on
  // the server after a lost response. Later local events are still unsent.
  pendingAtRequest: readonly string[];
  accepted?: readonly string[];
  rejected?: readonly { id: string; message: string }[];
  replay?: boolean;
  checkedAt: number;
}

export function validLease(
  data: LocalData,
  lease: Lease | null,
): lease is Lease {
  return (
    !!lease &&
    lease.accountId === data.accountId &&
    lease.gameId === data.state?.board.activeGameId &&
    data.state.games.some(
      (game) => game.id === lease.gameId && game.status === "active",
    )
  );
}

export function reconcile(
  current: LocalData,
  response: Reconciliation,
): LocalData {
  const accepted = new Set(response.accepted);
  const events = current.events
    .filter((event) => !accepted.has(event.id))
    .map((event) => {
      const rejected = response.rejected?.find((item) => item.id === event.id);
      return rejected
        ? { ...event, status: "attention" as const, error: rejected.message }
        : event;
    });
  const uncertain =
    !response.replay &&
    events.some((event) => response.pendingAtRequest.includes(event.id));
  const newer =
    !current.state ||
    response.state.board.version >= current.state.board.version;
  const data: LocalData = {
    ...current,
    events,
    state: !uncertain && newer ? response.state : current.state,
    checkedAt:
      !uncertain && newer
        ? Math.max(current.checkedAt, response.checkedAt)
        : current.checkedAt,
  };
  return {
    ...data,
    lease: validLease(data, current.lease) ? current.lease : null,
  };
}
