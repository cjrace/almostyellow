"use client";

import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Button,
  Chip,
  Drawer,
  Fieldset,
  Flex,
  Modal,
  Box,
  Text,
  Space,
  TextInput,
  NumberInput,
  SimpleGrid,
  Group,
  SegmentedControl,
  Stack,
  VisuallyHidden,
} from "@mantine/core";
import {
  IconQuestionMark,
  IconTrophy,
  IconDice1,
  IconDice2,
  IconDice3,
  IconDice4,
  IconDice5,
  IconDice6,
  IconCat,
  IconPig,
  IconBat,
  IconFlower,
} from "@tabler/icons-react";
import {
  PiDog,
  PiFishSimple,
  PiButterfly,
  PiCow,
  PiRabbit,
  PiShootingStar,
} from "react-icons/pi";
import playConfetti from "@/components/playconfetti";
import layout from "@/styles/snakesandladders.module.css";

interface IconSelectionProps {
  seat: number;
  selectedIcon: string;
  takenIcons: Set<string>; // Picked by the other players
  onChange: (value: string) => void;
}

interface Player {
  name: string;
  icon: string; // Empty while setting up until the player picks one
}

interface PlayerListProps {
  players: Player[];
  positions: number[];
  currentPlayer: number;
  roll: number | null; // The dice result while the current player moves
}

// Define the grid size
const GRID_SIZE = 10;

// Function to generate random positions for special spaces ensuring at least 3 spaces apart
const generateSpecialSpaces = () => {
  const allSpaces = Array.from(
    { length: GRID_SIZE * GRID_SIZE },
    (_, i) => i + 1,
  ).filter((pos) => pos !== 1 && pos !== 100);
  const specialSpaces = new Map<number, number>();

  const isValidSpace = (
    space: number,
    currentSpecialSpaces: Map<number, number>,
  ) => {
    for (const [key, value] of currentSpecialSpaces) {
      if (Math.abs(space - key) < 3 || Math.abs(space - value) < 3) {
        return false;
      }
    }
    return true;
  };

  const getRandomSpace = (currentSpecialSpaces: Map<number, number>) => {
    let validSpace;
    do {
      const randomIndex = Math.floor(Math.random() * allSpaces.length);
      validSpace = allSpaces.splice(randomIndex, 1)[0];
    } while (!isValidSpace(validSpace, currentSpecialSpaces));

    return validSpace;
  };

  // Generate snakes
  for (let i = 0; i < 7; i++) {
    let start, end;
    do {
      start = getRandomSpace(specialSpaces);
      end = getRandomSpace(specialSpaces);
    } while (Math.abs(start - end) < 3);
    specialSpaces.set(start, end);
  }

  // Generate ladders
  for (let i = 0; i < 8; i++) {
    let start, end;
    do {
      start = getRandomSpace(specialSpaces);
      end = getRandomSpace(specialSpaces);
    } while (Math.abs(start - end) < 3 || end === 100);
    specialSpaces.set(start, end);
  }

  return specialSpaces;
};

// One for each of the 10 players there can be, so nobody has to share
const icons = [
  { id: "cat", label: "Cat", component: <IconCat size={32} /> },
  { id: "dog", label: "Dog", component: <PiDog size={32} /> },
  { id: "fish", label: "Fish", component: <PiFishSimple size={32} /> },
  { id: "pig", label: "Pig", component: <IconPig size={32} /> },
  {
    id: "butterfly",
    label: "Butterfly",
    component: <PiButterfly size={32} />,
  },
  { id: "bat", label: "Bat", component: <IconBat size={32} /> },
  { id: "cow", label: "Cow", component: <PiCow size={32} /> },
  { id: "rabbit", label: "Rabbit", component: <PiRabbit size={32} /> },
  { id: "star", label: "Star", component: <PiShootingStar size={32} /> },
  { id: "flower", label: "Flower", component: <IconFlower size={32} /> },
];

