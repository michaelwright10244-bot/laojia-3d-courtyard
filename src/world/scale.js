// Shared city scale contract for the TvT migration.
export const SCALE = Object.freeze({
  tileMeters: 2,
  adultHeight: 0.9,
  floorHeight: 1.5,
  road: {
    rural: 1.75,
    secondary: 4.5,
    arterial: 8.25
  },
  sidewalk: {
    secondary: 0.85,
    arterial: 1.15
  },
  grid: 0.5
});

export const floorHeight = (floors) => floors * SCALE.floorHeight;
export const snapGrid = (value) => Math.round(value / SCALE.grid) * SCALE.grid;
export const snapPoint = (x, z) => [snapGrid(x), snapGrid(z)];
