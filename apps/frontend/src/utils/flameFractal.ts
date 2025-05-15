class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

interface Canvas {
  width: number;
  height: number;
  init: () => void;
  clear: (color: string) => void;
  context: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
}

interface FractalParams {
  variationFunctions: Array<(p: Point) => Point>;
  functionWeights: number[];
  colorParams: {
    baseColor: [number, number, number];
    colorSpeed: [number, number, number];
    colorShift: [number, number, number];
  };
  transforms: Array<(p: Point) => Point>;
  postProcessing?: {
    gamma: number;
    brightness: number;
    contrast: number;
    vibrancy: number;
    blur: number;
  };
}

export type FractalPoint = { x: number; y: number; count: number };

// Canvas setup
const createChaosCanvas = (canvas: HTMLCanvasElement): Canvas => {
  const context = canvas.getContext('2d')!;
  
  return {
    width: canvas.width,
    height: canvas.height,
    canvas,
    context,
    init: () => {
      // Initialize the canvas - no specific action needed as we handle this elsewhere
    },
    clear: (color: string) => {
      context.fillStyle = color;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
  };
};

const renderFlameFractal = (
  canvas: HTMLCanvasElement,
  params: FractalParams,
  onProgress?: (progress: number) => void
): Promise<FractalPoint[]> => {
  // Initialize the canvas
  const chaos = createChaosCanvas(canvas);
  chaos.init();
  
  // Completely reset the transformation matrix between renders
  chaos.context.setTransform(1, 0, 0, 1, 0, 0);
  chaos.clear('black');

  // Get the display scale ratio
  const dpr = window.devicePixelRatio || 1;
  const displayWidth = canvas.width / dpr;
  const displayHeight = canvas.height / dpr;
  
  const scale = Math.min(displayWidth, displayHeight) / 2;
  const pointSize = 0.5 / scale;
  
  // Center the coordinate system
  chaos.context.translate(displayWidth / 2, displayHeight / 2);
  chaos.context.scale(scale, -scale);  // Flip y-axis

  const { variationFunctions, functionWeights, colorParams, transforms } = params;

  // Create the transform table
  const table = createTransformTable(transforms, variationFunctions, functionWeights);

  // Initialize the starting point
  let currentPoint = new Point(Math.random() * 2 - 1, Math.random() * 2 - 1);

  // For collecting point data
  const densityMap = new Map<string, { x: number; y: number; count: number }>();
  const transformToCanvasSpace = (p: Point): { x: number; y: number } => {
    // Get the current transformation matrix (applied by translate and scale)
    const matrix = chaos.context.getTransform();
    // Manually apply the transformation
    // x' = a*x + c*y + e
    // y' = b*x + d*y + f
    // For our specific case (scale, -scale) and (translate displayWidth/2, displayHeight/2):
    // a = scale, b = 0, c = 0, d = -scale
    // e = displayWidth/2, f = displayHeight/2
    // So: x_canvas = scale * p.x + displayWidth/2
    //     y_canvas = -scale * p.y + displayHeight/2
    // However, getTransform() provides the net effect.
    const canvasX = matrix.a * p.x + matrix.c * p.y + matrix.e;
    const canvasY = matrix.b * p.x + matrix.d * p.y + matrix.f;
    return { x: Math.floor(canvasX), y: Math.floor(canvasY) };
  };

  // Main rendering loop
  const totalIterations = 1000000;  // Adjust based on desired detail
  const drawCount = 10000;
  let iteration = 0;

  return new Promise((resolve) => {
    function renderLoop() {
      for (let i = 0; i < drawCount && iteration < totalIterations; i++) {
        // Apply random transform
        const [transform, colorIndex] = getRandomTransform(table);
        currentPoint = transform(currentPoint);

        // Color the point and draw it
        const color = getColor(colorIndex, colorParams, currentPoint);
        setPoint(chaos.context, currentPoint, color, pointSize);

        // Accumulate point data for density map
        const { x: canvasX, y: canvasY } = transformToCanvasSpace(currentPoint);
        const key = `${canvasX},${canvasY}`;
        const existing = densityMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          densityMap.set(key, { x: canvasX, y: canvasY, count: 1 });
        }
        iteration++;
      }

      // Update progress
      const progress = (iteration / totalIterations) * 100;
      if (onProgress) {
        onProgress(progress);
      }

      if (iteration < totalIterations) {
        requestAnimationFrame(renderLoop);
      } else {
        // Reset the transformation matrix when we're done
        chaos.context.setTransform(1, 0, 0, 1, 0, 0);
        if (onProgress) {
          onProgress(100);
        }
        console.log('[renderFlameFractal] Density map size:', densityMap.size);
        if (densityMap.size > 0 && densityMap.size < 10) { // Log a few entries if map is small but not empty
          console.log('[renderFlameFractal] Sample densityMap entries:', Array.from(densityMap.entries()).slice(0, 5));
        }
        resolve(Array.from(densityMap.values()));
      }
    }
    renderLoop();
  });
};

