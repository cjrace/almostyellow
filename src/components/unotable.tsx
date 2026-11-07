"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconInfoCircle } from "@tabler/icons-react";
import {
  ActionIcon,
  Button,
  Group,
  Modal,
  Text,
  Title,
  Tooltip,
  VisuallyHidden,
} from "@mantine/core";
import { isWild, type Card, type Colour } from "@/unogame/engine/cards";
import type {
  PrivateView,
  PublicEvent,
  PublicView,
} from "@/unogame/engine/views";
import { tableAlerts, type TableAlert } from "@/unogame/alerts";
import { colourNames } from "@/unogame/cards";
import { UnoCard } from "@/components/unocard";
import {
  DrawReveal,
  FlyingCard,
  reducedMotion,
  UnoAlert,
} from "@/components/unoeffects";
import UnoColourPicker from "@/components/unocolourpicker";
import UnoHand from "@/components/unohand";
import UnoOpponents from "@/components/unoopponents";
import UnoScoreboard from "@/components/unoscoreboard";
import layout from "@/styles/cardgame.module.css";
import styles from "@/styles/unotable.module.css";

interface UnoTableProps {
  view: PublicView;
  mine: PrivateView;
  me: string;
  names: Record<string, string>;
  scores: Record<string, number>;
  // Read out by screen readers whenever it changes
  announcement: string;
  // What the latest move did, for the pop-ups. The version says when it is new.
  events: PublicEvent[];
  version: number;
  // The clock, so the catch button can wait out the protected time
  now: number;
  onInstructions: () => void;
  onPlay: (
    cardId: number,
    colour: Colour | undefined,
    declareUno: boolean,
  ) => void;
  onDraw: () => void;
  onKeep: () => void;
  onCatch: () => void;
  // Says Uno after playing down to one card, while the window is open
  onSayUno: () => void;
}

