"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Slider, Text, Stack, Group } from "@mantine/core";
import { motion } from "framer-motion";
import { IconTrophy, IconFlag } from "@tabler/icons-react";
import playConfetti from "@/components/playconfetti";

const CowRace = () => {
  const [numCows, setNumCows] = useState(4); // Start with 4 cows
  const [raceDuration, setRaceDuration] = useState(3); // 1=Short, 3=Medium, 5=Long
  const [raceStarted, setRaceStarted] = useState(false);
  const [cowPositions, setCowPositions] = useState<number[]>([]);
  const [finishedOrder, setFinishedOrder] = useState<number[]>([]);
  const finishedOrderRef = useRef<number[]>([]);
  const cowPositionsRef = useRef<number[]>([]);
  const raceTrackRef = useRef<HTMLDivElement | null>(null);
  const raceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRace = () => {
    const initial = Array(numCows).fill(0) as number[];
    cowPositionsRef.current = initial;
    setCowPositions(initial);
    setFinishedOrder([]);
    finishedOrderRef.current = [];
    setRaceStarted(true);
  };

  useEffect(() => {
    if (raceStarted && raceTrackRef.current) {
      const finishLine =
        raceTrackRef.current.getBoundingClientRect().width * 0.95;

      const intervalId = setInterval(() => {
        // Compute new positions — read from ref to avoid stale closures
        const prev = cowPositionsRef.current;
        const next = prev.map((pos, index) => {
          if (finishedOrderRef.current.includes(index)) return finishLine;
          return pos + Math.random() * (21 / raceDuration);
        });

        // Detect cows that just crossed the line this tick
        const newlyFinished = next
          .map((pos, index) => ({ pos, index }))
          .filter(
            ({ pos, index }) =>
              pos >= finishLine && !finishedOrderRef.current.includes(index),
          )
          .sort((a, b) => b.pos - a.pos);

        // Clamp positions to the finish line and push to state for rendering
        const clamped = next.map((pos) => Math.min(pos, finishLine));
        cowPositionsRef.current = clamped;
        setCowPositions(clamped);

        // Handle newly finished cows (side effects outside any setState updater)
        if (newlyFinished.length > 0) {
          const updatedOrder = [
            ...finishedOrderRef.current,
            ...newlyFinished.map(({ index }) => index),
          ];
          finishedOrderRef.current = updatedOrder;
          setFinishedOrder([...updatedOrder]);

          if (updatedOrder.length === numCows) {
            clearInterval(intervalId);
            raceIntervalRef.current = null;
            try {
              playConfetti();
            } catch {
              // External confetti script may not be loaded (e.g. in tests)
            }
          }
        }
      }, 100);

      raceIntervalRef.current = intervalId;
    } else {
      if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
      raceIntervalRef.current = null;
    }
  }, [raceStarted, numCows, raceDuration]);

  const resetRace = () => {
    setRaceStarted(false);
    setCowPositions([]);
    setFinishedOrder([]);
    finishedOrderRef.current = [];
    cowPositionsRef.current = [];
    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    raceIntervalRef.current = null;
  };

  const raceComplete = finishedOrder.length === numCows;

  const cowImageUrl = "/images/cow.svg";

  return (
    <Stack align="center" style={{ width: "100%" }}>
      {!raceStarted ? (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Text size="lg" fw={500} style={{ marginBottom: "1rem" }}>
            Number of racing cows: {numCows}
          </Text>
          <Slider
            value={numCows}
            onChange={setNumCows}
            min={2}
            max={10}
            step={1}
            style={{ width: "80%", maxWidth: "400px" }}
            label={(value) => `${String(value)} Cows`}
            thumbLabel="Number of cows"
          />
          <Text
            size="lg"
            fw={500}
            style={{ marginTop: "1.5rem", marginBottom: "1rem" }}
          >
            Race duration:{" "}
            {raceDuration === 1
              ? "Short"
              : raceDuration === 2
                ? "Short-Medium"
                : raceDuration === 3
                  ? "Medium"
                  : raceDuration === 4
                    ? "Medium-Long"
                    : "Long"}
          </Text>
          <Slider
            value={raceDuration}
            onChange={setRaceDuration}
            min={1}
            max={5}
            step={1}
            style={{ width: "80%", maxWidth: "400px" }}
            thumbLabel="Race duration"
            label={(value) =>
              value === 1
                ? "Short"
                : value === 2
                  ? "Short-Medium"
                  : value === 3
                    ? "Medium"
                    : value === 4
                      ? "Medium-Long"
                      : "Long"
            }
          />
          <Button
            onClick={startRace}
            style={{ marginTop: "2rem", width: "80%", maxWidth: "300px" }}
            size="lg"
          >
            Start Race
          </Button>
        </div>
      ) : (
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            ref={raceTrackRef}
            style={{
              width: "90%",
              height: "400px",
              border: "4px solid orange",
              position: "relative",
              margin: "1rem 0",
              borderRadius: "0.5rem",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              overflow: "hidden",
            }}
          >
            {Array.from({ length: numCows }).map((_, index) => (
              <motion.img
                key={index}
                src={cowImageUrl}
                alt={`Cow ${String(index + 1)}`}
                width={60}
                height={60}
                style={{
                  position: "absolute",
                  top: `${String(index * (400 / numCows) + 20)}px`, // Spread cows out
                  left: 0,
                  zIndex: numCows - index,
                }}
                animate={{
                  x: cowPositions[index] || 0,
                }}
                transition={{ duration: 0.1, ease: "linear" }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                right: "5%",
                top: "0",
                height: "100%",
                borderLeft: "4px dashed orange",
                display: "flex",
                alignItems: "center",
                paddingLeft: "0.6rem",
                color: "orange",
              }}
            >
              <IconFlag size={24} />
              <Text size="sm" fw={600} ml={2}>
                Finish
              </Text>
            </div>
          </div>

          <Group
            style={{
              marginTop: "1rem",
              width: "100%",
              justifyContent: "center",
            }}
          >
            <Button
              onClick={resetRace}
              variant="outline"
              size="lg"
              style={{ width: "80%", maxWidth: "300px" }}
            >
              {raceComplete ? "Start new race" : "Cancel Race"}
            </Button>
          </Group>

          {raceComplete && (
            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                width: "90%",
                maxWidth: "400px",
                padding: "1rem",
                borderRadius: "0.5rem",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid orange",
              }}
            >
              <Text size="lg" fw={600} mb="1rem">
                Final Leaderboard:
              </Text>
              <Stack gap="xs">
                {finishedOrder.map((cowIndex, rank) => {
                  const placeText =
                    rank === 0
                      ? "1st"
                      : rank === 1
                        ? "2nd"
                        : rank === 2
                          ? "3rd"
                          : `${String(rank + 1)}th`;
                  const trophyColor =
                    rank === 0
                      ? "#FFD700"
                      : rank === 1
                        ? "#C0C0C0"
                        : rank === 2
                          ? "#CD7F32"
                          : "#808080";
                  return (
                    <div
                      key={cowIndex}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <IconTrophy
                        size={20}
                        color={trophyColor}
                        style={{ marginRight: "0.5rem" }}
                      />
                      <Text fw={rank < 3 ? 600 : 400}>
                        {placeText}: Cow {cowIndex + 1}
                      </Text>
                    </div>
                  );
                })}
              </Stack>
            </div>
          )}
        </div>
      )}
    </Stack>
  );
};

export default CowRace;
