"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "@mantine/hooks";
import {
  Box,
  Button,
  Group,
  List,
  Modal,
  SegmentedControl,
  Slider,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconPlayerPlay,
  IconPlayerStop,
  IconRefresh,
  IconRosetteDiscountCheck,
  IconTrophy,
} from "@tabler/icons-react";
import useGameInProgress from "@/components/usegameinprogress";
import CardGameTitle from "@/components/cardgametitle";
import playConfetti from "@/components/playconfetti";
import {
  DURATIONS,
  type Duration,
  MAX_COWS,
  MIN_COWS,
  type RacePlan,
  finishingOrder,
  leaderAt,
  planRace,
  progressAt,
  steppedProgress,
} from "@/cowrace/race";
import layout from "@/styles/cowrace.module.css";

type Phase = "setup" | "racing" | "finished";

// Colours from the site's theme, none of them green
const BADGE_COLOURS = [
  "#e8590c",
  "#1971c2",
  "#9c36b5",
  "#c2255c",
  "#0c8599",
  "#3b5bdb",
  "#d9480f",
  "#6741d9",
  "#a61e4d",
  "#495057",
];

const name = (cow: number) => `Cow ${(cow + 1).toString()}`;

// The title and instructions, which the page puts in its header
export function CowRaceTitle() {
  return (
    <CardGameTitle title="Cow race" credited={false}>
      <Text mb="sm">A race for spectators. Nobody steers the cows.</Text>
      <List variant="ordered">
        <List.Item>choose how many cows run, from 2 to 10</List.Item>
        <List.Item>choose a short, medium or long race</List.Item>
        <List.Item>pick a cow to cheer for, then start the race</List.Item>
        <List.Item>
          the cows set off at random speeds, so anyone can win
        </List.Item>
        <List.Item>
          when every cow has finished you see the winner and the full finishing
          order
        </List.Item>
      </List>
    </CardGameTitle>
  );
}

function Cow({ number, running }: { number: number; running: boolean }) {
  return (
    <svg
      className={layout.cowImage}
      viewBox="0 0 64 44"
      aria-hidden="true"
      focusable="false"
    >
      <g className={running ? layout.trot : undefined}>
        {/* Tail */}
        <path
          d="M7 14 Q1 16 3 26"
          fill="none"
          stroke="#444"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Legs */}
        <g fill="#f4f4f4" stroke="#444" strokeWidth="1.5">
          <rect x="12" y="28" width="5" height="13" rx="1.5" />
          <rect x="21" y="28" width="5" height="13" rx="1.5" />
          <rect x="36" y="28" width="5" height="13" rx="1.5" />
          <rect x="45" y="28" width="5" height="13" rx="1.5" />
        </g>
        {/* Body */}
        <rect
          x="7"
          y="10"
          width="46"
          height="23"
          rx="10"
          fill="#fff"
          stroke="#444"
          strokeWidth="1.5"
        />
        <ellipse cx="20" cy="17" rx="5" ry="4" fill="#333" />
        <ellipse cx="43" cy="26" rx="4" ry="3.5" fill="#333" />
        {/* Head, facing right */}
        <rect
          x="46"
          y="8"
          width="15"
          height="15"
          rx="5"
          fill="#fff"
          stroke="#444"
          strokeWidth="1.5"
        />
        <rect x="50" y="17" width="11" height="6" rx="3" fill="#f3a6b5" />
        <circle cx="53" cy="14" r="1.5" fill="#222" />
        <path
          d="M49 8 L47 3 M58 8 L60 3"
          stroke="#444"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Number, so the cows differ by more than colour */}
        <circle cx="30" cy="22" r="7" fill={BADGE_COLOURS[number]} />
        <text
          x="30"
          y="25.5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="700"
          fill="#fff"
          fontFamily="sans-serif"
        >
          {number + 1}
        </text>
      </g>
    </svg>
  );
}

