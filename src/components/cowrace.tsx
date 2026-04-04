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
  const [winners, setWinners] = useState<number[]>([]);
  const raceTrackRef = useRef<HTMLDivElement | null>(null);
  const raceIntervalRef = useRef<NodeJS.Timeout | null>(null); // Use useRef instead of state

  const startRace = () => {
    setCowPositions(Array(numCows).fill(0));
    setWinners([]);
    setRaceStarted(true);
  };

  useEffect(() => {
    if (raceStarted && raceTrackRef.current) {
      const raceTrackRect = raceTrackRef.current.getBoundingClientRect();
      const finishLine = raceTrackRect.width * 0.95; // 95% of track width

      let winnerDetected = false;

      const intervalId = setInterval(() => {
        setCowPositions((prevPositions) => {
          const newPositions = prevPositions.map(
            (pos) => pos + Math.random() * (21 / raceDuration),
          ); // Adjust cow speed

          const finishedCows = newPositions
            .map((pos, index) => ({ pos, index }))
            .filter(({ pos }) => pos >= finishLine);

          if (!winnerDetected && finishedCows.length > 0) {
            winnerDetected = true;
            const sortedWinners = finishedCows.sort((a, b) => b.pos - a.pos);
            setWinners(sortedWinners.map(({ index }) => index));
            playConfetti();
            clearInterval(intervalId);
            raceIntervalRef.current = null;
          }

          return newPositions.map((pos) => Math.min(pos, finishLine));
        });
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
    setWinners([]);
    if (raceIntervalRef.current) clearInterval(raceIntervalRef.current);
    raceIntervalRef.current = null;
  };

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
              {winners.length === 0 ? "Cancel Race" : "Start new race"}
            </Button>
          </Group>

          {winners.length > 0 && (
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
                Results:
              </Text>
              <Stack>
                {winners.slice(0, 3).map((winnerIndex, rank) => {
                  let placeText = "";
                  let trophyColor = "";
                  switch (rank) {
                    case 0:
                      placeText = "1st Place: ";
                      trophyColor = "#FFD700"; // Gold
                      break;
                    case 1:
                      placeText = "2nd Place: ";
                      trophyColor = "#C0C0C0"; // Silver
                      break;
                    case 2:
                      placeText = "3rd Place: ";
                      trophyColor = "#CD7F32"; // Bronze
                      break;
                    default:
                      placeText = `${String(rank + 1)}th Place: `;
                      trophyColor = "#808080";
                  }
                  return (
                    <div
                      key={winnerIndex}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <IconTrophy
                        size={20}
                        color={trophyColor}
                        style={{ marginRight: "0.5rem" }}
                      />
                      <Text fw={500}>
                        {placeText} Cow {winnerIndex + 1}
                      </Text>
                    </div>
                  );
                })}
                {winners.length > 3 && (
                  <Text size="sm">
                    Other finishers:{" "}
                    {winners
                      .slice(3)
                      .map((w) => `Cow ${String(w + 1)}`)
                      .join(", ")}
                  </Text>
                )}
              </Stack>
            </div>
          )}
        </div>
      )}
    </Stack>
  );
};

export default CowRace;