// The icons players picked themselves, by seat. A pick made by a seat that was
// then removed and added back can clash, so the earlier seat keeps it
const pickedIcons = (players: Player[], numPlayers: number) => {
  const used = new Set<string>();
  return Array.from({ length: numPlayers }, (_, seat) => {
    const picked = players.at(seat)?.icon;
    if (!picked || used.has(picked)) return "";
    used.add(picked);
    return picked;
  });
};

// Each player's icon: the one they picked, or else the first one nobody has
// picked or been given, so every player starts with a different icon
const assignIcons = (players: Player[], numPlayers: number) => {
  const picked = pickedIcons(players, numPlayers);
  const used = new Set(picked);
  return picked.map((icon) => {
    if (icon) return icon;
    const free = icons.find((option) => !used.has(option.id))?.id ?? "cat";
    used.add(free);
    return free;
  });
};

// Chips in a group are radio buttons sharing a name, so it's one tab stop and
// the arrow keys pick an icon. Icons another player picked are disabled, and
// the arrow keys skip them
const IconSelection: React.FC<IconSelectionProps> = ({
  seat,
  selectedIcon,
  takenIcons,
  onChange,
}) => (
  <Fieldset
    variant="unstyled"
    legend={`Avatar for player ${(seat + 1).toString()}`}
    styles={{
      legend: {
        marginBottom: "var(--mantine-spacing-xs)",
        fontSize: "var(--mantine-font-size-xs)",
        color: "var(--mantine-color-dimmed)",
      },
    }}
  >
    <Chip.Group value={selectedIcon} onChange={onChange}>
      <Group gap="xs">
        {icons.map((icon) => (
          <Chip
            key={icon.id}
            name={`avatar-${seat.toString()}`}
            value={icon.id}
            disabled={takenIcons.has(icon.id)}
            color="orange"
            icon={null}
            wrapperProps={{ title: icon.label }}
            // A round 44px tap target holding just the icon
            styles={{
              label: {
                width: "2.75rem",
                height: "2.75rem",
                padding: 0,
                justifyContent: "center",
              },
            }}
          >
            <span aria-hidden style={{ display: "flex" }}>
              {icon.component}
            </span>
            <VisuallyHidden>{icon.label}</VisuallyHidden>
          </Chip>
        ))}
      </Group>
    </Chip.Group>
  </Fieldset>
);

// The space for the dice result is always there, so nothing moves when it shows
const RollBadge: React.FC<{ roll: number | null }> = ({ roll }) => (
  <Box className={layout.badgeSlot} aria-hidden>
    {roll !== null && (
      <Badge color="orange" variant="filled">
        +{roll}
      </Badge>
    )}
  </Box>
);

const PlayerList: React.FC<PlayerListProps> = ({
  players,
  currentPlayer,
  positions,
  roll,
}) => (
  <div>
    {players.map((player, index) => (
      <Group
        // Players are identified by their turn order, which never changes mid-game
        // eslint-disable-next-line @eslint-react/no-array-index-key
        key={index}
        aria-current={currentPlayer === index ? "step" : undefined}
        mb="xs"
        gap="sm"
        wrap="nowrap"
        style={{
          border:
            currentPlayer === index
              ? "2px solid orange"
              : "2px solid transparent",
          borderRadius: "8px",
          padding: "2px 4px",
        }}
      >
        {icons.find((icon) => icon.id === player.icon)?.component}
        <Text truncate style={{ flex: 1 }}>
          {player.name}
          <VisuallyHidden>
            {positions[index] ? "" : ", not on the board yet"}
            {currentPlayer === index ? " (your turn)" : ""}
          </VisuallyHidden>
        </Text>
        <Text size="sm" c="dimmed">
          {positions[index] ? `Square ${String(positions[index])}` : "Start"}
        </Text>
        <RollBadge roll={currentPlayer === index ? roll : null} />
      </Group>
    ))}
  </div>
);