export default function CowRace() {
  const reducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("setup");
  const [cowCount, setCowCount] = useState(5);
  const [duration, setDuration] = useState<Duration>("medium");
  const [plan, setPlan] = useState<RacePlan | null>(null);
  const [status, setStatus] = useState("");
  const [resultsOpen, setResultsOpen] = useState(false);
  const [leader, setLeader] = useState<number | null>(null);

  const cowRef = useRef<(HTMLDivElement | null)[]>([]);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const focusTargetRef = useRef<"cancel" | "again" | "start" | null>(null);

  useGameInProgress(phase === "racing");

  const order = plan ? finishingOrder(plan) : [];
  const winner = order.at(0);

  const startRace = useCallback(() => {
    setPlan(planRace(cowCount, duration));
    setStatus("The race has started");
    setLeader(null);
    setResultsOpen(false);
    focusTargetRef.current = "cancel";
    setPhase("racing");
  }, [cowCount, duration]);

  const cancelRace = () => {
    setStatus("Race cancelled");
    setPlan(null);
    setLeader(null);
    focusTargetRef.current = "start";
    setPhase("setup");
  };

  // Plays the race back. The positions go straight onto the cows rather than
  // through React, which would redraw the page on every frame
  useEffect(() => {
    if (phase !== "racing" || !plan) return;
    let frame = 0;
    let last: number | null = null;
    let elapsed = 0;
    let halfway = false;
    let showing: number | null = null;

    const show = (seconds: number) => {
      plan.cows.forEach((_, cow) => {
        const progress = progressAt(plan, cow, seconds);
        cowRef.current[cow]?.style.setProperty(
          "--p",
          String(reducedMotion ? steppedProgress(progress) : progress),
        );
      });
    };

    const tick = (now: number) => {
      // A hidden page stops asking for frames, so cap the step to pause the
      // race rather than skip to the end
      elapsed += last === null ? 0 : Math.min((now - last) / 1000, 0.25);
      last = now;
      show(elapsed);
      // Redraw only when the lead changes, not on every frame
      const front = leaderAt(plan, elapsed);
      if (elapsed > 0.5 && front !== showing) {
        showing = front;
        setLeader(front);
      }
      if (!halfway && elapsed >= plan.duration / 2) {
        halfway = true;
        setStatus(`${name(front)} is in the lead`);
      }
      if (elapsed >= plan.duration) {
        show(plan.duration);
        const first = finishingOrder(plan)[0];
        setLeader(first);
        setStatus(`${name(first)} wins the race`);
        focusTargetRef.current = "again";
        setPhase("finished");
        setResultsOpen(true);
        playConfetti();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [phase, plan, reducedMotion]);

  // The button that was pressed disappears, so say where focus goes
  useEffect(() => {
    const target = focusTargetRef.current;
    if (!target) return;
    const element = {
      cancel: cancelRef,
      again: againRef,
      start: startRef,
    }[target].current;
    if (element) {
      focusTargetRef.current = null;
      element.focus();
    }
  }, [phase, resultsOpen]);

  const closeResults = () => {
    setResultsOpen(false);
    focusTargetRef.current = "again";
  };

  const finished = phase === "finished";
  const setup = phase === "setup";
  const lanes = setup ? cowCount : (plan?.cows.length ?? 0);
  const highlighted = finished ? winner : leader;

  const backToSetup = () => {
    setResultsOpen(false);
    setPlan(null);
    setLeader(null);
    focusTargetRef.current = "start";
    setPhase("setup");
  };

  return (
    <div className={layout.space}>
      <div className={layout.game}>
        <VisuallyHidden role="status">{status}</VisuallyHidden>

        <div className={layout.bar}>
          {setup ? (
            <>
              <Box className={layout.barCows}>
                <Text fw={500} size="sm" mb={6}>
                  Cows: {cowCount}
                </Text>
                <Slider
                  min={MIN_COWS}
                  max={MAX_COWS}
                  step={1}
                  value={cowCount}
                  onChange={setCowCount}
                  marks={Array.from(
                    { length: MAX_COWS - MIN_COWS + 1 },
                    (_, i) => ({
                      value: i + MIN_COWS,
                      label: String(i + MIN_COWS),
                    }),
                  )}
                  label={null}
                  thumbLabel="Number of cows"
                  classNames={{
                    root: layout.slider,
                    markLabel: layout.markLabel,
                  }}
                />
              </Box>

              <Box className={layout.barLength}>
                <Text id="race_length" fw={500} size="sm" mb={6}>
                  Length of the race
                </Text>
                <SegmentedControl
                  aria-labelledby="race_length"
                  fullWidth
                  value={duration}
                  onChange={(value) => {
                    setDuration(value);
                  }}
                  data={(Object.keys(DURATIONS) as Duration[]).map((key) => ({
                    value: key,
                    label: (
                      <>
                        {DURATIONS[key].label}
                        <span className={layout.seconds}>
                          {" "}
                          ({DURATIONS[key].seconds.toString()}s)
                        </span>
                      </>
                    ),
                  }))}
                />
              </Box>

              <Button
                ref={startRef}
                onClick={startRace}
                size="md"
                leftSection={<IconPlayerPlay size={18} aria-hidden />}
                className={layout.barAction}
              >
                Start race
              </Button>
            </>
          ) : (
            <>
              <div className={layout.barStatus}>
                {finished && winner !== undefined ? (
                  <Title order={2} size="h3" data-testid="winner">
                    {name(winner)} wins!
                  </Title>
                ) : (
                  <>
                    <Text fw={600}>Race under way</Text>
                    <Text c="dimmed" size="sm" aria-hidden="true">
                      {leader === null
                        ? "And they're off…"
                        : `Leader: ${name(leader)}`}
                    </Text>
                  </>
                )}
              </div>
              <div className={layout.barButtons}>
                {finished ? (
                  <>
                    <Button
                      ref={againRef}
                      onClick={startRace}
                      leftSection={<IconRefresh size={18} aria-hidden />}
                    >
                      Race again
                    </Button>
                    <Button variant="default" onClick={backToSetup}>
                      Change settings
                    </Button>
                  </>
                ) : (
                  <Button
                    ref={cancelRef}
                    variant="default"
                    onClick={cancelRace}
                    leftSection={<IconPlayerStop size={18} aria-hidden />}
                  >
                    Cancel race
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className={layout.track}>
          <div className={layout.marks} aria-hidden="true">
            <span />
            <span className={layout.markLabels}>
              <span>Start</span>
              <span>Finish</span>
            </span>
            <span />
          </div>
          <div
            className={layout.lanes}
            style={{ "--n": lanes } as React.CSSProperties}
          >
            <div className={layout.lanesInner} data-testid="lanes">
              {Array.from({ length: lanes }, (_, i) => i).map((cow) => (
                <div
                  key={cow}
                  className={`${layout.lane} ${
                    cow === highlighted ? layout.lead : ""
                  } ${finished && cow === winner ? layout.won : ""}`}
                >
                  <div className={layout.laneName}>
                    {finished && cow === winner && (
                      <IconRosetteDiscountCheck
                        size={18}
                        color="gold"
                        aria-hidden
                      />
                    )}
                    {name(cow)}
                  </div>
                  <div className={layout.field} data-testid="field">
                    <div
                      className={layout.cow}
                      data-testid={`cow-${(cow + 1).toString()}`}
                      ref={(element) => {
                        cowRef.current[cow] = element;
                      }}
                      style={
                        finished
                          ? ({ "--p": 1 } as React.CSSProperties)
                          : setup
                            ? ({ "--p": 0 } as React.CSSProperties)
                            : undefined
                      }
                    >
                      <Cow
                        number={cow}
                        running={phase === "racing" && !reducedMotion}
                      />
                    </div>
                  </div>
                  <div className={layout.finish} data-testid="finish" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Modal
          opened={resultsOpen}
          onClose={closeResults}
          title="Race results"
          closeButtonProps={{ "aria-label": "Close" }}
          returnFocus={false}
        >
          <Text fw={700} mb="xs">
            {winner !== undefined ? `${name(winner)} wins!` : ""}
          </Text>
          <ol className={layout.results} aria-label="Finishing order">
            {order.map((cow, place) => (
              <li key={cow}>
                <span className={layout.trophy}>
                  {place < 3 ? (
                    <IconTrophy
                      size={18}
                      aria-hidden
                      color={["gold", "silver", "#cd7f32"][place]}
                    />
                  ) : null}
                </span>
                {name(cow)}
              </li>
            ))}
          </ol>
          <Group mt="md" grow>
            <Button
              onClick={() => {
                startRace();
              }}
            >
              Race again
            </Button>
            <Button variant="default" onClick={backToSetup}>
              Change settings
            </Button>
          </Group>
        </Modal>
      </div>
    </div>
  );
}
