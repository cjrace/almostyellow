"use client";

import { useReducer, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Grid,
  Group,
  List,
  Modal,
  Radio,
  Space,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import {
  Card,
  createCardDeck,
  shuffleDeck,
  SuitNames,
} from "@/components/carddeck";
import CardGameTitle from "@/components/cardgametitle";
import PlayingCard, { usePreloadCards } from "@/components/playingcard";
import {
  chooseSuit,
  currentPlayer,
  describeResult,
  initialSuitsState,
  isFinalTurn,
  isUnfinished,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nextPlayer,
  replay,
  reveal,
  startGame,
  SuitsState,
  TOTAL_TURNS,
} from "@/components/suitsgame";
import styles from "@/styles/playingcard.module.css";

const suitSymbols: Record<string, string> = {
  Hearts: "♥",
  Diamonds: "♦",
  Clubs: "♣",
  Spades: "♠",
};

// Decks are shuffled in the click handlers so the reducer stays pure
type SuitsAction =
  | { type: "start"; players: string[]; deck: Card[] }
  | { type: "choose"; suit: string }
  | { type: "reveal" }
  | { type: "next" }
  | { type: "replay"; deck: Card[] }
  | { type: "changePlayers" };

function suitsReducer(state: SuitsState, action: SuitsAction): SuitsState {
  switch (action.type) {
    case "start":
      return startGame(action.players, action.deck);
    case "choose":
      return chooseSuit(state, action.suit);
    case "reveal":
      return reveal(state);
    case "next":
      return nextPlayer(state);
    case "replay":
      return replay(state, action.deck);
    case "changePlayers":
      return initialSuitsState;
  }
}

const newDeck = () => shuffleDeck(createCardDeck());

// Each setup row has an id so React keeps the right input when one is removed
interface PlayerRow {
  id: number;
  name: string;
}

const toRows = (names: string[]): PlayerRow[] =>
  names.map((name, index) => ({ id: index, name }));

export default function Suits() {
  usePreloadCards();
  const [state, dispatch] = useReducer(suitsReducer, initialSuitsState);
  const [rows, setRows] = useState<PlayerRow[]>(() => toRows(["", ""]));
  const [confirmOpened, setConfirmOpened] = useState(false);

  const changePlayers = () => {
    setRows(toRows(state.players));
    dispatch({ type: "changePlayers" });
    setConfirmOpened(false);
  };

  return (
    <Grid>
      <Grid.Col span={12}>
        <CardGameTitle title="Suits">
          <Text mb="sm">
            Another of Ben&apos;s games from university, for 2 to 13 players
            sharing one phone.
          </Text>
          <List variant="ordered" mb="md">
            <List.Item>
              on your turn, pick a suit and reveal four cards
            </List.Item>
            <List.Item>
              if any cards match your suit, hand out drinks to the other
              players: one for each match, for each other player
            </List.Item>
            <List.Item>
              if nothing matches, drink two for each other player
            </List.Item>
            <List.Item>
              the game lasts {TOTAL_TURNS} turns, using the whole deck
            </List.Item>
            <List.Item>the final turn counts double</List.Item>
          </List>
          <Text>
            For example, with 4 players, matching 2 cards means handing out 6
            drinks, and matching none means drinking 6.
          </Text>
        </CardGameTitle>
      </Grid.Col>

      <Space h="xl" />

      <Grid.Col span={12}>
        {state.phase === "setup" ? (
          <PlayerSetup
            rows={rows}
            setRows={setRows}
            onStart={() => {
              dispatch({
                type: "start",
                players: rows.map((row) => row.name),
                deck: newDeck(),
              });
            }}
          />
        ) : (
          <Stack maw={560} mx="auto">
            <Group justify="space-between">
              <Title order={2} size="h3" id="suits_turn">
                {state.phase === "complete"
                  ? "Game over"
                  : `${currentPlayer(state)}'s turn`}
              </Title>
              <Text c="dimmed" id="suits_turn_count">
                Turn {Math.min(state.turn + 1, TOTAL_TURNS)} of {TOTAL_TURNS}
              </Text>
            </Group>

            {state.phase === "guessing" && isFinalTurn(state) && (
              <Alert color="orange" title="Final turn">
                This turn counts double.
              </Alert>
            )}

            {state.phase === "guessing" ? (
              <Radio.Group
                label="Choose a suit"
                value={state.chosenSuit}
                onChange={(suit) => {
                  dispatch({ type: "choose", suit });
                }}
              >
                <Group mt="xs">
                  {SuitNames.map((suit) => (
                    <Radio
                      key={suit}
                      value={suit}
                      label={`${suitSymbols[suit]} ${suit}`}
                    />
                  ))}
                </Group>
              </Radio.Group>
            ) : (
              // The guess is locked in once the cards are showing
              <Text id="suits_chosen">
                {currentPlayer(state)} picked{" "}
                {state.chosenSuit &&
                  `${suitSymbols[state.chosenSuit]} ${state.chosenSuit}`}
              </Text>
            )}

            <div className={styles.row}>
              {[0, 1, 2, 3].map((index) => (
                <PlayingCard key={index} card={state.revealed[index] ?? null} />
              ))}
            </div>

            <Text
              aria-live="polite"
              id="suits_result"
              fw={500}
              ta="center"
              mih="1.5em"
            >
              {state.result &&
                describeResult(currentPlayer(state), state.result)}
            </Text>

            {state.phase === "guessing" && (
              <Button
                disabled={state.chosenSuit === null}
                onClick={() => {
                  dispatch({ type: "reveal" });
                }}
              >
                Reveal four cards
              </Button>
            )}

            {state.phase === "revealed" && (
              <Button
                onClick={() => {
                  dispatch({ type: "next" });
                }}
              >
                Next player
              </Button>
            )}

            {state.phase === "complete" && (
              <>
                <Alert color="orange" title="That's the whole deck">
                  All {TOTAL_TURNS} turns have been played.
                </Alert>
                <Button
                  onClick={() => {
                    dispatch({ type: "replay", deck: newDeck() });
                  }}
                >
                  Play again
                </Button>
              </>
            )}

            <Button
              variant="default"
              onClick={() => {
                if (isUnfinished(state)) {
                  setConfirmOpened(true);
                } else {
                  changePlayers();
                }
              }}
            >
              Change players
            </Button>
          </Stack>
        )}
      </Grid.Col>

      <Modal
        opened={confirmOpened}
        onClose={() => {
          setConfirmOpened(false);
        }}
        title="End this game?"
        closeButtonProps={{ "aria-label": "Close modal" }}
      >
        <Text mb="md">
          The game isn&apos;t finished. Changing players will start over.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="default"
            onClick={() => {
              setConfirmOpened(false);
            }}
          >
            Keep playing
          </Button>
          <Button onClick={changePlayers}>End game</Button>
        </Group>
      </Modal>
    </Grid>
  );
}

interface PlayerSetupProps {
  rows: PlayerRow[];
  setRows: (rows: PlayerRow[]) => void;
  onStart: () => void;
}

function PlayerSetup({ rows, setRows, onStart }: PlayerSetupProps) {
  return (
    <Stack maw={420} mx="auto">
      <Title order={2} size="h3">
        Who&apos;s playing?
      </Title>
      <Text c="dimmed">
        Players take turns in this order. Names are optional.
      </Text>

      {rows.map((row, index) => {
        const label = `Player ${(index + 1).toString()}`;
        return (
          <Group key={row.id} gap="xs" align="flex-end" wrap="nowrap">
            <TextInput
              style={{ flex: 1 }}
              label={`${label} name`}
              placeholder={label}
              value={row.name}
              maxLength={30}
              onChange={(event) => {
                const name = event.currentTarget.value;
                setRows(
                  rows.map((r) => (r.id === row.id ? { ...r, name } : r)),
                );
              }}
            />
            <ActionIcon
              variant="default"
              size="lg"
              mb={2}
              aria-label={`Remove ${label}`}
              disabled={rows.length <= MIN_PLAYERS}
              onClick={() => {
                setRows(rows.filter((r) => r.id !== row.id));
              }}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Group>
        );
      })}

      <Button
        variant="default"
        leftSection={<IconPlus size={18} />}
        disabled={rows.length >= MAX_PLAYERS}
        onClick={() => {
          const id = Math.max(...rows.map((r) => r.id)) + 1;
          setRows([...rows, { id, name: "" }]);
        }}
      >
        Add player
      </Button>
      {rows.length >= MAX_PLAYERS && (
        <Text size="sm" c="dimmed">
          {MAX_PLAYERS} players is the most a deck allows.
        </Text>
      )}
      <Button onClick={onStart}>Start game</Button>
    </Stack>
  );
}
