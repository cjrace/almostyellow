// The cow race. The whole race is decided when it starts, so the animation
// only plays it back and the finish line is exact at any screen size.

export const MIN_COWS = 2;
export const MAX_COWS = 10;

export const DURATIONS = {
  short: { label: "Short", seconds: 5 },
  medium: { label: "Medium", seconds: 10 },
  long: { label: "Long", seconds: 20 },
} as const;

export type Duration = keyof typeof DURATIONS;

const STRETCHES = 8;
// How far a cow's finishing time can stray from the race length
const SPREAD = 0.15;

interface Stretch {
  at: number; // Seconds into the race when the stretch ends
  progress: number; // Fraction of the track covered when it ends
}

export interface RacePlan {
  duration: number; // Seconds, until the last cow has finished
  cows: Stretch[][]; // Per cow, the end of each stretch in order
  finishTimes: number[]; // Per cow, in seconds
}

export function planRace(
  cows: number,
  duration: Duration,
  random: () => number = Math.random,
): RacePlan {
  const count = Math.min(MAX_COWS, Math.max(MIN_COWS, Math.round(cows)));
  const length = DURATIONS[duration].seconds;

  // Spread the finishing times evenly across the allowed range, then deal them
  // out at random, so no two cows ever finish together
  const slots = Array.from({ length: count }, (_, i) => {
    const share = (i + random() * 0.8 + 0.1) / count;
    return length * (1 - SPREAD + 2 * SPREAD * share);
  });
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const plans = slots.map((finish) => {
    // Each stretch gets a random share of the time and of the track, which is
    // what makes the cows speed up and slow down
    const times = Array.from({ length: STRETCHES }, () => 0.3 + random());
    const distances = Array.from({ length: STRETCHES }, () => 0.3 + random());
    const timeTotal = times.reduce((a, b) => a + b, 0);
    const distanceTotal = distances.reduce((a, b) => a + b, 0);
    let at = 0;
    let progress = 0;
    return times.map((time, i) => {
      at = i === STRETCHES - 1 ? finish : at + (time / timeTotal) * finish;
      progress =
        i === STRETCHES - 1 ? 1 : progress + distances[i] / distanceTotal;
      return { at, progress };
    });
  });

  return {
    duration: Math.max(...slots),
    cows: plans,
    finishTimes: slots,
  };
}

// How far along the track a cow is at a moment in the race, from 0 to 1
export function progressAt(plan: RacePlan, cow: number, seconds: number) {
  if (seconds <= 0) return 0;
  const stretches = plan.cows[cow];
  let startAt = 0;
  let startProgress = 0;
  for (const stretch of stretches) {
    if (seconds <= stretch.at) {
      const share = (seconds - startAt) / (stretch.at - startAt);
      return startProgress + share * (stretch.progress - startProgress);
    }
    startAt = stretch.at;
    startProgress = stretch.progress;
  }
  return 1;
}

// The cow in front at a moment in the race. The lowest number wins a dead heat
export function leaderAt(plan: RacePlan, seconds: number) {
  let leader = 0;
  let best = -1;
  plan.cows.forEach((_, cow) => {
    const progress = progressAt(plan, cow, seconds);
    if (progress > best) {
      best = progress;
      leader = cow;
    }
  });
  return leader;
}

// Cow numbers (from 0) from first to last
export function finishingOrder(plan: RacePlan) {
  return plan.finishTimes
    .map((time, cow) => ({ time, cow }))
    .sort((a, b) => a.time - b.time)
    .map(({ cow }) => cow);
}

// Reduced motion: the cows move in a few jumps instead of sliding
export function steppedProgress(progress: number, steps = 8) {
  return progress >= 1 ? 1 : Math.floor(progress * steps) / steps;
}