const SnakesAndLadders = () => {
  const [playerPositions, setPlayerPositions] = useState<number[]>([]);
  const [players, setPlayers] = useState<{ name: string; icon: string }[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [specialMove, setSpecialMove] = useState<number | null>(null);
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [specialSpaces, setSpecialSpaces] = useState<Map<number, number>>(
    () => new Map(),
  );
  const [isRolling, setIsRolling] = useState(false);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [rollingDiceIcon, setRollingDiceIcon] = useState(<IconDice1 />);
  const [viewMode, setViewMode] = useState("names"); // "names" or "icons"
  const [playersOpened, setPlayersOpened] = useState(false); // Phones only

  // The buttons a keyboard user is on disappear or are disabled as the game
  // moves on, so put focus back where they can carry on playing
  const setupRef = useRef<HTMLInputElement>(null);
  const rollRef = useRef<HTMLButtonElement>(null);
  const backToSetupRef = useRef(false);

  useEffect(() => {
    if (gameInitialized && !isRolling && popupMessage === null) {
      rollRef.current?.focus();
    }
  }, [gameInitialized, isRolling, popupMessage]);

  useEffect(() => {
    if (!gameInitialized && backToSetupRef.current) {
      backToSetupRef.current = false;
      setupRef.current?.focus();
    }
  }, [gameInitialized]);

  const initializePlayers = () => {
    // Anyone left unnamed gets a default name, and everyone gets the icon the
    // form showed, without losing the names that were filled in
    const seatIcons = assignIcons(players, numPlayers);
    setPlayers(
      seatIcons.map((icon, i) => {
        const name = players.at(i)?.name.trim() ?? "";
        return {
          name: name === "" ? `Player ${(i + 1).toString()}` : name,
          icon,
        };
      }),
    );
    setSpecialSpaces(generateSpecialSpaces());
    setPlayerPositions(Array(numPlayers).fill(0));
    setGameInitialized(true); // Transition to the game view
  };

  const handlePlayerSetup = (index: number, name: string, icon: string) => {
    const newPlayers = [...players];
    newPlayers[index] = { name, icon };
    setPlayers(newPlayers);
  };

  const finalizeMove = (finalPosition: number) => {
    if (finalPosition === 100) {
      setWinner(currentPlayer);
      setPopupMessage(
        `Congratulations! ${players[currentPlayer]?.name} won the game!`,
      );
      playConfetti();
    }

    setPlayerPositions((prevPositions) => {
      const newPositions = [...prevPositions];
      newPositions[currentPlayer] = finalPosition;
      return newPositions;
    });

    setShowDiceResult(false); // Clear the previous dice result message

    setCurrentPlayer((prevPlayer) => (prevPlayer + 1) % playerPositions.length);
  };

  const cycleDiceIcons = () => {
    const diceIcons = [
      <IconDice1 key="dice1" />,
      <IconDice2 key="dice2" />,
      <IconDice3 key="dice3" />,
      <IconDice4 key="dice4" />,
      <IconDice5 key="dice5" />,
      <IconDice6 key="dice6" />,
    ];
    let count = 0;
    const intervalId = setInterval(() => {
      setRollingDiceIcon(diceIcons[count]);
      count = (count + 1) % diceIcons.length;
    }, 100); // Change icon every 100ms

    return intervalId;
  };

  const getDiceIcon = (result: number) => {
    switch (result) {
      case 1:
        return <IconDice1 />;
      case 2:
        return <IconDice2 />;
      case 3:
        return <IconDice3 />;
      case 4:
        return <IconDice4 />;
      case 5:
        return <IconDice5 />;
      case 6:
        return <IconDice6 />;
      default:
        return <IconDice1 />;
    }
  };

  const rollDice = () => {
    setIsRolling(true); // Start rolling animation
    setDiceResult(null); // Clear previous dice result
    setShowDiceResult(false); // Hide dice result

    const intervalId = cycleDiceIcons(); // Start cycling dice icons

    setTimeout(() => {
      const result = Math.floor(Math.random() * 6) + 1; // Roll a dice (1-6)
      setDiceResult(result);
      setShowDiceResult(true); // Show dice result
      clearInterval(intervalId); // Stop cycling dice icons
      setRollingDiceIcon(getDiceIcon(result)); // Set final dice icon

      setTimeout(() => {
        let stepsRemaining = result;
        let tempPosition = playerPositions[currentPlayer];

        const movePlayer = () => {
          if (stepsRemaining > 0) {
            stepsRemaining--;
            tempPosition = Math.min(tempPosition + 1, 100);

            setPlayerPositions((prevPositions) => {
              const newPositions = [...prevPositions];
              newPositions[currentPlayer] = tempPosition;
              return newPositions;
            });

            setTimeout(movePlayer, 300); // Continue moving with delay
          } else {
            // Handle snakes and ladders after the final position is reached
            const finalPosition = tempPosition;
            if (specialSpaces.has(finalPosition)) {
              const specialEnd = specialSpaces.get(finalPosition);
              if (typeof specialEnd === "number") {
                setSpecialMove(specialEnd);
                const moveType =
                  specialEnd < finalPosition ? "snake" : "ladder";
                const moveDifference = Math.abs(finalPosition - specialEnd);

                const message =
                  moveType === "snake"
                    ? `Oh no! ${players[currentPlayer]?.name} landed on a ${moveType} and slid down ${String(moveDifference)} spaces!`
                    : `Hooray! ${players[currentPlayer]?.name} landed on a ${moveType} and climbed up ${String(moveDifference)} spaces!`;

                setPopupMessage(message);
              } else {
                finalizeMove(finalPosition);
              }
            } else {
              finalizeMove(finalPosition);
            }

            setIsRolling(false); // Stop rolling animation
          }
        };

        movePlayer();
      }, 1000); // Delay before moving the player to show the dice result
    }, 1000); // Delay rolling the dice
  };

  const closePopup = () => {
    if (specialMove !== null) {
      finalizeMove(specialMove);
      setSpecialMove(null);
    }
    setPopupMessage(null);
  };

  const restartGame = () => {
    setPlayerPositions(Array(numPlayers).fill(0));
    setCurrentPlayer(0);
    setDiceResult(null);
    setPopupMessage(null);
    setWinner(null);
    setSpecialMove(null);

    // Reset players to default names and icons
    const defaultPlayers = Array.from({ length: numPlayers }, (_, i) => ({
      name: `Player ${(i + 1).toString()}`,
      icon: "", // Each gets a different icon again until they pick one
    }));
    setPlayers(defaultPlayers);

    backToSetupRef.current = true;
    setGameInitialized(false); // Reset to show initiation step };
  };

  if (!gameInitialized) {
    const picked = pickedIcons(players, numPlayers);
    const seatIcons = assignIcons(players, numPlayers);
    return (
      <Box maw="40rem">
        {/* Form to set up the players */}
        <NumberInput
          ref={setupRef}
          value={numPlayers}
          onChange={(value) => {
            setNumPlayers(Number(value) || 2);
          }}
          label="Number of Players"
          min={2}
          max={10}
          maw="12rem"
        />

        <Space h="xl" />

        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {Array.from({ length: numPlayers }, (_, seat) => seat).map((seat) => (
            <Stack key={seat} mb="sm" gap="xs">
              <TextInput
                label={`Name of player ${(seat + 1).toString()}:`}
                labelProps={{
                  style: {
                    margin: "0 0 0.75em 0",
                  },
                }}
                value={players[seat]?.name || ""}
                onChange={(event) => {
                  handlePlayerSetup(
                    seat,
                    event.currentTarget.value,
                    players.at(seat)?.icon ?? "",
                  );
                }}
              />
              <IconSelection
                seat={seat}
                selectedIcon={seatIcons[seat]}
                takenIcons={
                  new Set(
                    picked.filter((icon, other) => icon && other !== seat),
                  )
                }
                onChange={(icon) => {
                  handlePlayerSetup(seat, players.at(seat)?.name ?? "", icon);
                }}
              />
            </Stack>
          ))}
        </SimpleGrid>

        <Button onClick={initializePlayers} fullWidth mt="md">
          Start game!
        </Button>
      </Box>
    );
  }

  const roll = showDiceResult ? diceResult : null;
  const current = players.at(currentPlayer); // Undefined until set up

  const restartFromDrawer = () => {
    setPlayersOpened(false);
    restartGame();
  };

  // The game fills the screen and never scrolls. Phones put the board above
  // the current player, with everyone else in a drawer. Wider screens list
  // every player beside the board
  return (
    <div className={layout.space}>
      <div className={layout.game}>
        {/* Said out loud, as the badge only shows the number */}
        <VisuallyHidden role="status">
          {roll !== null && current
            ? `${current.name} moves ${String(roll)} ${roll === 1 ? "place" : "places"}`
            : ""}
        </VisuallyHidden>

        <Stack gap="sm" className={layout.controls}>
          <Box visibleFrom="sm" className={layout.playerList}>
            <PlayerList
              players={players}
              currentPlayer={currentPlayer}
              positions={playerPositions}
              roll={roll}
            />
          </Box>

          <Group hiddenFrom="sm" gap="sm" wrap="nowrap" data-testid="turn">
            {icons.find((icon) => icon.id === current?.icon)?.component}
            <Text fw={700} truncate style={{ flex: 1 }}>
              {current?.name}&apos;s turn
            </Text>
            <RollBadge roll={roll} />
          </Group>

          <Flex direction={{ base: "row", sm: "column" }} gap="sm">
            <Button
              ref={rollRef}
              onClick={rollDice}
              flex={{ base: 1, sm: "none" }}
              disabled={!!winner || playerPositions.length === 0 || isRolling}
            >
              {isRolling
                ? rollingDiceIcon
                : `Roll Dice (${current?.name ?? ""})`}
            </Button>
            <Button
              hiddenFrom="sm"
              variant="default"
              onClick={() => {
                setPlayersOpened(true);
              }}
            >
              Players
            </Button>
            <Button visibleFrom="sm" variant="default" onClick={restartGame}>
              Restart Game
            </Button>
          </Flex>
        </Stack>

        <Drawer
          opened={playersOpened}
          onClose={() => {
            setPlayersOpened(false);
          }}
          position="bottom"
          size="auto"
          title="Players"
          hiddenFrom="sm"
        >
          <PlayerList
            players={players}
            currentPlayer={currentPlayer}
            positions={playerPositions}
            roll={roll}
          />
          <Button
            onClick={restartFromDrawer}
            fullWidth
            mt="md"
            variant="default"
          >
            Restart Game
          </Button>
        </Drawer>

        <div className={layout.boardArea}>
          <SegmentedControl
            value={viewMode}
            color="orange"
            onChange={setViewMode}
            data={[
              { label: "Show Names", value: "names" },
              { label: "Show Icons", value: "icons" },
            ]}
            className={layout.viewMode}
          />

          <div className={layout.table}>
            <div className={layout.board} data-testid="board">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const pos = index + 1;
                const playerAtPos = playerPositions.findIndex(
                  (playerPos) => playerPos === pos,
                );
                return (
                  <div key={pos} className={layout.cell}>
                    {playerAtPos !== -1 &&
                      (viewMode === "names" ? (
                        <span>{players[playerAtPos]?.name}</span>
                      ) : (
                        icons.find(
                          (icon) => icon.id === players[playerAtPos]?.icon,
                        )?.component
                      ))}
                    {specialSpaces.has(pos) && <IconQuestionMark size={24} />}
                    {pos === 100 && <IconTrophy size={24} color="gold" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Modal
          opened={!!popupMessage}
          onClose={closePopup}
          title="Game Update"
          closeButtonProps={{ "aria-label": "Close" }}
        >
          {popupMessage}
          {winner !== null && (
            <Button onClick={restartGame} fullWidth mt="md">
              Restart Game
            </Button>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default SnakesAndLadders;