// The table for one round. It shows a published view and reports what the
// player chooses; it never changes the game itself.
export default function UnoTable({
  view,
  mine,
  me,
  names,
  scores,
  announcement,
  events,
  version,
  now,
  onInstructions,
  onPlay,
  onDraw,
  onKeep,
  onCatch,
  onSayUno,
}: UnoTableProps) {
  const [wild, setWild] = useState<Card | null>(null);
  // Uno said before playing the second-last card, sent with that play
  const [declareUno, setDeclareUno] = useState(false);
  const [scoresOpen, setScoresOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [flight, setFlight] = useState<{ card: Card; from: DOMRect } | null>(
    null,
  );
  const [reveals, setReveals] = useState<Card[]>([]);
  const [alerts, setAlerts] = useState<TableAlert[] | null>(null);
  const seenVersionRef = useRef<number | null>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const handIdsRef = useRef<Set<number> | null>(null);

  // Pop-ups for the latest move, but not for whatever was already there when
  // this page opened
  useEffect(() => {
    if (seenVersionRef.current === null || seenVersionRef.current === version) {
      seenVersionRef.current = version;
      return;
    }
    seenVersionRef.current = version;
    const next = tableAlerts(events, names, me);
    if (!next.length) return;
    clearTimeout(alertTimerRef.current);
    queueMicrotask(() => {
      setAlerts(next);
    });
    alertTimerRef.current = setTimeout(() => {
      setAlerts(null);
    }, 2200);
  }, [version, events, names, me]);
  useEffect(
    () => () => {
      clearTimeout(alertTimerRef.current);
    },
    [],
  );

  // Cards that arrive in your hand after the deal are drawn, so they are
  // turned over one at a time
  useEffect(() => {
    const ids = new Set(mine.hand.map((c) => c.id));
    const before = handIdsRef.current;
    handIdsRef.current = ids;
    if (!before || before.size === 0 || reducedMotion()) return;
    const added = mine.hand.filter((c) => !before.has(c.id));
    if (added.length === 0 || added.length > 4) return;
    queueMicrotask(() => {
      setReveals((current) => [...current, ...added]);
    });
  }, [mine.hand]);
  const revealed = useCallback(() => {
    setReveals((current) => current.slice(1));
  }, []);
  const landed = useCallback(() => {
    setFlight(null);
  }, []);

  const playing = view.phase === "playing";
  const myTurn = playing && view.currentPlayer === me;
  const heading = !playing
    ? view.outcome?.type === "win"
      ? view.outcome.winner === me
        ? "You won the round"
        : `${names[view.outcome.winner]} won the round`
      : view.outcome?.type === "abandoned"
        ? "The host ended the round"
        : "Nobody can move, so nobody wins"
    : myTurn
      ? "Your turn"
      : `${names[view.currentPlayer]}'s turn`;

  const cardReason = !playing
    ? "the round is over"
    : !myTurn
      ? "not your turn"
      : view.drawPending
        ? "play the card you drew, or keep it"
        : "does not match the top card";
  const drawReason = !playing
    ? "The round is over."
    : !myTurn
      ? `Waiting for ${names[view.currentPlayer]} to play.`
      : view.drawPending
        ? "Play the card you drew, or keep it."
        : "";
  const canDraw = drawReason === "";
  // Nothing in your hand can be played, so the only move is to draw
  const mustDraw =
    canDraw && !view.drawPending && mine.playableIds.length === 0;

  const order = view.players.map((p) => p.id);
  const mineAt = order.indexOf(me);
  const others = [...order.slice(mineAt + 1), ...order.slice(0, mineAt)].map(
    (id) => ({
      id,
      name: names[id],
      cards: view.players.find((p) => p.id === id)?.cards ?? 0,
    }),
  );
  const catchable = view.uno && view.uno.player !== me ? view.uno.player : null;
  // Catching only works once the player's protected time is up
  const canCatch = !!view.uno && !!catchable && now >= view.uno.protectedUntil;
  const handSize = mine.hand.length;
  // After playing down to one card without saying it, Uno can still be said
  // until the next draw or play. With two cards it can be said in advance.
  const unoWindowMine = view.uno?.player === me;
  const canSayUno = unoWindowMine || (myTurn && handSize === 2 && !declareUno);
  // Saying Uno matters right now
  const unoReady = canSayUno && !declareUno;
  const unoLabel = declareUno ? "Uno said" : "Say Uno!";
  const unoReason = unoWindowMine
    ? "Say it now, before anyone catches you."
    : declareUno
      ? "It will count when you play your next card."
      : handSize === 2 && myTurn
        ? "Say it before you play your second-last card, or right after."
        : "Saying Uno only matters when you play down to one card.";

  const play = (card: Card, colour?: Colour) => {
    const from = document
      .querySelector(`[data-uno-card="${String(card.id)}"]`)
      ?.getBoundingClientRect();
    if (from && !reducedMotion()) setFlight({ card, from });
    onPlay(card.id, colour, declareUno);
    setDeclareUno(false);
    setWild(null);
    headingRef.current?.focus();
  };

  return (
    <div className={layout.game}>
      <div className={styles.board}>
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          className={styles.head}
        >
          <div style={{ minWidth: 0 }}>
            <Title
              order={2}
              size="h3"
              ref={headingRef}
              tabIndex={-1}
              className={styles.heading}
              data-myturn={myTurn ? "" : undefined}
              data-waiting={playing && !myTurn ? "" : undefined}
            >
              {heading}
            </Title>
            <Text c="dimmed">
              Colour<span className={styles.inPlay}> in play</span>:{" "}
              <span
                className={styles.swatch}
                data-colour={view.colour}
                aria-hidden="true"
              />{" "}
              {colourNames[view.colour]}
              {" · "}
              {view.direction === 1 ? "clockwise" : "anticlockwise"}
            </Text>
          </div>
          <Group gap={4} wrap="nowrap" style={{ flexShrink: 0 }}>
            <Tooltip label="Game instructions" openDelay={250} position="left">
              <ActionIcon
                variant="subtle"
                size="lg"
                aria-label="Open game instructions modal"
                onClick={onInstructions}
              >
                <IconInfoCircle />
              </ActionIcon>
            </Tooltip>
            <Button
              variant="default"
              size="compact-sm"
              onClick={() => {
                setScoresOpen(true);
              }}
            >
              Scores
            </Button>
          </Group>
        </Group>

        <VisuallyHidden>
          <div role="status">{announcement}</div>
        </VisuallyHidden>

        <UnoOpponents
          players={others}
          currentPlayer={view.currentPlayer}
          unoPlayer={catchable}
        />

        <div className={styles.table}>
          <div className={styles.piles}>
            <div className={styles.pile} data-uno-pile="draw">
              <button
                type="button"
                className={styles.pileButton}
                data-attention={mustDraw ? "" : undefined}
                aria-disabled={!canDraw}
                aria-label={`Draw pile, ${String(view.stockCount)} cards${canDraw ? ", draw a card" : ""}`}
                aria-describedby={canDraw ? undefined : "uno_draw_reason"}
                onClick={() => {
                  if (canDraw) onDraw();
                }}
              >
                <UnoCard card={null} decorative />
              </button>
              <span className={styles.count} aria-hidden="true">
                {view.stockCount}
              </span>
            </div>
            <div className={styles.pile} data-uno-pile="discard">
              <div className={styles.landed} key={view.top.id}>
                <UnoCard card={view.top} />
              </div>
              {/* The colour in play, as a shape as well as a colour, so it can be
                  seen at a glance after a wild */}
              <span
                className={`${styles.swatch} ${styles.pileSwatch}`}
                data-colour={view.colour}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        {wild ? (
          <UnoColourPicker
            onChoose={(colour) => {
              play(wild, colour);
            }}
            onCancel={() => {
              setWild(null);
              headingRef.current?.focus();
            }}
          />
        ) : (
          <div className={styles.controls}>
            {view.drawPending ? (
              <Button variant="default" disabled={!myTurn} onClick={onKeep}>
                Keep the card I drew
              </Button>
            ) : null}
            {canCatch && catchable ? (
              <Button variant="default" onClick={onCatch}>
                Call out {names[catchable]} for not saying Uno
              </Button>
            ) : null}
            {/* Stays focusable when it cannot be used, so its reason can be
                read; it is one-way, so it is a button and not a switch */}
            <Button
              variant={unoReady ? "filled" : "default"}
              data-ready={unoReady ? "" : undefined}
              aria-disabled={!canSayUno}
              data-disabled={!canSayUno || undefined}
              aria-describedby="uno_declare_reason"
              onClick={() => {
                if (!canSayUno) return;
                if (unoWindowMine) onSayUno();
                else setDeclareUno(true);
              }}
            >
              {unoLabel}
            </Button>
          </div>
        )}
        <Text
          size="sm"
          c="dimmed"
          id="uno_draw_reason"
          className={styles.reason}
        >
          {drawReason}
        </Text>
        <Text
          size="sm"
          c="dimmed"
          id="uno_declare_reason"
          className={`${styles.reason} ${styles.visuallyHidden}`}
        >
          {unoReason}
        </Text>

        <UnoHand
          cards={mine.hand}
          playableIds={mine.playableIds}
          drawnCardId={mine.drawnCardId}
          reason={cardReason}
          active={myTurn}
          onPlay={(card) => {
            if (isWild(card)) setWild(card);
            else play(card);
          }}
        />
      </div>

      {alerts ? (
        <UnoAlert
          alerts={alerts}
          onDismiss={() => {
            clearTimeout(alertTimerRef.current);
            setAlerts(null);
          }}
        />
      ) : null}
      {flight ? (
        <FlyingCard card={flight.card} from={flight.from} onDone={landed} />
      ) : null}
      {reveals[0] ? (
        <DrawReveal key={reveals[0].id} card={reveals[0]} onDone={revealed} />
      ) : null}

      <Modal.Root
        opened={scoresOpen}
        onClose={() => {
          setScoresOpen(false);
        }}
        centered
      >
        <Modal.Overlay backgroundOpacity={0.75} blur={3} />
        <Modal.Content aria-label="Scores">
          <Modal.Body>
            <UnoScoreboard
              players={order.map((id) => ({
                id,
                name: names[id],
                wins: scores[id] ?? 0,
              }))}
            />
            <Button
              variant="subtle"
              mt="md"
              onClick={() => {
                setScoresOpen(false);
              }}
            >
              Close scores
            </Button>
          </Modal.Body>
        </Modal.Content>
      </Modal.Root>
    </div>
  );
}
