// Function to convert numeric rating to moons
// (was stars but the half star emoji doesn't exist so I am being creative)
export const renderRatingMoons = (rating: number) => {
  const fullMoons = Math.floor(rating);
  const remaining = rating - fullMoons;
  const hasHalfMoon = remaining >= 0.25 && remaining < 0.75;
  const emptyMoons = 5 - fullMoons - (hasHalfMoon ? 1 : 0);

  const moonString =
    `🌝`.repeat(fullMoons) +
    (hasHalfMoon ? `🌗` : "") +
    `🌚`.repeat(emptyMoons);

  return <span>{moonString}</span>;
};
