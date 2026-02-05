export const MINECRAFT_THEME = Object.freeze({
  blockUnit: 0.5,
  track: Object.freeze({
    roadSegmentCount: 210,
    curbBlockCount: 250,
    laneMarkerCount: 84
  }),
  jungle: Object.freeze({
    minRadiusOffset: 5.8,
    maxRadius: 82,
    rocks: 88,
    trees: 136,
    bushes: 142,
    grassClumps: 184,
    monkeys: 22,
    lions: 16,
    deer: 24,
    cows: 28
  }),
  fragments: Object.freeze({
    minCount: 10,
    maxCount: 24,
    gravity: 12,
    minTtl: 0.75,
    maxTtl: 1.2
  })
});

export const getMinecraftSpawnPlan = () => {
  const { jungle } = MINECRAFT_THEME;
  return {
    ...jungle,
    totalDestructibles:
      jungle.rocks +
      jungle.trees +
      jungle.bushes +
      jungle.grassClumps +
      jungle.monkeys +
      jungle.lions +
      jungle.deer +
      jungle.cows
  };
};
