"use client";

import { useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPencil, IconTrash } from "@tabler/icons-react";
import { readUnoHistory } from "@/services/uno";
import { UnoHeader, UnoOfflineShell } from "@/components/unotracker";
import {
  compareGames,
  gameDate,
  HistoricGameSchema,
  names,
  statistics,
  type EventHistory,
  type Game,
} from "@/uno/model";
import { useUno } from "@/uno/useUno";
import styles from "@/styles/uno.module.css";

function gameDescription(game: Game) {
  return `${gameDate(game) ?? "Unknown date"}: Cam ${String(game.cam)}, Laura ${String(game.laura)}`;
}

export default function UnoHistory() {
  const uno = useUno();
  const [formOpen, setFormOpen] = useState(false);
  // The game being edited, or null when the form adds a new one
  const [editing, setEditing] = useState<Game | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const formRef = useRef<HTMLElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cam, setCam] = useState<string | number>(0);
  const [laura, setLaura] = useState<string | number>(0);
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [winnerFilter, setWinnerFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selected, setSelected] = useState<Game | null>(null);
  const [events, setEvents] = useState<EventHistory[] | null>(null);
  const [historyError, setHistoryError] = useState("");
  const entryIdRef = useRef<string | null>(null);
  const historyRequestRef = useRef(0);
  useEffect(
    () => () => {
      historyRequestRef.current++;
    },
    [],
  );
  const summary = uno.state ? statistics(uno.state) : null;
  const games =
    summary?.games
      .filter(
        (g) =>
          (winnerFilter === "all" || g.winner === winnerFilter) &&
          (!dateFilter || gameDate(g)?.startsWith(dateFilter)),
      )
      .sort(
        (a, b) =>
          (gameDate(b) ?? "").localeCompare(gameDate(a) ?? "") ||
          compareGames(a, b),
      ) ?? [];
  function closeForm() {
    setFormOpen(false);
    setEditing(null);
    setError("");
    setCam(0);
    setLaura(0);
    setNotes("");
    setDate("");
    entryIdRef.current = null;
  }
  function openEdit(game: Game) {
    setEditing(game);
    setCam(game.cam);
    setLaura(game.laura);
    setDate(game.playedOn ?? "");
    setNotes(game.notes);
    setError("");
    setFormOpen(true);
    // The form sits above the list, so bring it into view
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: "center" });
    });
  }
  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await uno.deleteGame(deleting.id);
      setDeleting(null);
    } catch (cause) {
      setDeleteError(
        cause instanceof Error
          ? cause.message
          : "Could not delete this game. Try again.",
      );
    } finally {
      setDeleteBusy(false);
    }
  }
  async function saveHistory(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    entryIdRef.current ??= crypto.randomUUID();
    const parsed = HistoricGameSchema.safeParse({
      id: editing?.id ?? entryIdRef.current,
      cam,
      laura,
      playedOn: date,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      if (editing) await uno.editHistory(parsed.data);
      else await uno.addHistory(parsed.data);
      closeForm();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save this game. Try again.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function openHistory(game: Game) {
    const request = ++historyRequestRef.current;
    setSelected(game);
    setEvents(null);
    setHistoryError("");
    if (!uno.online) {
      setHistoryError(
        "Reconnect to inspect the scoring history. Saved game totals are shown above.",
      );
      return;
    }
    try {
      const history = await readUnoHistory(game.id);
      if (request === historyRequestRef.current) setEvents(history);
    } catch {
      if (request !== historyRequestRef.current) return;
      setHistoryError(
        "Could not load scoring history. Close this window and try again.",
      );
    }
  }
  return (
    <div className={styles.stats}>
      <UnoHeader page="history" />
      <UnoOfflineShell />
      {!summary ? (
        <Text>
          {uno.ready
            ? "Connect once to load the game history."
            : "Loading game history…"}
        </Text>
      ) : (
        <section aria-labelledby="history">
          <div className={styles.historyHead}>
            <div>
              <Title order={2} id="history">
                Game history
              </Title>
              <Text size="sm" c="dimmed">
                {games.length === summary.games.length
                  ? `${String(games.length)} games`
                  : `${String(games.length)} of ${String(summary.games.length)} games`}
              </Text>
            </div>
            {uno.data.accountId && !formOpen && (
              <Button
                disabled={!uno.online || !uno.verified}
                onClick={() => {
                  setFormOpen(true);
                }}
              >
                Add historic game
              </Button>
            )}
          </div>
          {formOpen && (
            <Paper
              component="section"
              ref={formRef}
              aria-labelledby="add-historic"
              withBorder
              p="sm"
              mb="md"
            >
              <Title order={3} id="add-historic" size="h4" mb="xs">
                {editing ? "Edit historic game" : "Add a historic game"}
              </Title>
              <form
                onSubmit={(event) => {
                  void saveHistory(event);
                }}
                className={styles.form}
              >
                <Text size="sm" c="dimmed">
                  {editing
                    ? "Changes the lifetime totals and statistics to match."
                    : "Adds this game to lifetime totals and completed-game statistics. Use your best guess if you are unsure of the date."}
                </Text>
                <div className={styles.formRow}>
                  <NumberInput
                    label="Cam’s round wins"
                    min={0}
                    max={1000000}
                    allowDecimal={false}
                    hideControls
                    inputMode="numeric"
                    value={cam}
                    onChange={setCam}
                    required
                  />
                  <NumberInput
                    label="Laura’s round wins"
                    min={0}
                    max={1000000}
                    allowDecimal={false}
                    hideControls
                    inputMode="numeric"
                    value={laura}
                    onChange={setLaura}
                    required
                  />
                </div>
                <TextInput
                  label="Game date"
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.currentTarget.value);
                  }}
                  required
                />
                <Textarea
                  label="Notes"
                  description="For example, where you played or how you remember the date."
                  maxLength={2000}
                  value={notes}
                  onChange={(event) => {
                    setNotes(event.currentTarget.value);
                  }}
                />
                {error && (
                  <Alert color="orange" role="alert">
                    {error}
                  </Alert>
                )}
                <div className={styles.formRow}>
                  <Button
                    variant="default"
                    disabled={saving}
                    onClick={closeForm}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving} disabled={!uno.online}>
                    {editing ? "Save changes" : "Save historic game"}
                  </Button>
                </div>
              </form>
            </Paper>
          )}
          <div className={styles.filters}>
            <Select
              label="Winner"
              value={winnerFilter}
              onChange={(value) => {
                setWinnerFilter(value ?? "all");
              }}
              data={[
                { value: "all", label: "All games" },
                { value: "cam", label: "Cam" },
                { value: "laura", label: "Laura" },
                { value: "draw", label: "Draws" },
              ]}
              allowDeselect={false}
            />
            <TextInput
              label="Date starts with"
              placeholder="e.g. 2024 or 2024-06"
              value={dateFilter}
              onChange={(event) => {
                setDateFilter(event.currentTarget.value);
              }}
            />
          </div>
          <div className={styles.history}>
            {games.map((g) => (
              <Paper withBorder p="sm" key={g.id} className={styles.entry}>
                <div className={styles.entryHead}>
                  <Text fw={700}>
                    <span className={styles.nowrap}>
                      {gameDate(g) ?? "Unknown date"}
                    </span>
                    {g.source === "historic" && (
                      <>
                        {" · "}
                        <span className={styles.nowrap}>historic game</span>
                      </>
                    )}
                  </Text>
                  <Badge
                    variant={g.winner === "draw" ? "outline" : "filled"}
                    color={
                      g.winner === "draw"
                        ? "gray"
                        : g.winner === "cam"
                          ? "orange"
                          : "yellow"
                    }
                    // Black text keeps the filled orange and yellow readable
                    style={
                      g.winner === "draw"
                        ? undefined
                        : { color: "var(--mantine-color-black)" }
                    }
                  >
                    {g.winner === "draw" ? "Draw" : `${names[g.winner]} won`}
                  </Badge>
                  {uno.data.accountId && (
                    <Group gap={4} wrap="nowrap">
                      {g.source === "historic" && (
                        <ActionIcon
                          variant="subtle"
                          aria-label={`Edit historic game from ${gameDate(g) ?? "unknown date"}`}
                          disabled={!uno.online || !uno.verified}
                          onClick={() => {
                            openEdit(g);
                          }}
                        >
                          <IconPencil size={18} />
                        </ActionIcon>
                      )}
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        aria-label={`Delete ${g.source === "historic" ? "historic " : ""}game from ${gameDate(g) ?? "unknown date"}`}
                        disabled={!uno.online || !uno.verified}
                        onClick={() => {
                          setDeleteError("");
                          setDeleting(g);
                        }}
                      >
                        <IconTrash size={18} />
                      </ActionIcon>
                    </Group>
                  )}
                </div>
                <Text className={styles.entryScore}>
                  <span className={styles.nowrap}>Cam {g.cam}</span>
                  {" · "}
                  <span className={styles.nowrap}>Laura {g.laura}</span>
                </Text>
                {g.notes && (
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {g.notes}
                  </Text>
                )}
                {g.amended && (
                  <Text size="sm" c="orange">
                    Result amended after offline rounds synced.
                  </Text>
                )}
                <div className={styles.entryFoot}>
                  <Text size="sm" c="dimmed">
                    <span className={styles.nowrap}>{g.rounds} rounds</span>
                    {" · "}
                    <span className={styles.nowrap}>
                      {g.margin} point margin
                    </span>
                  </Text>
                  <Button
                    variant="subtle"
                    size="compact-sm"
                    onClick={() => {
                      void openHistory(g);
                    }}
                  >
                    Scoring history
                  </Button>
                </div>
              </Paper>
            ))}
            {!games.length && (
              <Text>No completed games match these filters.</Text>
            )}
          </div>
        </section>
      )}
      <Modal
        opened={!!deleting}
        onClose={() => {
          if (!deleteBusy) setDeleting(null);
        }}
        title="Delete game?"
        closeButtonProps={{ "aria-label": "Close delete confirmation" }}
        centered
      >
        {deleting && (
          <>
            <Text fw={700}>{gameDescription(deleting)}</Text>
            <Text size="sm" mt="xs">
              This removes the game from the history and statistics, and takes
              its round wins off the lifetime totals.
              {deleting.source === "live"
                ? " Its scoring history is deleted too."
                : ""}{" "}
              It cannot be undone, but you can add it again as a historic game.
            </Text>
            {deleteError && (
              <Alert color="orange" role="alert" mt="sm">
                {deleteError}
              </Alert>
            )}
            <Group mt="md" justify="flex-end">
              <Button
                variant="default"
                disabled={deleteBusy}
                onClick={() => {
                  setDeleting(null);
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                loading={deleteBusy}
                disabled={!uno.online}
                onClick={() => {
                  void confirmDelete();
                }}
              >
                Delete game
              </Button>
            </Group>
          </>
        )}
      </Modal>
      <Modal
        opened={!!selected}
        onClose={() => {
          historyRequestRef.current++;
          setSelected(null);
        }}
        title="Scoring history"
        closeButtonProps={{ "aria-label": "Close scoring history" }}
        centered
      >
        {selected && (
          <>
            <Text fw={700}>{gameDescription(selected)}</Text>
            {selected.notes && <Text>{selected.notes}</Text>}
            {historyError ? (
              <Alert color="orange">{historyError}</Alert>
            ) : events === null ? (
              <Text>Loading rounds…</Text>
            ) : !events.length ? (
              <Text>
                {selected.source === "historic"
                  ? "Historic totals were entered together; individual rounds were not recorded."
                  : "No rounds recorded."}
              </Text>
            ) : (
              <ol>
                {events.map((e) => (
                  <li key={e.id}>
                    {names[e.player]} {e.delta > 0 ? "+1" : "−1"} ·{" "}
                    {new Date(e.createdAt).toLocaleString("en-GB")}
                    <Text size="xs">
                      Synced {new Date(e.receivedAt).toLocaleString("en-GB")}
                    </Text>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
