"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Slider, Text, Stack, Group, Alert } from "@mantine/core";
import { motion } from "framer-motion";
import { Trophy, Flag, AlertTriangle } from "lucide-react";
import playConfetti from "@/components/playconfetti";

const CowRace = () => {
  const [numCows, setNumCows] = useState(4); // Start with 4 cows
  const [raceStarted, setRaceStarted] = useState(false);
  const [cowPositions, setCowPositions] = useState<number[]>([]);
  const [winners, setWinners] = useState<number[]>([]);
  const [raceIntervalId, setRaceIntervalId] = useState<NodeJS.Timeout | null>(
    null,
  );
  const cowRefs = useRef<(HTMLImageElement | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const raceTrackRef = useRef<HTMLDivElement | null>(null); // Add a ref for the race track

  // Ensure numCows is within the valid range
  useEffect(() => {
    if (numCows < 2 || numCows > 10) {
      setError("Number of cows must be between 2 and 10.");
      setNumCows(Math.max(2, Math.min(10, numCows))); // Correct the value
    } else {
      setError(null); // Clear any previous error
    }
  }, [numCows]);

  const startRace = () => {
    if (numCows < 2 || numCows > 10) {
      setError(
        "Please select a valid number of cows (2-10) to start the race.",
      );
      return; // Stop the race from starting
    }
    setRaceStarted(true);
  };

  useEffect(() => {
    if (raceStarted && raceTrackRef.current) {
      const raceTrackRect = raceTrackRef.current.getBoundingClientRect(); // Get the race track's position
      const finishLine = raceTrackRect.right - 60; // Subtract cow width to ensure proper detection

      console.log("Finish Line:", finishLine); // Debugging

      setCowPositions(Array(numCows).fill(0));
      setWinners([]);
      cowRefs.current = Array(numCows).fill(null);

      let winnerDetected = false; // Local variable to track if a winner has been detected

      const intervalId = setInterval(() => {
        setCowPositions((prevPositions) => {
          const newPositions = prevPositions.map(
            (pos) => pos + Math.random() * 4,
          ); // Adjust cow speed

          console.log("Cow Positions:", newPositions); // Debugging

          // Check if any cow has crossed the finish line
          const finishedCows = newPositions
            .map((pos, index) => ({ pos, index }))
            .filter(({ pos }) => pos + raceTrackRect.left >= finishLine);

          console.log("Finished Cows:", finishedCows); // Debugging

          // If no winner has been detected yet and at least one cow has finished
          if (!winnerDetected && finishedCows.length > 0) {
            winnerDetected = true; // Mark that a winner has been detected
            const sortedWinners = finishedCows.sort((a, b) => a.pos - b.pos); // Sort by position
            setWinners(sortedWinners.map(({ index }) => index)); // Set winners
            console.log(
              "Winners:",
              sortedWinners.map(({ index }) => index),
            ); // Debugging
            playConfetti(); // Trigger confetti
            clearInterval(intervalId); // Stop the race
            setRaceIntervalId(null);
          }

          // Update positions, ensuring cows don't go past the finish line
          return newPositions.map((pos) =>
            Math.min(pos, finishLine - raceTrackRect.left),
          );
        });
      }, 100);

      setRaceIntervalId(intervalId);
    } else {
      if (raceIntervalId) clearInterval(raceIntervalId);
      setRaceIntervalId(null);
    }
  }, [raceStarted, numCows]);

  const resetRace = () => {
    setRaceStarted(false);
    setCowPositions([]);
    setWinners([]);
    if (raceIntervalId) clearInterval(raceIntervalId);
  };

  // Cow image URL (replace with your actual image)
  const cowImageUrl = "/images/cow.svg";

  return (
    <Stack align="center" style={{ width: "100%" }}>
      {error && (
        <Alert variant="destructive" title="Error" style={{ width: "80%" }}>
          <AlertTriangle size={16} />
          {error}
        </Alert>
      )}
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
            Select Number of Cows (2-10):
          </Text>
          <Slider
            value={numCows}
            onChange={setNumCows}
            min={2}
            max={10}
            step={1}
            style={{ width: "80%", maxWidth: "400px" }}
            label={(value) => `${value} Cows`}
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
              maxWidth: "800px", // Responsive width
              height: "400px",
              borderBottom: "4px solid #4a5568", // Darker border
              position: "relative",
              margin: "1rem 0",
              backgroundColor: "#f7fafc", // Light background for track
              borderRadius: "0.5rem", // Rounded corners for track
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)", // Subtle shadow
              overflow: "hidden", // Ensure cows don't overflow visually
            }}
          >
            {Array.from({ length: numCows }).map((_, index) => (
              <motion.img
                key={index}
                src={cowImageUrl}
                alt={`Cow ${index + 1}`}
                width={60} // Slightly larger cows
                height={60}
                style={{
                  position: "absolute",
                  top: `${index * (400 / numCows) + 20}px`, // Spread cows out, adjust as needed
                  left: `${cowPositions[index] || 0}px`,
                  transition: "left 0.1s ease", // Smooth transition
                  zIndex: numCows - index, // Ensure cows appear in correct order
                }}
                ref={(el: HTMLImageElement | null) => {
                  cowRefs.current[index] = el;
                }}
                animate={{
                  x: cowPositions[index] || 0,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                right: "0",
                top: "0",
                height: "100%",
                borderLeft: "4px dashed #e53e3e", // Brighter finish line
                display: "flex",
                alignItems: "center",
                paddingLeft: "0.5rem",
                color: "#e53e3e",
              }}
            >
              <Flag size={24} />
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
              style={{ width: "80%", maxWidth: "300px" }} // Keep button width consistent
            >
              Cancel Race
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
                maxWidth: "400px", // Responsive width
                padding: "1rem",
                backgroundColor: "#fff",
                borderRadius: "0.5rem",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                border: "1px solid #e2e8f0",
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
                      placeText = `${rank + 1}th Place: `;
                      trophyColor = "#808080";
                  }
                  return (
                    <div
                      key={winnerIndex}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      <Trophy
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
                      .map((w) => `Cow ${w + 1}`)
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
