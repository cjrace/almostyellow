"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Modal,
  NumberInput,
  Paper,
  Select,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
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
  type HistoricGameInput,
} from "@/uno/model";
import { useUno } from "@/uno/useUno";
import styles from "@/styles/uno.module.css";

function gameDescription(game: Game) {
  return `${gameDate(game) ?? "Unknown date"}: Cam ${String(game.cam)}, Laura ${String(game.laura)}`;
}

export default function UnoHistory() {
  const uno = useUno();
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [cam, setCam] = useState<string | number>(0);
  const [laura, setLaura] = useState<string | number>(0);
  const [precision, setPrecision] =
    useState<HistoricGameInput["datePrecision"]>("day");
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
  async function saveHistory(event: React.SyntheticEvent) {
    event.preventDefault();
    setError("");
    entryIdRef.current ??= crypto.randomUUID();
    const parsed = HistoricGameSchema.safeParse({
      id: entryIdRef.current,
      cam,
      laura,
      playedOn: precision === "unknown" ? "" : date,
      datePrecision: precision,
      notes,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setSaving(true);
    try {
      await uno.addHistory(parsed.data);
      setFormOpen(false);
      setCam(0);
      setLaura(0);
      setNotes("");
      setDate("");
      entryIdRef.current = null;
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
              aria-labelledby="add-historic"
              withBorder
              p="sm"
              mb="md"
            >
              <Title order={3} id="add-historic" size="h4" mb="xs">
                Add a historic game
              </Title>
              <form
                onSubmit={(event) => {
                  void saveHistory(event);
                }}
                className={styles.form}
              >
                <Text size="sm" c="dimmed">
                  Adds this game to lifetime totals and completed-game
                  statistics. Leave the date unknown if you do not have it.
                </Text>
                <div className={styles.formRow}>
                  <NumberInput
                    label="Cam’s round wins"
                    min={0}
                    max={1000000}
                    allowDecimal={false}
                    value={cam}
                    onChange={setCam}
                    required
                  />
                  <NumberInput
                    label="Laura’s round wins"
                    min={0}
                    max={1000000}
                    allowDecimal={false}
                    value={laura}
                    onChange={setLaura}
                    required
                  />
                </div>
                <div className={styles.formRow}>
                  <Select
                    label="Date precision"
                    value={precision}
                    onChange={(value) => {
                      if (
                        value === "day" ||
                        value === "month" ||
                        value === "year" ||
                        value === "unknown"
                      )
                        setPrecision(value);
                      setDate("");
                    }}
                    data={[
                      { value: "day", label: "Exact date" },
                      { value: "month", label: "Month only" },
                      { value: "year", label: "Year only" },
                      { value: "unknown", label: "Unknown" },
                    ]}
                    allowDeselect={false}
                  />
                  {precision !== "unknown" && (
                    <TextInput
                      label="Game date"
                      type={precision === "day" ? "date" : "text"}
                      placeholder={precision === "month" ? "YYYY-MM" : "YYYY"}
                      value={date}
                      onChange={(event) => {
                        setDate(event.currentTarget.value);
                      }}
                      required
                    />
                  )}
                </div>
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
                    onClick={() => {
                      setFormOpen(false);
                      setError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" loading={saving} disabled={!uno.online}>
                    Save historic game
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
                    {gameDate(g) ?? "Unknown date"}
                    {g.source === "historic" ? " · historic game" : ""}
                  </Text>
                  <Badge
                    variant={g.winner === "draw" ? "outline" : "light"}
                    color={
                      g.winner === "draw"
                        ? "gray"
                        : g.winner === "cam"
                          ? "orange"
                          : "blue"
                    }
                  >
                    {g.winner === "draw" ? "Draw" : `${names[g.winner]} won`}
                  </Badge>
                </div>
                <Text className={styles.entryScore}>
                  Cam {g.cam} · Laura {g.laura}
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
                    {g.rounds} rounds · {g.margin} point margin
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
