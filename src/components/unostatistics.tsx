"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert,
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
import { readUnoHistory } from "@/services/uno";
import { UnoNavigation, UnoOfflineShell } from "@/components/unotracker";
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

interface Point {
  id: string;
  date: string;
  cam: number;
  laura: number;
}
function Chart({
  title,
  points,
  oneSeries = false,
}: {
  title: string;
  points: Point[];
  oneSeries?: boolean;
}) {
  const maximum = Math.max(1, ...points.flatMap((p) => [p.cam, p.laura]));
  const x = (i: number) => 35 + (i / Math.max(1, points.length - 1)) * 430;
  const y = (n: number) => 160 - (n / maximum) * 130;
  return (
    <Paper withBorder p="sm">
      <Title order={3} size="h4">
        {title}
      </Title>
      <Text size="xs">
        {oneSeries ? "Total rounds" : "Cam: solid line · Laura: dashed line"}
      </Text>
      {!points.length ? (
        <Text size="sm">No dated completed games yet.</Text>
      ) : (
        <>
          <svg
            className={styles.chart}
            viewBox="0 0 500 205"
            role="img"
            aria-label={`${title}. ${oneSeries ? "Total rounds" : "Cam: solid line. Laura: dashed line"}. Values in the data table below.`}
          >
            <title>{title}</title>
            <line
              x1="35"
              y1="160"
              x2="465"
              y2="160"
              stroke="currentColor"
              opacity="0.4"
            />
            <text x="5" y="35" fill="currentColor" fontSize="12">
              {maximum}
            </text>
            <text x="15" y="165" fill="currentColor" fontSize="12">
              0
            </text>
            <polyline
              points={points
                .map((p, i) => `${String(x(i))},${String(y(p.cam))}`)
                .join(" ")}
              stroke="var(--mantine-color-orange-6)"
              strokeWidth="3"
              fill="none"
            />
            {!oneSeries && (
              <polyline
                points={points
                  .map((p, i) => `${String(x(i))},${String(y(p.laura))}`)
                  .join(" ")}
                stroke="var(--mantine-color-blue-4)"
                strokeWidth="3"
                strokeDasharray="7 4"
                fill="none"
              />
            )}
            {points.map((point, i) => (
              <g key={point.id}>
                <circle
                  cx={x(i)}
                  cy={y(point.cam)}
                  r="3"
                  fill="var(--mantine-color-orange-6)"
                />
                {!oneSeries && (
                  <circle
                    cx={x(i)}
                    cy={y(point.laura)}
                    r="3"
                    fill="var(--mantine-color-blue-4)"
                  />
                )}
              </g>
            ))}
            <text x="35" y="190" fill="currentColor" fontSize="12">
              {points[0].date}
            </text>
            <text
              x="465"
              y="190"
              textAnchor="end"
              fill="currentColor"
              fontSize="12"
            >
              {points[points.length - 1].date}
            </text>
          </svg>
          <details>
            <summary>Chart values</summary>
            <table>
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">{oneSeries ? "Rounds" : "Cam"}</th>
                  {!oneSeries && <th scope="col">Laura</th>}
                </tr>
              </thead>
              <tbody>
                {points.map((p) => (
                  <tr key={p.id}>
                    <th scope="row">{p.date}</th>
                    <td>{p.cam}</td>
                    {!oneSeries && <td>{p.laura}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </>
      )}
    </Paper>
  );
}
function gameDescription(game: Game | null) {
  return game
    ? `${gameDate(game) ?? "Unknown date"}: Cam ${String(game.cam)}, Laura ${String(game.laura)}`
    : "No completed games yet";
}

export default function UnoStatistics() {
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
      <Title>Uno statistics</Title>
      <UnoNavigation stats />
      <UnoOfflineShell />
      {uno.notice && (
        <Text role="status" size="sm">
          {uno.notice}
        </Text>
      )}
      {!uno.online && (
        <Alert>
          Offline · showing saved statistics from{" "}
          {uno.data.checkedAt
            ? new Date(uno.data.checkedAt).toLocaleString("en-GB")
            : "an earlier visit"}
          . They may be outdated.
        </Alert>
      )}
      {uno.error && <Alert color="orange">{uno.error}</Alert>}
      {!!uno.data.events.length && (
        <Text size="sm">
          These records show confirmed shared scores. {uno.data.events.length}{" "}
          saved changes on this device have not synced yet.
        </Text>
      )}
      {!summary ? (
        <Text>
          {uno.ready
            ? "Connect once to load Uno statistics."
            : "Loading statistics…"}
        </Text>
      ) : (
        <>
          <section aria-labelledby="summary">
            <Title order={2} id="summary">
              Summary
            </Title>
            <div className={styles.summary}>
              <Paper withBorder p="sm">
                <Text size="sm">All-time round wins</Text>
                <Text fw={700}>
                  Cam {uno.state?.board.cam} · Laura {uno.state?.board.laura}
                </Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Games played</Text>
                <Text fw={700}>{summary.games.length}</Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Games won</Text>
                <Text fw={700}>
                  Cam {summary.wins.cam} · Laura {summary.wins.laura}
                </Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Game win percentage</Text>
                <Text fw={700}>
                  Cam{" "}
                  {summary.games.length
                    ? ((100 * summary.wins.cam) / summary.games.length).toFixed(
                        1,
                      )
                    : "0"}
                  % · Laura{" "}
                  {summary.games.length
                    ? (
                        (100 * summary.wins.laura) /
                        summary.games.length
                      ).toFixed(1)
                    : "0"}
                  %
                </Text>
                <Text size="xs">Includes draws in games played.</Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Draws</Text>
                <Text fw={700}>{summary.draws}</Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Average rounds per game</Text>
                <Text fw={700}>{summary.average.toFixed(1)}</Text>
              </Paper>
            </div>
          </section>
          <section aria-labelledby="records">
            <Title order={2} id="records">
              Records
            </Title>
            <div className={styles.summary}>
              {[
                [
                  "Biggest winning margin",
                  summary.biggest
                    ? `${String(summary.biggest.margin)} points`
                    : "—",
                  gameDescription(summary.biggest),
                ],
                [
                  "Longest game",
                  summary.longest
                    ? `${String(summary.longest.rounds)} rounds`
                    : "—",
                  gameDescription(summary.longest),
                ],
                [
                  "Shortest game",
                  summary.shortest
                    ? `${String(summary.shortest.rounds)} rounds`
                    : "—",
                  gameDescription(summary.shortest),
                ],
                [
                  "Closest game",
                  summary.closest
                    ? `${String(summary.closest.margin)} points`
                    : "—",
                  gameDescription(summary.closest),
                ],
                [
                  "Longest winning streak",
                  `Cam ${String(summary.streak.cam)} · Laura ${String(summary.streak.laura)}`,
                  "Dated games, in recorded date order. Historic entries have no recorded time and come before live games on the same date. Approximate dates may affect ordering.",
                ],
                [
                  "Highest individual score",
                  String(summary.highest),
                  "Round wins in one game",
                ],
              ].map(([label, value, detail]) => (
                <Paper withBorder p="sm" key={label}>
                  <Text size="sm">{label}</Text>
                  <Text fw={700}>{value}</Text>
                  <Text size="xs">{detail}</Text>
                </Paper>
              ))}
            </div>
          </section>
          <section aria-labelledby="trends">
            <Title order={2} id="trends">
              Trends
            </Title>
            <Text size="sm" mb="sm">
              Completed games in date order. Games with unknown dates are
              excluded from trends and streaks; year-only dates are excluded
              from monthly wins. Active-game rounds are included in all-time
              totals above.
            </Text>
            <div className={styles.charts}>
              <Chart
                title="Cumulative round wins"
                points={summary.cumulative}
              />
              <Chart title="Games won by month" points={summary.months} />
              <Chart
                title="Game length over time"
                points={summary.dated.map((g) => ({
                  id: g.id,
                  date: gameDate(g) ?? "",
                  cam: g.rounds,
                  laura: 0,
                }))}
                oneSeries
              />
            </div>
          </section>
          <section aria-labelledby="history">
            <Group justify="space-between">
              <Title order={2} id="history">
                Game history
              </Title>
              {uno.data.accountId && (
                <Button
                  disabled={!uno.online || !uno.verified}
                  onClick={() => {
                    setFormOpen(true);
                  }}
                >
                  Add historic game
                </Button>
              )}
            </Group>
            <Group my="md" align="end">
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
              />
              <TextInput
                label="Date starts with"
                placeholder="e.g. 2024 or 2024-06"
                value={dateFilter}
                onChange={(event) => {
                  setDateFilter(event.currentTarget.value);
                }}
              />
            </Group>
            <div className={styles.history}>
              {games.map((g) => (
                <Paper withBorder p="sm" key={g.id} className={styles.entry}>
                  <Text fw={700}>
                    {gameDate(g) ?? "Unknown date"}
                    {g.source === "historic" ? " · historic game" : ""}
                  </Text>
                  <Text>
                    Cam {g.cam} · Laura {g.laura} ·{" "}
                    {g.winner === "draw" ? "Draw" : `${names[g.winner]} won`}
                  </Text>
                  <Text size="sm">
                    {g.rounds} rounds · {g.margin} point margin
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
                  <Button
                    variant="subtle"
                    mt="xs"
                    onClick={() => {
                      void openHistory(g);
                    }}
                  >
                    Scoring history
                  </Button>
                </Paper>
              ))}
              {!games.length && (
                <Text>No completed games match these filters.</Text>
              )}
            </div>
          </section>
        </>
      )}
      <Modal
        opened={formOpen}
        onClose={() => {
          if (!saving) setFormOpen(false);
        }}
        title="Add a historic game"
        closeButtonProps={{ "aria-label": "Close historic game form" }}
        centered
      >
        <form
          onSubmit={(event) => {
            void saveHistory(event);
          }}
          className={styles.form}
        >
          <Text size="sm">
            Adds this game to lifetime totals and completed-game statistics.
            Leave the date unknown if you do not have it.
          </Text>
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
          <Button type="submit" loading={saving} disabled={!uno.online}>
            Save historic game
          </Button>
        </form>
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
