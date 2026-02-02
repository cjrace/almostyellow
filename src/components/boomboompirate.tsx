"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Grid,
  Modal,
  Text,
  NumberInput,
  Stack,
  Space,
} from "@mantine/core";
import {
  IconBomb,
  IconSquare,
  IconSquareCheck,
  IconSquareX,
} from "@tabler/icons-react";
import styles from "@/styles/boomboom.module.css";
import { JSX } from "react";

const generateRandomRope = (totalRopes: number) => {
  return Math.floor(Math.random() * totalRopes);
};

const generateRandomPosition = () => {
  const top = Math.floor(Math.random() * 100);
  const left = Math.floor(Math.random() * 100);
  return { top, left };
};

const BoomBoomPirate = () => {
  const [totalRopes, setTotalRopes] = useState(20); // Default number of ropes
  const [explosionRope, setExplosionRope] = useState(
    generateRandomRope(totalRopes),
  );
  const [loadingRope, setLoadingRope] = useState<number | null>(null);
  const [ropeStates, setRopeStates] = useState<Record<number, string>>({});
  const [isExplosion, setIsExplosion] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<JSX.Element | null>(null);
  const [showExplosions, setShowExplosions] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false); // New state for game initialization

  const ropeIcons = [
    <IconSquare key="square" />,
    <IconSquareCheck key="check" />,
    <IconSquareX key="x" />,
  ];

  const cycleIcons = () => {
    let count = 0;
    const intervalId = setInterval(() => {
      setCurrentIcon(ropeIcons[count]);
      count = (count + 1) % ropeIcons.length;
    }, 100); // Change icon every 100ms

    return intervalId;
  };

  const handleRopePull = (index: number) => {
    if (ropeStates[index]) return; // Skip if already clicked

    setLoadingRope(index);
    const intervalId = cycleIcons(); // Start cycling icons

    setTimeout(() => {
      clearInterval(intervalId); // Stop cycling icons
      if (index === explosionRope) {
        setIsExplosion(true);
        setRopeStates((prevState) => ({ ...prevState, [index]: "red" }));
        setShowExplosions(true); // Show explosion animation
        setTimeout(() => {
          setShowExplosions(false);
          setIsExplosion(true); // Show modal after explosions
        }, 1500); // Hide explosion after animation
      } else {
        setRopeStates((prevState) => ({ ...prevState, [index]: "green" }));
      }
      setLoadingRope(null);
      setCurrentIcon(null);
    }, 2000); // Simulate loading state for 2 seconds
  };

  const closeModal = () => {
    setIsExplosion(false);
  };

  const restartGame = () => {
    setGameInitialized(false); // Go back to initiation page
    setExplosionRope(generateRandomRope(totalRopes)); // Generate a new random rope for explosion
    setLoadingRope(null);
    setRopeStates({});
    setIsExplosion(false);
    setCurrentIcon(null);
  };

  const startGame = () => {
    setExplosionRope(generateRandomRope(totalRopes));
    setGameInitialized(true);
  };

  return (
    <Box p="md" style={{ position: "relative" }}>
      {!gameInitialized ? (
        <Stack align="center">
          <NumberInput
            value={totalRopes}
            onChange={(value) => {
              if (typeof value === "number") {
                setTotalRopes(value);
              }
            }}
            min={5}
            max={50}
            size="xl"
            label="Number of ropes"
            description="Choose between 5 and 50"
          />
          <Button onClick={startGame} mt="md" size="lg">
            Start Game
          </Button>
        </Stack>
      ) : (
        <>
          <Grid>
            {Array.from({ length: totalRopes }).map((_, index) => (
              <Grid.Col span={2} key={index}>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    handleRopePull(index);
                  }}
                  color={ropeStates[index] || "blue"}
                  disabled={loadingRope !== null}
                >
                  {loadingRope === index
                    ? (currentIcon ?? "Loading...")
                    : `Rope ${(index + 1).toString()}`}
                </Button>
              </Grid.Col>
            ))}
          </Grid>

          <Space h="xl" />

          <Button onClick={restartGame} color="red">
            Restart Game
          </Button>

          <Modal
            opened={isExplosion}
            onClose={closeModal}
            withCloseButton={false}
          >
            <Stack align="stretch" justify="center" gap="md">
              <IconBomb size={48} color="red" />
              <Text size="lg" fw={700} ta="center" mt="sm">
                BOOOM!
              </Text>
              <Text size="lg" ta="center" mt="sm">
                Uh-oh! You found the pirate&apos;s trap!
              </Text>
              <Space h="md" />
              <Button onClick={restartGame}>Restart Game</Button>
              <Button fullWidth mt="md" variant="default" onClick={closeModal}>
                Close
              </Button>
            </Stack>
          </Modal>

          {showExplosions && (
            <>
              {Array.from({ length: 3 }).map((_, i) => {
                const { top, left } = generateRandomPosition();
                return (
                  <div
                    key={i}
                    className={`${styles.explosion} ${styles[`explosion-${(i + 1).toString()}`]}`}
                    style={{
                      top: `${top.toString()}%`,
                      left: `${left.toString()}%`,
                    }}
                  ></div>
                );
              })}
              <div className={styles.flash}></div> {/* Add flash effect */}
            </>
          )}
        </>
      )}
    </Box>
  );
};

export default BoomBoomPirate;