function createTransformTable(transforms: Array<(p: Point) => Point>, variationFunctions: Array<(p: Point) => Point>, functionWeights: number[]) {
  return transforms.map((transform, index) => {
    const variation = variationFunctions[index % variationFunctions.length];
    const weight = functionWeights[index];
    return [
      (p: Point) => variation(transform(p)),
      weight,
      index  // Color index
    ] as [(p: Point) => Point, number, number];
  });
}

function getRandomTransform(table: Array<[(p: Point) => Point, number, number]>): [(p: Point) => Point, number] {
  const random = Math.random();
  let sum = 0;
  for (const [transform, weight, colorIndex] of table) {
    sum += weight;
    if (random <= sum) {
      return [transform, colorIndex];
    }
  }
  return [table[table.length - 1][0], table[table.length - 1][2]];  // Fallback to last transform
}

function getColor(colorIndex: number, colorParams: FractalParams['colorParams'], point: Point): string {
  const { baseColor, colorSpeed, colorShift } = colorParams;
  const hue = (baseColor[0] + colorSpeed[0] * point.x + colorShift[0] * point.y) % 360;
  const saturation = Math.min(100, Math.max(0, baseColor[1] + colorSpeed[1] * point.x + colorShift[1] * point.y));
  const lightness = Math.min(100, Math.max(0, baseColor[2] + colorSpeed[2] * point.x + colorShift[2] * point.y));
  return `hsla(${hue}, ${saturation}%, ${lightness}%, 0.5)`;
}

function setPoint(context: CanvasRenderingContext2D, p: Point, color: string, size: number) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(p.x, p.y, size, 0, Math.PI * 2);
  context.fill();
}

// Common variation functions
const linearVariation = (p: Point): Point => new Point(p.x, p.y);

const sinusoidalVariation = (p: Point): Point => new Point(
  Math.sin(p.x),
  Math.sin(p.y)
);

const sphericalVariation = (p: Point): Point => {
  const r2 = p.x * p.x + p.y * p.y;
  const factor = r2 > 0 ? 1 / r2 : 1;
  return new Point(
    p.x * factor,
    p.y * factor
  );
};

const swirl = (p: Point): Point => {
  const r2 = p.x * p.x + p.y * p.y;
  const sinr = Math.sin(r2);
  const cosr = Math.cos(r2);
  return new Point(
    p.x * sinr - p.y * cosr,
    p.x * cosr + p.y * sinr
  );
};

const horseshoe = (p: Point): Point => {
  const r = Math.sqrt(p.x * p.x + p.y * p.y);
  const factor = r > 0 ? 1 / r : 1;
  return new Point(
    factor * (p.x - p.y) * (p.x + p.y),
    factor * 2 * p.x * p.y
  );
};

const polar = (p: Point): Point => {
  const r = Math.sqrt(p.x * p.x + p.y * p.y);
  const theta = Math.atan2(p.y, p.x);
  return new Point(
    theta / Math.PI,
    r - 1
  );
};

const handkerchief = (p: Point): Point => {
  const r = Math.sqrt(p.x * p.x + p.y * p.y);
  const theta = Math.atan2(p.y, p.x);
  return new Point(
    r * Math.sin(theta + r),
    r * Math.cos(theta - r)
  );
};

