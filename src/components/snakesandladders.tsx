"use client";

import { useState, useEffect } from "react";
import {
  Grid,
  Button,
  Modal,
  Box,
  Text,
  Space,
  TextInput,
  NumberInput,
  SimpleGrid,
  Avatar,
  Group,
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
  IconUser,
} from "@tabler/icons-react";

// Define the grid size
const GRID_SIZE = 10;

// Function to generate random positions for special spaces ensuring at least 3 spaces apart
const generateSpecialSpaces = () => {
  const allSpaces = Array.from(
    { length: GRID_SIZE * GRID_SIZE },
    (_, i) => i + 1,
  ).filter((pos) => pos !== 1 && pos !== 100);
  const specialSpaces = new Map<number, number>();

  const isValidSpace = (space: number, currentSpecialSpaces: any) => {
    for (let [key, value] of currentSpecialSpaces) {
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

const SnakesAndLadders = () => {
  const [playerPositions, setPlayerPositions] = useState<number[]>([]);
  const [playerNames, setPlayerNames] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<number>(0);
  const [diceResult, setDiceResult] = useState<number | null>(null);
  const [popupMessage, setPopupMessage] = useState<string | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [specialMove, setSpecialMove] = useState<number | null>(null);
  const [numPlayers, setNumPlayers] = useState<number>(2);
  const [specialSpaces, setSpecialSpaces] = useState<Map<number, number>>(
    new Map(),
  );
  const [isRolling, setIsRolling] = useState(false);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false);
  const [rollingDiceIcon, setRollingDiceIcon] = useState(<IconDice1 />);

  useEffect(() => {
    setSpecialSpaces(generateSpecialSpaces());
  }, []);

  const initializePlayers = () => {
    if (playerNames.length === 0) {
      const defaultPlayerNames = Array.from(
        { length: numPlayers },
        (_, i) => `Player ${i + 1}`,
      );
      setPlayerNames(defaultPlayerNames);
    }
    setPlayerPositions(Array(numPlayers).fill(0));
    setGameInitialized(true); // Transition to the game view
  };

  const handleNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name;
    setPlayerNames(newNames);
  };

  const avatars = [
    "/images/avatar1.png",
    "/images/avatar2.png",
    "/images/avatar3.png",
    "/images/avatar4.png",
    // Add more avatar paths as needed
  ];

  const PlayerList = ({ playerNames, avatars }) => (
    <div>
      <Text size="xl" ta="center" mb="md">
        Players
      </Text>
      {playerNames.map((name, index) => (
        <Group key={index} mb="sm" noWrap>
          <Avatar
            src={avatars[index % avatars.length]}
            alt={name}
            radius="xl"
          />
          <Text>{name}</Text>
        </Group>
      ))}
    </div>
  );

  const finalizeMove = (finalPosition: number) => {
    if (finalPosition === 100) {
      setWinner(currentPlayer);
      setPopupMessage(
        `Congratulations! ${playerNames[currentPlayer]} won the game!`,
      );
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
            let finalPosition = tempPosition;
            if (specialSpaces.has(finalPosition)) {
              const specialEnd = specialSpaces.get(finalPosition)!;
              setSpecialMove(specialEnd);
              const moveType = specialEnd < finalPosition ? "snake" : "ladder";
              const moveDifference = Math.abs(finalPosition - specialEnd);
              setPopupMessage(
                `Oops! ${playerNames[currentPlayer]} landed on a ${moveType} and moved ${moveDifference} spaces!`,
              );
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
    setSpecialSpaces(generateSpecialSpaces());
    setCurrentPlayer(0);
    setDiceResult(null);
    setPopupMessage(null);
    setWinner(null);
    setSpecialMove(null);
    setPlayerNames(
      Array.from({ length: numPlayers }, (_, i) => `Player ${i + 1}`),
    ); // Reset player names
    setGameInitialized(false); // Reset to show initiation step
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      <Box>
        {!gameInitialized && (
          <>
            {/* Form to set up the players */}
            <NumberInput
              value={numPlayers}
              onChange={(value) => setNumPlayers(Number(value) || 2)}
              label="Number of Players"
              min={2}
              max={10}
            />

            {Array.from({ length: numPlayers }).map((_, index) => (
              <TextInput
                key={index}
                value={playerNames[index] || ""}
                onChange={(event) =>
                  handleNameChange(index, event.currentTarget.value)
                }
                label={`Player ${index + 1} Name`}
              />
            ))}

            <Button onClick={initializePlayers} mt="sm">
              Start game!
            </Button>
          </>
        )}

        {gameInitialized && (
          <Box>
            <PlayerList playerNames={playerNames} avatars={avatars} />

            <Space h="md" />

            <Text size="xl" ta="center" mb="md">
              {playerNames[currentPlayer]}&apos;s turn
            </Text>

            <Space h="md" />

            <Button
              onClick={rollDice}
              fullWidth
              mt="md"
              w="50%"
              disabled={!!winner || playerPositions.length === 0 || isRolling}
            >
              {isRolling ? rollingDiceIcon : "Roll Dice"}
            </Button>

            <Space h="md" />

            {showDiceResult && diceResult && (
              <Text ta="center" mt="md">
                {playerNames[currentPlayer]} moves {diceResult} places!
              </Text>
            )}

            <Space h="md" />

            <Button onClick={restartGame} w="50%" mt="md">
              Restart Game
            </Button>
          </Box>
        )}
      </Box>

      <Box>
        {gameInitialized && (
          <>
            <Space h="md" />

            <Space h="xl" />

            <Grid columns={10}>
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                const pos = index + 1;
                const playerAtPos = playerPositions.findIndex(
                  (playerPos) => playerPos === pos,
                );
                return (
                  <Grid.Col
                    span={1}
                    key={pos}
                    style={{
                      border: "1px solid #ddd",
                      height: "50px",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {playerAtPos !== -1 && (
                      <Text>{playerNames[playerAtPos]}</Text>
                    )}
                    {specialSpaces.has(pos) && <IconQuestionMark size={24} />}
                    {pos === 100 && <IconTrophy size={24} color="gold" />}
                  </Grid.Col>
                );
              })}
            </Grid>

            <Space h="md" />

            <Modal
              opened={!!popupMessage}
              onClose={closePopup}
              title="Game Update"
            >
              {popupMessage}
              {winner !== null && (
                <Button onClick={restartGame} fullWidth mt="md">
                  Restart Game
                </Button>
              )}
            </Modal>
          </>
        )}
      </Box>
    </SimpleGrid>
  );
};

export default SnakesAndLadders;
