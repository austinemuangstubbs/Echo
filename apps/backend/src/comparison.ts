/**
 * Point cloud comparison functionality
 * This will be used in the future to handle overlap rendering logic
 */

// Constants mirrored from frontend ComparisonCanvas
const MAX_SIMILARITY_DISTANCE = 10; // pixels
const MAX_SIMILARITY_DISTANCE_SQ = MAX_SIMILARITY_DISTANCE * MAX_SIMILARITY_DISTANCE;
const SIMILARITY_SIGMA = 3.0;

type PointArr = [number, number, number]; // [x, y, count]

// Compact string key "x,y" – still lightweight but avoids bit-range pitfalls
const keyOf = (x: number, y: number) => `${x},${y}`;

function parseKey(k: string): [number, number] {
  const idx = k.indexOf(',');
  return [parseInt(k.slice(0, idx), 10), parseInt(k.slice(idx + 1), 10)];
}

/**
 * Memory-lean overlap detection; aggregates per pixel and avoids storing every match.
 * Returns a Map<packedKey, { intensity: number; distance: number }>
 */
export function calculateOverlap(
  pointCloud1: PointArr[],
  pointCloud2: PointArr[],
  _threshold = 0.01, // legacy arg
) {
  // 1. Build compact lookup for cloud B: Map<string,int> ("x,y" -> totalCount)
  const bCount = new Map<string, number>();
  for (const [x, y, cnt] of pointCloud2) {
    const key = keyOf(Math.round(x), Math.round(y));
    bCount.set(key, (bCount.get(key) ?? 0) + cnt);
  }

  // 2. Aggregate overlaps per resulting canvas pixel to reduce result size and mem
  const overlaps = new Map<string, { intensity: number; distance: number }>();

  for (const [xA, yA, countA] of pointCloud1) {
    for (let dx = -MAX_SIMILARITY_DISTANCE; dx <= MAX_SIMILARITY_DISTANCE; dx++) {
      for (let dy = -MAX_SIMILARITY_DISTANCE; dy <= MAX_SIMILARITY_DISTANCE; dy++) {
        const xCheck = Math.round(xA + dx);
        const yCheck = Math.round(yA + dy);
        const keyB = keyOf(xCheck, yCheck);
        const countB = bCount.get(keyB);
        if (!countB) continue;

        const distSq = dx * dx + dy * dy;
        if (distSq > MAX_SIMILARITY_DISTANCE_SQ) continue;

        const distance = Math.sqrt(distSq);
        const similarity = Math.exp(-(distSq) / (2 * SIMILARITY_SIGMA * SIMILARITY_SIGMA));
        const combinedDensity = Math.sqrt(countA * countB) / 25;
        const alpha = Math.min(1, similarity * combinedDensity * 2.5);
        if (alpha <= 0.01) continue;

        // Match original canvas behaviour: draw at pA's location
        const outKey = keyOf(xA, yA);

        const existing = overlaps.get(outKey);
        if (!existing || alpha > existing.intensity) {
          overlaps.set(outKey, { intensity: alpha, distance });
        }
      }
    }
  }

  return overlaps;
}

/**
 * Build rendering payload consumed by frontend ComparisonCanvas.
 */
export function generateOverlapRenderingData(overlaps: Map<string, { intensity: number; distance: number }>) {
  const points = Array.from(overlaps.entries()).map(([key, info]) => {
    const [x, y] = parseKey(key);
    return { position: { x, y, z: 0 }, intensity: info.intensity };
  });

  const totalDistance = Array.from(overlaps.values()).reduce((s, v) => s + v.distance, 0);

  return {
    points,
    metadata: {
      count: overlaps.size,
      averageDistance: overlaps.size ? totalDistance / overlaps.size : 0,
    },
  };
} 