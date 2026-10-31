"use client";

import { useEffect, useRef, useState } from "react";
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
  IconCheck,
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
  const [explosionRope, setExplosionRope] = useState(() =>
    generateRandomRope(totalRopes),
  );
  const [loadingRope, setLoadingRope] = useState<number | null>(null);
  const [ropeStates, setRopeStates] = useState<Record<number, string>>({});
  const [isExplosion, setIsExplosion] = useState(false);
  const [currentIcon, setCurrentIcon] = useState<JSX.Element | null>(null);
  const [showExplosions, setShowExplosions] = useState(false);
  const [gameInitialized, setGameInitialized] = useState(false); // New state for game initialization
  const [lastPull, setLastPull] = useState("");

  // The ropes are disabled while one is pulled, and the setup screen comes and
  // goes, so put focus back where a keyboard user can carry on playing
  const setupRef = useRef<HTMLInputElement>(null);
  const ropesRef = useRef<HTMLDivElement>(null);
  const ropeToFocusRef = useRef<number | null>(null);
  const backToSetupRef = useRef(false);

  useEffect(() => {
    if (gameInitialized && loadingRope === null && !isExplosion) {
      if (ropeToFocusRef.current === null) return;
      ropesRef.current
        ?.querySelector<HTMLButtonElement>(
          `[data-rope="${ropeToFocusRef.current.toString()}"]`,
        )
        ?.focus();
      ropeToFocusRef.current = null;
    }
    if (!gameInitialized && backToSetupRef.current) {
      backToSetupRef.current = false;
      setupRef.current?.focus();
    }
  }, [gameInitialized, loadingRope, isExplosion]);

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

    ropeToFocusRef.current = index;
    setLoadingRope(index);
    const intervalId = cycleIcons(); // Start cycling icons

    setTimeout(() => {
      clearInterval(intervalId); // Stop cycling icons
      if (index === explosionRope) {
        setIsExplosion(true);
        setRopeStates((prevState) => ({ ...prevState, [index]: "red" }));
        setLastPull(`Rope ${(index + 1).toString()} was the trap. Boom!`);
        setShowExplosions(true); // Show explosion animation
        setTimeout(() => {
          setShowExplosions(false);
          setIsExplosion(true); // Show modal after explosions
        }, 1500); // Hide explosion after animation
      } else {
        setRopeStates((prevState) => ({ ...prevState, [index]: "green" }));
        setLastPull(`Rope ${(index + 1).toString()} is safe.`);
      }
      setLoadingRope(null);
      setCurrentIcon(null);
    }, 2000); // Simulate loading state for 2 seconds
  };

  // Says in words what the colour shows, for screen readers
  const ropeLabel = (rope: number) => {
    const name = `Rope ${(rope + 1).toString()}`;
    if (ropeStates[rope] === "green") return `${name}, safe`;
    if (ropeStates[rope] === "red") return `${name}, boom!`;
    return name;
  };

  // Shows the result by shape as well as colour
  const ropeIcon = (rope: number) => {
    if (ropeStates[rope] === "green") return <IconCheck size={16} />;
    if (ropeStates[rope] === "red") return <IconBomb size={16} />;
    return null;
  };

  const closeModal = () => {
    setIsExplosion(false);
  };

  const restartGame = () => {
    backToSetupRef.current = true;
    setGameInitialized(false); // Go back to initiation page
    setExplosionRope(generateRandomRope(totalRopes)); // Generate a new random rope for explosion
    setLoadingRope(null);
    setRopeStates({});
    setLastPull("");
    setIsExplosion(false);
    setCurrentIcon(null);
  };

  const startGame = () => {
    setExplosionRope(generateRandomRope(totalRopes));
    ropeToFocusRef.current = 0;
    setGameInitialized(true);
  };

  return (
    <Box p="md" style={{ position: "relative" }}>
      {!gameInitialized ? (
        <Stack align="center">
          <NumberInput
            ref={setupRef}
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
          <Grid ref={ropesRef}>
            {Array.from({ length: totalRopes }, (_, rope) => rope).map(
              (rope) => (
                <Grid.Col span={{ base: 6, xs: 4, sm: 3, md: 2 }} key={rope}>
                  <Button
                    data-rope={rope}
                    aria-label={ropeLabel(rope)}
                    leftSection={ropeIcon(rope)}
                    variant="outline"
                    fullWidth
                    onClick={() => {
                      handleRopePull(rope);
                    }}
                    color={ropeStates[rope] || "blue"}
                    disabled={loadingRope !== null}
                  >
                    {loadingRope === rope
                      ? (currentIcon ?? "Loading...")
                      : `Rope ${(rope + 1).toString()}`}
                  </Button>
                </Grid.Col>
              ),
            )}
          </Grid>

          {/* Always rendered, so screen readers announce each pull */}
          <Text role="status" mt="md">
            {lastPull}
          </Text>

          <Space h="xl" />

          <Button onClick={restartGame} color="red">
            Restart Game
          </Button>

          {/* Mantine only names a dialog from its own title, so name it here */}
          <Modal.Root opened={isExplosion} onClose={closeModal}>
            <Modal.Overlay />
            <Modal.Content aria-label="Boom!">
              <Modal.Body>
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
                  <Button
                    fullWidth
                    mt="md"
                    variant="default"
                    onClick={closeModal}
                  >
                    Close
                  </Button>
                </Stack>
              </Modal.Body>
            </Modal.Content>
          </Modal.Root>

          {showExplosions && (
            <>
              {Array.from({ length: 3 }, (_, i) => i + 1).map((explosion) => {
                const { top, left } = generateRandomPosition();
                return (
                  <div
                    key={explosion}
                    className={`${styles.explosion} ${styles[`explosion-${explosion.toString()}`]}`}
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
