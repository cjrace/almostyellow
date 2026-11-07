"use client";

import { useRef, useState } from "react";
import {
  Button,
  Group,
  Modal,
  Text,
  Title,
  VisuallyHidden,
} from "@mantine/core";
import { isWild, type Card, type Colour } from "@/unogame/engine/cards";
import type { PrivateView, PublicView } from "@/unogame/engine/views";
import { colourNames } from "@/unogame/cards";
import { UnoCard } from "@/components/unocard";
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
  const handSize = mine.hand.length;
  // After playing down to one card without saying it, Uno can still be said
  // until the next draw or play. With two cards it can be said in advance.
  const unoWindowMine = view.uno?.player === me;
  const canSayUno = unoWindowMine || (myTurn && handSize === 2 && !declareUno);
  const unoLabel = declareUno ? "Uno said" : "Say Uno!";
  const unoReason = unoWindowMine
    ? "Say it now, before anyone catches you."
    : declareUno
      ? "It will count when you play your next card."
      : handSize === 2 && myTurn
        ? "Say it before you play your second-last card, or right after."
        : "Saying Uno only matters when you play down to one card.";

  const play = (card: Card, colour?: Colour) => {
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
          <Button
            variant="default"
            style={{ flexShrink: 0 }}
            onClick={() => {
              setScoresOpen(true);
            }}
          >
            Scores
          </Button>
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
            <div className={styles.pile}>
              <button
                type="button"
                className={styles.pileButton}
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
            <div className={styles.pile}>
              <UnoCard card={view.top} />
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
            {catchable ? (
              <Button variant="default" onClick={onCatch}>
                Catch {names[catchable]} for Uno
              </Button>
            ) : null}
            {/* Stays focusable when it cannot be used, so its reason can be
                read; it is one-way, so it is a button and not a switch */}
            <Button
              variant="default"
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
          className={styles.reason}
        >
          {unoReason}
        </Text>

        <UnoHand
          cards={mine.hand}
          playableIds={mine.playableIds}
          drawnCardId={mine.drawnCardId}
          reason={cardReason}
          onPlay={(card) => {
            if (isWild(card)) setWild(card);
            else play(card);
          }}
        />
      </div>

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
