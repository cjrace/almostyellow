import { describe, expect, it } from "vitest";
import {
  DURATIONS,
  finishingOrder,
  leaderAt,
  planRace,
  progressAt,
  steppedProgress,
} from "@/cowrace/race";

// A repeatable stand-in for Math.random
function seeded(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

describe("planRace", () => {
  for (const cows of [2, 5, 10]) {
    for (const duration of ["short", "medium", "long"] as const) {
      it(`gives ${String(cows)} cows distinct finish times near the ${duration} length`, () => {
        for (let seed = 1; seed <= 25; seed++) {
          const plan = planRace(cows, duration, seeded(seed));
          const length = DURATIONS[duration].seconds;
          expect(plan.finishTimes).toHaveLength(cows);
          expect(new Set(plan.finishTimes).size).toBe(cows);
          for (const time of plan.finishTimes) {
            expect(time).toBeGreaterThanOrEqual(length * 0.85);
            expect(time).toBeLessThanOrEqual(length * 1.15);
          }
          expect(plan.duration).toBe(Math.max(...plan.finishTimes));
        }
      });
    }
  }

  it("keeps the number of cows between 2 and 10", () => {
    expect(planRace(1, "short").finishTimes).toHaveLength(2);
    expect(planRace(40, "short").finishTimes).toHaveLength(10);
  });

  it("is different each time with the real random numbers", () => {
    const a = planRace(6, "medium").finishTimes.join();
    const b = planRace(6, "medium").finishTimes.join();
    expect(a).not.toBe(b);
  });
});

describe("progressAt", () => {
  const plan = planRace(6, "medium", seeded(7));

  it("starts at the start line and never goes back", () => {
    for (let cow = 0; cow < 6; cow++) {
      expect(progressAt(plan, cow, 0)).toBe(0);
      expect(progressAt(plan, cow, -1)).toBe(0);
      let last = 0;
      for (let t = 0; t <= plan.duration + 1; t += 0.05) {
        const progress = progressAt(plan, cow, t);
        expect(progress).toBeGreaterThanOrEqual(last);
        expect(progress).toBeLessThanOrEqual(1);
        last = progress;
      }
    }
  });

  it("reaches the finish line exactly when the cow finishes", () => {
    plan.finishTimes.forEach((time, cow) => {
      expect(progressAt(plan, cow, time)).toBe(1);
      expect(progressAt(plan, cow, time - 0.01)).toBeLessThan(1);
      expect(progressAt(plan, cow, time + 100)).toBe(1);
    });
  });
});

describe("results", () => {
  const plan = planRace(8, "short", seeded(3));

  it("lists the cows from the earliest finish to the latest", () => {
    const order = finishingOrder(plan);
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    const times = order.map((cow) => plan.finishTimes[cow]);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("has the winner leading once the race is over", () => {
    expect(leaderAt(plan, plan.duration - 0.0001)).toBeDefined();
    const winner = finishingOrder(plan)[0];
    expect(progressAt(plan, winner, plan.finishTimes[winner])).toBe(1);
  });

  it("names the cow furthest along as the leader", () => {
    for (const t of [0.5, 1, 2, 3]) {
      const leader = leaderAt(plan, t);
      for (let cow = 0; cow < 8; cow++) {
        expect(progressAt(plan, leader, t)).toBeGreaterThanOrEqual(
          progressAt(plan, cow, t),
        );
      }
    }
  });
});

describe("steppedProgress", () => {
  it("moves in jumps and only reaches the line at the finish", () => {
    expect(steppedProgress(0)).toBe(0);
    expect(steppedProgress(0.3)).toBe(0.25);
    expect(steppedProgress(0.999)).toBe(0.875);
    expect(steppedProgress(1)).toBe(1);
  });
});
