"use client";

import { useState } from "react";
import { Paper, SegmentedControl, Text, Title } from "@mantine/core";
import { UnoHeader, UnoOfflineShell } from "@/components/unotracker";
import { gameDate, statistics, type Game } from "@/uno/model";
import { useUno } from "@/uno/useUno";
import styles from "@/styles/uno.module.css";

interface Point {
  id: string;
  date: string;
  cam: number;
  laura: number;
}
const camColor = "var(--mantine-color-orange-filled)";
const lauraColor = "var(--mantine-color-yellow-filled)";

function Chart({
  title,
  points,
  oneSeries = false,
}: {
  title: string;
  points: Point[];
  oneSeries?: boolean;
}) {
  const [view, setView] = useState("chart");
  const maximum = Math.max(1, ...points.flatMap((p) => [p.cam, p.laura]));
  const x = (i: number) => 35 + (i / Math.max(1, points.length - 1)) * 370;
  const y = (n: number) => 160 - (n / maximum) * 130;
  const last = points[points.length - 1] as Point | undefined;
  // Each line is named at its right-hand end, nudged apart if they would touch
  let camLabel = last ? y(last.cam) : 0;
  let lauraLabel = last ? y(last.laura) : 0;
  if (!oneSeries && Math.abs(camLabel - lauraLabel) < 14) {
    const gap = (14 - Math.abs(camLabel - lauraLabel)) / 2;
    if (camLabel <= lauraLabel) {
      camLabel -= gap;
      lauraLabel += gap;
    } else {
      camLabel += gap;
      lauraLabel -= gap;
    }
  }
  const series = [
    { key: "cam", name: oneSeries ? "Rounds" : "Cam", color: camColor },
    ...(oneSeries ? [] : [{ key: "laura", name: "Laura", color: lauraColor }]),
  ];
  return (
    <Paper withBorder p="sm">
      <div className={styles.chartHead}>
        <Title order={3} size="h4">
          {title}
        </Title>
        {!!points.length && (
          <SegmentedControl
            size="xs"
            aria-label={`${title} view`}
            value={view}
            onChange={setView}
            data={[
              { value: "chart", label: "Chart" },
              { value: "table", label: "Table" },
            ]}
          />
        )}
      </div>
      {!points.length ? (
        <Text size="sm">No dated completed games yet.</Text>
      ) : view === "table" ? (
        // Focusable so keyboard users can scroll a long table
        // eslint-disable-next-line jsx-a11y-x/no-noninteractive-tabindex
        <div className={styles.chartTable} tabIndex={0}>
          <table aria-label={title}>
            <thead>
              <tr>
                <th scope="col">Date</th>
                {series.map((line) => (
                  <th scope="col" key={line.key}>
                    {line.name}
                  </th>
                ))}
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
        </div>
      ) : (
        <svg
          className={styles.chart}
          viewBox="0 0 500 205"
          role="img"
          aria-label={`${title}. Use the Table view to read the values.`}
        >
          <title>{title}</title>
          <line
            x1="35"
            y1="160"
            x2="405"
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
          {series.map((line) => {
            const value = (p: Point) => (line.key === "cam" ? p.cam : p.laura);
            return (
              <g key={line.key}>
                <polyline
                  points={points
                    .map((p, i) => `${String(x(i))},${String(y(value(p)))}`)
                    .join(" ")}
                  stroke={line.color}
                  strokeWidth="3"
                  fill="none"
                />
                {points.map((p, i) => (
                  <circle
                    key={p.id}
                    cx={x(i)}
                    cy={y(value(p))}
                    r="3"
                    fill={line.color}
                  />
                ))}
                <text
                  x="414"
                  y={(line.key === "cam" ? camLabel : lauraLabel) + 4}
                  fill="currentColor"
                  fontSize="13"
                  fontWeight="700"
                >
                  {line.name}
                </text>
              </g>
            );
          })}
          <text x="35" y="190" fill="currentColor" fontSize="12">
            {points[0].date}
          </text>
          <text
            x="405"
            y="190"
            textAnchor="end"
            fill="currentColor"
            fontSize="12"
          >
            {points[points.length - 1].date}
          </text>
        </svg>
      )}
    </Paper>
  );
}
// A card value for both players: the leader is bold and in their colour, and
// a draw leaves both plain
function Pair({
  cam,
  laura,
  suffix = "",
  lead = [Number(cam), Number(laura)],
}: {
  cam: string | number;
  laura: string | number;
  suffix?: string;
  lead?: [number, number];
}) {
  const winner =
    lead[0] === lead[1] ? null : lead[0] > lead[1] ? "cam" : "laura";
  const style = (player: "cam" | "laura") =>
    winner === player
      ? {
          fontWeight: 700,
          color: `var(--mantine-color-${player === "cam" ? "orange" : "yellow"}-text)`,
        }
      : undefined;
  return (
    <Text>
      <span style={style("cam")}>
        Cam {cam}
        {suffix}
      </span>
      {" · "}
      <span style={style("laura")}>
        Laura {laura}
        {suffix}
      </span>
    </Text>
  );
}
function gameDescription(game: Game | null) {
  return game
    ? `${gameDate(game) ?? "Unknown date"}: Cam ${String(game.cam)}, Laura ${String(game.laura)}`
    : "No completed games yet";
}

export default function UnoStatistics() {
  const uno = useUno();
  const summary = uno.state ? statistics(uno.state) : null;
  const percentage = (wins: number) =>
    summary?.games.length
      ? ((100 * wins) / summary.games.length).toFixed(1)
      : "0";
  return (
    <div className={styles.stats}>
      <UnoHeader page="stats" />
      <UnoOfflineShell />
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
                <Pair
                  cam={uno.state?.board.cam ?? 0}
                  laura={uno.state?.board.laura ?? 0}
                />
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Games played</Text>
                <Text fw={700}>{summary.games.length}</Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Games won</Text>
                <Pair cam={summary.wins.cam} laura={summary.wins.laura} />
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Game win percentage</Text>
                <Pair
                  cam={percentage(summary.wins.cam)}
                  laura={percentage(summary.wins.laura)}
                  suffix="%"
                  lead={[summary.wins.cam, summary.wins.laura]}
                />
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
              ].map(([label, value, detail]) => (
                <Paper withBorder p="sm" key={label}>
                  <Text size="sm">{label}</Text>
                  <Text fw={700}>{value}</Text>
                  {detail && <Text size="xs">{detail}</Text>}
                </Paper>
              ))}
              <Paper withBorder p="sm">
                <Text size="sm">Longest winning streak</Text>
                <Pair cam={summary.streak.cam} laura={summary.streak.laura} />
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm">Highest individual score</Text>
                <Text fw={700}>{summary.highest}</Text>
              </Paper>
            </div>
          </section>
          <section aria-labelledby="trends">
            <Title order={2} id="trends">
              Trends
            </Title>
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
        </>
      )}
    </div>
  );
}