const disc = (p: Point): Point => {
  const r = Math.sqrt(p.x * p.x + p.y * p.y);
  const theta = Math.atan2(p.y, p.x);
  const factor = Math.PI * r;
  return new Point(
    Math.sin(factor) * theta / Math.PI,
    Math.cos(factor) * theta / Math.PI
  );
};

// Create an affine transform from coefficients
const createAffineTransform = (a: number, b: number, c: number, d: number, e: number, f: number) => {
  return (p: Point): Point => new Point(
    a * p.x + b * p.y + c,
    d * p.x + e * p.y + f
  );
};

// Create flame fractal params from embeddings
const createFractalParamsFromEmbeddings = (embeddings: number[]) => {
  // keep original length for indexing convenience
  const len = embeddings.length;

  // Helpers
  const norm = (v: number) => (v + 1) / 2; // [-1,1] -> [0,1]
  const clip = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  // Variation functions list stays the same
  const variationFunctions = [
    linearVariation,
    sinusoidalVariation,
    sphericalVariation,
    swirl,
    horseshoe,
    polar,
    handkerchief,
    disc
  ];

  // ----- 1) Function weights -------------------------------------------------
  // derive 8 weights from first 8 embedding values
  const rawWeights = Array.from({ length: 8 }, (_, i) => Math.abs(embeddings[i % len]) + 0.001);
  const weightSum = rawWeights.reduce((a, b) => a + b, 0);
  const functionWeights = rawWeights.map(w => w / weightSum);

  // ----- 2) Transforms -------------------------------------------------------
  const transforms = [] as Array<(p: Point) => Point>;
  const transformCount = 8;
  for (let i = 0; i < transformCount; i++) {
    // Spread indices so we use the whole embedding vector
    const base = 8 + i * 6;
    const a = clip(embeddings[(base) % len] * 1.8, -2, 2);
    const b = clip(embeddings[(base + 1) % len] * 1.8, -2, 2);
    const c = embeddings[(base + 2) % len]; // translation small
    const d = clip(embeddings[(base + 3) % len] * 1.8, -2, 2);
    const e = clip(embeddings[(base + 4) % len] * 1.8, -2, 2);
    const f = embeddings[(base + 5) % len];
    transforms.push(createAffineTransform(a, b, c, d, e, f));
  }

  // ----- 3) Variation assignment -------------------------------------------
  // Instead of picking a tiny subset we will cycle variations, but weighted
  const selectedVariations = variationFunctions;

  // ----- 4) Color params -----------------------------------------------------
  const colorBaseIdx = (8 + transformCount * 6);
  const hue = norm(embeddings[colorBaseIdx % len]) * 360;
  const sat = 50 + norm(embeddings[(colorBaseIdx + 1) % len]) * 50; // 50-100
  const light = 25 + norm(embeddings[(colorBaseIdx + 2) % len]) * 50; //25-75

  const colorSpeed: [number, number, number] = [
    (embeddings[(colorBaseIdx + 3) % len]) * 40,
    (embeddings[(colorBaseIdx + 4) % len]) * 15,
    (embeddings[(colorBaseIdx + 5) % len]) * 15
  ];
  const colorShift: [number, number, number] = [
    (embeddings[(colorBaseIdx + 6) % len]) * 40,
    (embeddings[(colorBaseIdx + 7) % len]) * 15,
    (embeddings[(colorBaseIdx + 8) % len]) * 15
  ];
  const colorParams = {
    baseColor: [hue, sat, light] as [number, number, number],
    colorSpeed,
    colorShift
  };

  return {
    variationFunctions: selectedVariations,
    functionWeights,
    colorParams,
    transforms
  };
};

export {
  Point,
  renderFlameFractal,
  createFractalParamsFromEmbeddings,
  createAffineTransform,
  linearVariation,
  sinusoidalVariation,
  sphericalVariation,
  swirl,
  horseshoe,
  polar,
  handkerchief,
  disc,
  type FractalParams
}; 