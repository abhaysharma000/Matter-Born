// Client-side image analyzer to extract real-world visual signatures, structural complexity, and physical scale from photos

export type ObjectScaleTier = 'micro' | 'compact' | 'medium' | 'large' | 'colossal';

export interface ObjectComplexityAnalysis {
  complexityScore: number; // 0 to 100
  scaleTier: ObjectScaleTier;
  tierLabel: string; // e.g. "S-TIER COLOSSAL TITAN"
  statMultiplier: number; // e.g. 1.8x
  powerRating: number; // 400 to 1600+
  physicalMassDesc: string; // e.g. "Colossal Multi-Component Machine / Vehicle"
  recommendedHp: number;
  recommendedAttack: number;
  recommendedDefense: number;
  recommendedSpeed: number;
  visualScale: number;
  componentCountEst: number;
}

export interface ExtractedImageFeatures {
  primaryHex: string;
  secondaryHex: string;
  glowHex: string;
  isWarm: boolean;
  brightness: number; // 0 to 255
  saturation: number; // 0 to 1
  aspectRatio: number; // width / height
  inferredCategory?: string;
  edgeDensity: number; // 0 to 1
  colorEntropy: number; // 0 to 1
  complexity: ObjectComplexityAnalysis;
  shapeArchetype: 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box';
  detectedShapeLabel: string;
  foregroundAspectRatio: number;
  circularity: number;
  suggestedRobotName: string;
  suggestedOriginalObject: string;
  topColors?: string[];
}

// Heuristic keyword matcher for real-world physical object scale and structural complexity
export function evaluateObjectComplexityAndScale(
  hint: string = '',
  edgeDensity: number = 0.45,
  colorEntropy: number = 0.5
): ObjectComplexityAnalysis {
  const h = hint.toLowerCase();

  // Tier 1: Colossal / Mega Heavy Objects (>150kg or multi-part complex vehicles & industrial machines)
  const isColossal =
    h.includes('car') ||
    h.includes('truck') ||
    h.includes('vehicle') ||
    h.includes('automobile') ||
    h.includes('motorcycle') ||
    h.includes('bike') ||
    h.includes('bicycle') ||
    h.includes('engine') ||
    h.includes('refrigerator') ||
    h.includes('fridge') ||
    h.includes('washing machine') ||
    h.includes('generator') ||
    h.includes('machinery') ||
    h.includes('tractor') ||
    h.includes('transformer') ||
    h.includes('server') ||
    h.includes('desk') ||
    h.includes('sofa') ||
    h.includes('couch') ||
    h.includes('piano') ||
    h.includes('crane') ||
    h.includes('boat') ||
    h.includes('treadmill');

  // Tier 2: Large / Multi-Component Heavy Electronics & Complex Apparatus (10kg - 150kg)
  const isLarge =
    h.includes('laptop') ||
    h.includes('computer') ||
    h.includes('pc') ||
    h.includes('monitor') ||
    h.includes('tv') ||
    h.includes('television') ||
    h.includes('printer') ||
    h.includes('microwave') ||
    h.includes('guitar') ||
    h.includes('amplifier') ||
    h.includes('vacuum') ||
    h.includes('toolbox') ||
    h.includes('drill') ||
    h.includes('power tool') ||
    h.includes('blender') ||
    h.includes('food processor') ||
    h.includes('speaker') ||
    h.includes('stereo') ||
    h.includes('skateboard') ||
    h.includes('scooter') ||
    h.includes('air conditioner') ||
    h.includes('fan');

  // Tier 3: Medium Objects (1kg - 10kg, standard physical accessories)
  const isMedium =
    h.includes('shoe') ||
    h.includes('sneaker') ||
    h.includes('boot') ||
    h.includes('backpack') ||
    h.includes('bag') ||
    h.includes('jacket') ||
    h.includes('bottle') ||
    h.includes('flask') ||
    h.includes('thermos') ||
    h.includes('plant') ||
    h.includes('succulent') ||
    h.includes('cactus') ||
    h.includes('lamp') ||
    h.includes('toaster') ||
    h.includes('kettle') ||
    h.includes('headphones') ||
    h.includes('headset') ||
    h.includes('book') ||
    h.includes('clock');

  // Tier 4: Micro Objects (< 0.1kg, single tiny pocket items)
  const isMicro =
    h.includes('key') ||
    h.includes('coin') ||
    h.includes('pen') ||
    h.includes('pencil') ||
    h.includes('usb') ||
    h.includes('flash drive') ||
    h.includes('earbuds') ||
    h.includes('airpods') ||
    h.includes('ring') ||
    h.includes('watch') ||
    h.includes('battery') ||
    h.includes('pebble') ||
    h.includes('lighter') ||
    h.includes('clip') ||
    h.includes('eraser');

  let scaleTier: ObjectScaleTier = 'compact';
  if (isColossal) scaleTier = 'colossal';
  else if (isLarge) scaleTier = 'large';
  else if (isMedium) scaleTier = 'medium';
  else if (isMicro) scaleTier = 'micro';
  else {
    // If no keyword match, infer from visual edge complexity and color entropy
    const visualScore = edgeDensity * 0.65 + colorEntropy * 0.35;
    if (visualScore > 0.68) scaleTier = 'large';
    else if (visualScore > 0.48) scaleTier = 'medium';
    else if (visualScore > 0.3) scaleTier = 'compact';
    else scaleTier = 'micro';
  }

  // Calculate fine-grained complexity (0-100) combining structural edges and object class
  let baseComplexity = 50;
  if (scaleTier === 'colossal') baseComplexity = 88;
  else if (scaleTier === 'large') baseComplexity = 74;
  else if (scaleTier === 'medium') baseComplexity = 58;
  else if (scaleTier === 'compact') baseComplexity = 42;
  else baseComplexity = 26;

  const dynamicBonus = Math.round(edgeDensity * 18 + colorEntropy * 12);
  const complexityScore = Math.min(99, Math.max(20, baseComplexity + dynamicBonus));

  // Compute stat multiplier: larger & more complex = exponentially more powerful!
  switch (scaleTier) {
    case 'colossal':
      return {
        complexityScore,
        scaleTier: 'colossal',
        tierLabel: 'S-TIER COLOSSAL TITAN',
        statMultiplier: 2.1,
        powerRating: 1450 + Math.round(complexityScore * 3.5),
        physicalMassDesc: 'Colossal Multi-Part Heavy Vehicle / Industrial Machinery',
        recommendedHp: 1100 + Math.round(complexityScore * 3.5),
        recommendedAttack: 165 + Math.round(complexityScore * 0.6),
        recommendedDefense: 125 + Math.round(complexityScore * 0.5),
        recommendedSpeed: 9,
        visualScale: 1.65,
        componentCountEst: 140 + Math.round(complexityScore * 2),
      };

    case 'large':
      return {
        complexityScore,
        scaleTier: 'large',
        tierLabel: 'A-TIER HEAVY ASSAULT',
        statMultiplier: 1.6,
        powerRating: 1150 + Math.round(complexityScore * 2.5),
        physicalMassDesc: 'Heavy Multi-Component Electronics & Complex Chassis',
        recommendedHp: 820 + Math.round(complexityScore * 2.2),
        recommendedAttack: 128 + Math.round(complexityScore * 0.4),
        recommendedDefense: 95 + Math.round(complexityScore * 0.35),
        recommendedSpeed: 11,
        visualScale: 1.38,
        componentCountEst: 75 + Math.round(complexityScore * 1.2),
      };

    case 'medium':
      return {
        complexityScore,
        scaleTier: 'medium',
        tierLabel: 'B-TIER COMBAT WARRIOR',
        statMultiplier: 1.25,
        powerRating: 880 + Math.round(complexityScore * 2.0),
        physicalMassDesc: 'Balanced Physical Accessory / Structural Hardware',
        recommendedHp: 620 + Math.round(complexityScore * 1.5),
        recommendedAttack: 100 + Math.round(complexityScore * 0.25),
        recommendedDefense: 72 + Math.round(complexityScore * 0.25),
        recommendedSpeed: 13,
        visualScale: 1.18,
        componentCountEst: 40 + Math.round(complexityScore * 0.8),
      };

    case 'compact':
      return {
        complexityScore,
        scaleTier: 'compact',
        tierLabel: 'C-TIER TACTICAL UNIT',
        statMultiplier: 1.0,
        powerRating: 680 + Math.round(complexityScore * 1.8),
        physicalMassDesc: 'Compact Everyday Tool / Handheld Device',
        recommendedHp: 510 + Math.round(complexityScore * 1.0),
        recommendedAttack: 84 + Math.round(complexityScore * 0.2),
        recommendedDefense: 58 + Math.round(complexityScore * 0.2),
        recommendedSpeed: 14,
        visualScale: 1.05,
        componentCountEst: 22 + Math.round(complexityScore * 0.5),
      };

    case 'micro':
    default:
      return {
        complexityScore,
        scaleTier: 'micro',
        tierLabel: 'D-TIER SPEED SCOUT',
        statMultiplier: 0.88,
        powerRating: 520 + Math.round(complexityScore * 1.5),
        physicalMassDesc: 'Micro Pocket Item / Agile Kinetic Infiltrator',
        recommendedHp: 420 + Math.round(complexityScore * 0.8),
        recommendedAttack: 72 + Math.round(complexityScore * 0.15),
        recommendedDefense: 45 + Math.round(complexityScore * 0.15),
        recommendedSpeed: 16,
        visualScale: 0.92,
        componentCountEst: 12 + Math.round(complexityScore * 0.3),
      };
  }
}

export async function analyzeImageFileOrBase64(
  src: string,
  hintText: string = ''
): Promise<ExtractedImageFeatures> {
  return new Promise((resolve) => {
    const fallbackComplexity = evaluateObjectComplexityAndScale(hintText, 0.45, 0.5);
    const fallback: ExtractedImageFeatures = {
      primaryHex: '#00E5FF',
      secondaryHex: '#7C4DFF',
      glowHex: '#00FF66',
      isWarm: false,
      brightness: 128,
      saturation: 0.6,
      aspectRatio: 1.0,
      edgeDensity: 0.45,
      colorEntropy: 0.5,
      complexity: fallbackComplexity,
      shapeArchetype: 'cylinder',
      detectedShapeLabel: 'Cylindrical Bottle / Canister',
      foregroundAspectRatio: 0.7,
      circularity: 0.6,
      suggestedRobotName: 'Hydro-Vortex Vanguard',
      suggestedOriginalObject: 'Cylindrical Bottle',
      topColors: ['#00E5FF', '#7C4DFF', '#00FF66', '#FFD600', '#18181B'],
    };

    if (typeof window === 'undefined') {
      return resolve(fallback);
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(fallback);

        // 64x64 resolution provides high accuracy for contour and color separation
        const sampleSize = 64;
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Step 1: Background Estimation (Sample 4-pixel border around perimeter)
        let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
        const borderThickness = 4;
        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const isBorder =
              x < borderThickness ||
              x >= sampleSize - borderThickness ||
              y < borderThickness ||
              y >= sampleSize - borderThickness;
            if (isBorder) {
              const i = (y * sampleSize + x) * 4;
              bgR += data[i];
              bgG += data[i + 1];
              bgB += data[i + 2];
              bgCount++;
            }
          }
        }
        const avgBgR = bgCount > 0 ? bgR / bgCount : 200;
        const avgBgG = bgCount > 0 ? bgG / bgCount : 200;
        const avgBgB = bgCount > 0 ? bgB / bgCount : 200;

        // Step 2: Grayscale & Sobel Edge Gradient Map
        const grayMap = new Float32Array(sampleSize * sampleSize);
        for (let i = 0; i < data.length; i += 4) {
          const pIdx = i / 4;
          grayMap[pIdx] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255.0;
        }

        const edgeMap = new Float32Array(sampleSize * sampleSize);
        let edgeSum = 0;
        let edgeCount = 0;
        for (let y = 1; y < sampleSize - 1; y++) {
          for (let x = 1; x < sampleSize - 1; x++) {
            const idx = y * sampleSize + x;
            const gx =
              -grayMap[idx - sampleSize - 1] + grayMap[idx - sampleSize + 1] +
              -2 * grayMap[idx - 1] + 2 * grayMap[idx + 1] +
              -grayMap[idx + sampleSize - 1] + grayMap[idx + sampleSize + 1];
            const gy =
              -grayMap[idx - sampleSize - 1] - 2 * grayMap[idx - sampleSize] - grayMap[idx - sampleSize + 1] +
              grayMap[idx + sampleSize - 1] + 2 * grayMap[idx + sampleSize] + grayMap[idx + sampleSize + 1];
            const mag = Math.sqrt(gx * gx + gy * gy);
            edgeMap[idx] = mag;
            if (mag > 0.14) {
              edgeSum += mag;
            }
            edgeCount++;
          }
        }
        const edgeDensity = Math.min(1.0, (edgeSum / (edgeCount || 1)) * 3.6);

        // Step 3: Foreground Object Segmentation & Bounding Box
        let minX = sampleSize, maxX = 0, minY = sampleSize, maxY = 0;
        let fgPixelCount = 0;
        let sumX = 0, sumY = 0;
        const isForeground = new Uint8Array(sampleSize * sampleSize);

        for (let y = 2; y < sampleSize - 2; y++) {
          for (let x = 2; x < sampleSize - 2; x++) {
            const pIdx = y * sampleSize + x;
            const i = pIdx * 4;
            const a = data[i + 3];
            if (a < 80) continue;

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Distance from estimated background
            const dR = r - avgBgR;
            const dG = g - avgBgG;
            const dB = b - avgBgB;
            const colorDist = Math.sqrt(dR * dR + dG * dG + dB * dB);

            // Center bias for foreground framing
            const normX = (x - sampleSize / 2) / (sampleSize / 2);
            const normY = (y - sampleSize / 2) / (sampleSize / 2);
            const centerDist = Math.hypot(normX, normY);

            const isFg = (colorDist > 32 || edgeMap[pIdx] > 0.18) && centerDist < 0.92;
            if (isFg) {
              isForeground[pIdx] = 1;
              fgPixelCount++;
              sumX += x;
              sumY += y;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Fallback to central region if segmentation was overly aggressive
        if (fgPixelCount < 40) {
          minX = Math.floor(sampleSize * 0.2);
          maxX = Math.ceil(sampleSize * 0.8);
          minY = Math.floor(sampleSize * 0.15);
          maxY = Math.ceil(sampleSize * 0.85);
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              isForeground[y * sampleSize + x] = 1;
            }
          }
          fgPixelCount = (maxX - minX + 1) * (maxY - minY + 1);
          sumX = ((minX + maxX) / 2) * fgPixelCount;
          sumY = ((minY + maxY) / 2) * fgPixelCount;
        }

        const fgWidth = Math.max(1, maxX - minX + 1);
        const fgHeight = Math.max(1, maxY - minY + 1);
        const foregroundAspectRatio = fgWidth / fgHeight;
        const centerX = sumX / fgPixelCount;
        const centerY = sumY / fgPixelCount;

        // Step 4: Measure Circularity / Radial Symmetry
        let radialDistances: number[] = [];
        const numRays = 16;
        for (let aIdx = 0; aIdx < numRays; aIdx++) {
          const angle = (aIdx / numRays) * Math.PI * 2;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          let rayDist = 0;
          for (let step = 1; step < sampleSize / 2; step++) {
            const rx = Math.round(centerX + cosA * step);
            const ry = Math.round(centerY + sinA * step);
            if (rx < 0 || rx >= sampleSize || ry < 0 || ry >= sampleSize) break;
            if (isForeground[ry * sampleSize + rx] === 1) {
              rayDist = step;
            }
          }
          if (rayDist > 0) {
            radialDistances.push(rayDist);
          }
        }

        let circularityScore = 0.5;
        if (radialDistances.length >= 8) {
          const meanR = radialDistances.reduce((a, b) => a + b, 0) / radialDistances.length;
          const varR =
            radialDistances.reduce((acc, d) => acc + Math.pow(d - meanR, 2), 0) /
            radialDistances.length;
          const stdR = Math.sqrt(varR);
          const relStd = stdR / (meanR || 1);
          circularityScore = Math.max(0, Math.min(1.0, 1.0 - relStd * 2.5));
        }

        // Step 5: Classify Shape Archetype
        let shapeArchetype: 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box';
        let detectedShapeLabel: string;
        let suggestedOriginalObject: string;

        // Prioritize explicit text hint if provided
        const hintLower = hintText.toLowerCase();
        if (
          /bottle|flask|canister|thermos|cylinder|can\b|tumbler|mug|cup|tube|shampoo|spray|deodorant|candle|pen|pencil|marker/i.test(
            hintLower
          )
        ) {
          shapeArchetype = 'cylinder';
          detectedShapeLabel = 'Cylindrical Bottle / Canister';
          suggestedOriginalObject = 'Cylindrical Bottle / Vessel';
        } else if (
          /sheet|slab|laptop|notebook|macbook|tablet|ipad|phone|smartphone|screen|display|monitor|book|card|paper/i.test(
            hintLower
          )
        ) {
          shapeArchetype = 'sheet_slab';
          detectedShapeLabel = 'Flat Tech Slab / Screen';
          suggestedOriginalObject = 'Flat Screen Slate / Tech Device';
        } else if (
          /sphere|round|ball|orb|globe|apple|orange|fruit|tomato|lemon|melon|bulb|circle/i.test(
            hintLower
          )
        ) {
          shapeArchetype = 'sphere_round';
          detectedShapeLabel = 'Spherical Orb / Round Sphere';
          suggestedOriginalObject = 'Spherical Orb / Round Object';
        } else if (/box|crate|carton|package|cube|block/i.test(hintLower)) {
          shapeArchetype = 'cuboid_box';
          detectedShapeLabel = 'Cuboid Armor Box / Container';
          suggestedOriginalObject = 'Corrugated Crate / Structural Box';
        } else {
          // Authentic Computer Vision Silhouette Classification from foreground bounds
          if (foregroundAspectRatio <= 0.78) {
            // Taller than wide: Bottle, Can, Flask, Mug, Spray Can
            shapeArchetype = 'cylinder';
            detectedShapeLabel = 'Cylindrical Bottle / Canister';
            suggestedOriginalObject = 'Cylindrical Bottle / Fluid Vessel';
          } else if (foregroundAspectRatio >= 1.28) {
            // Wider than tall: Screen, Laptop, Tablet, Keyboard, Slate
            shapeArchetype = 'sheet_slab';
            detectedShapeLabel = 'Flat Tech Slab / Screen';
            suggestedOriginalObject = 'Flat Screen Slate / Tech Device';
          } else if (circularityScore >= 0.72) {
            // Near 1:1 aspect ratio with high circular symmetry: Ball, Apple, Fruit, Orb
            shapeArchetype = 'sphere_round';
            detectedShapeLabel = 'Spherical Orb / Round Sphere';
            suggestedOriginalObject = 'Spherical Orb / Round Object';
          } else {
            // Angular/squarish: Box, Crate, Cube
            shapeArchetype = 'cuboid_box';
            detectedShapeLabel = 'Cuboid Armor Box / Container';
            suggestedOriginalObject = 'Corrugated Crate / Structural Box';
          }
        }

        // Step 6: Pure Foreground & Center-Focus Dominant Color Extraction
        // Tracks authentic RGB centroids without coarse distortion or bias against dark/neutral real-world objects
        interface ColorBin {
          sumR: number;
          sumG: number;
          sumB: number;
          count: number;
        }
        const colorBins: Record<string, ColorBin> = {};
        let totalR = 0, totalG = 0, totalB = 0, totalFg = 0;

        for (let y = 0; y < sampleSize; y++) {
          for (let x = 0; x < sampleSize; x++) {
            const pIdx = y * sampleSize + x;
            if (isForeground[pIdx] !== 1) continue;

            const i = pIdx * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Center Gaussian radial weight: highest at reticle center where user frames the object
            const normX = (x - centerX) / (fgWidth / 2 || 1);
            const normY = (y - centerY) / (fgHeight / 2 || 1);
            const distSq = normX * normX + normY * normY;
            const centerWeight = Math.max(0.35, Math.exp(-1.8 * distSq) * 1.6);

            totalR += r * centerWeight;
            totalG += g * centerWeight;
            totalB += b * centerWeight;
            totalFg += centerWeight;

            // 16-step quantization binning, accumulating exact raw RGB sums for true centroids
            const binSize = 16;
            const br = Math.floor(r / binSize);
            const bg = Math.floor(g / binSize);
            const bb = Math.floor(b / binSize);
            const key = `${br},${bg},${bb}`;

            if (!colorBins[key]) {
              colorBins[key] = { sumR: 0, sumG: 0, sumB: 0, count: 0 };
            }
            colorBins[key].sumR += r * centerWeight;
            colorBins[key].sumG += g * centerWeight;
            colorBins[key].sumB += b * centerWeight;
            colorBins[key].count += centerWeight;
          }
        }

        if (totalFg === 0) return resolve(fallback);

        // Compute true average centroid color for each bin
        const candidateColors = Object.values(colorBins).map((bin) => {
          const r = bin.sumR / (bin.count || 1);
          const g = bin.sumG / (bin.count || 1);
          const b = bin.sumB / (bin.count || 1);
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max > 0 ? (max - min) / max : 0;
          // Faithful score based on real pixel mass and center focus
          const score = bin.count * (1.0 + sat * 0.2);
          return { r, g, b, count: bin.count, score, sat };
        }).sort((a, b) => b.score - a.score);

        const toHex = (r: number, g: number, b: number) => {
          const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
          return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`.toUpperCase();
        };

        const colorDist = (c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }) => {
          const dr = c1.r - c2.r;
          const dg = c1.g - c2.g;
          const db = c1.b - c2.b;
          return Math.sqrt(dr * dr + dg * dg + db * db);
        };

        const dominant = candidateColors[0] || { r: 0, g: 229, b: 255, count: 1, score: 1, sat: 0.5 };

        // Find secondary color that is perceptually distinct
        let secondary = candidateColors.find((c) => colorDist(c, dominant) >= 38);
        if (!secondary) {
          const isLight = (dominant.r * 0.299 + dominant.g * 0.587 + dominant.b * 0.114) > 128;
          if (isLight) {
            secondary = {
              r: Math.max(0, dominant.r * 0.55),
              g: Math.max(0, dominant.g * 0.55),
              b: Math.max(0, dominant.b * 0.55),
              count: 0, score: 0, sat: dominant.sat
            };
          } else {
            secondary = {
              r: Math.min(255, dominant.r * 1.5 + 40),
              g: Math.min(255, dominant.g * 1.5 + 40),
              b: Math.min(255, dominant.b * 1.5 + 40),
              count: 0, score: 0, sat: dominant.sat
            };
          }
        }

        // Top 5 extracted unique colors from photo
        const topColors: string[] = [toHex(dominant.r, dominant.g, dominant.b)];
        for (const cand of candidateColors) {
          const hex = toHex(cand.r, cand.g, cand.b);
          if (!topColors.includes(hex)) {
            const tooClose = topColors.some((existing) => {
              const er = parseInt(existing.slice(1, 3), 16);
              const eg = parseInt(existing.slice(3, 5), 16);
              const eb = parseInt(existing.slice(5, 7), 16);
              return colorDist(cand, { r: er, g: eg, b: eb }) < 28;
            });
            if (!tooClose) {
              topColors.push(hex);
              if (topColors.length >= 5) break;
            }
          }
        }
        if (topColors.length < 2) {
          topColors.push(toHex(secondary.r, secondary.g, secondary.b));
        }

        const primaryHex = toHex(dominant.r, dominant.g, dominant.b);
        const secondaryHex = toHex(secondary.r, secondary.g, secondary.b);

        const isWarm = dominant.r > dominant.b && dominant.r > dominant.g * 0.8;
        let glowHex = '#00E5FF';
        if (dominant.g > dominant.r && dominant.g > dominant.b) {
          glowHex = '#00FF66'; // nature green
        } else if (dominant.b > dominant.r && dominant.b > dominant.g) {
          glowHex = '#00E5FF'; // cyan
        } else if (isWarm) {
          glowHex = dominant.r > 200 && dominant.g > 160 ? '#FFD600' : '#FF3D00'; // fire/amber
        } else {
          glowHex = '#E040FB'; // void
        }

        const avgBrightness = (totalR + totalG + totalB) / (totalFg * 3);
        const maxC = Math.max(dominant.r, dominant.g, dominant.b) / 255;
        const minC = Math.min(dominant.r, dominant.g, dominant.b) / 255;
        const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const colorEntropy = Math.min(1.0, Object.keys(colorBins).length / 30.0);

        // Step 7: Procedural Name tailored to shape and extracted colors
        let suggestedRobotName = 'Cybertron Sentinel';
        if (shapeArchetype === 'cylinder') {
          suggestedRobotName = isWarm
            ? 'Pyro-Canister Vanguard'
            : dominant.b > dominant.r
            ? 'Hydro-Flask Seeker'
            : dominant.g > dominant.r
            ? 'Verdant Cylinder Titan'
            : 'Vortex-Canister Autobot';
        } else if (shapeArchetype === 'sheet_slab') {
          suggestedRobotName = dominant.b > dominant.r
            ? 'OLED Data-Plate Scout'
            : isWarm
            ? 'Ignis-Tablet Striker'
            : 'Tactical Matrix Infiltrator';
        } else if (shapeArchetype === 'sphere_round') {
          suggestedRobotName = isWarm
            ? 'Solar-Orb Singularity Titan'
            : dominant.g > dominant.r
            ? 'Verdant Core Golem'
            : 'Orbital Sphere Arbiter';
        } else {
          suggestedRobotName = isWarm
            ? 'Bastion Aegis Dreadnought'
            : 'Corrugated Armor Titan';
        }

        const complexity = evaluateObjectComplexityAndScale(
          hintText || suggestedOriginalObject,
          edgeDensity,
          colorEntropy
        );

        resolve({
          primaryHex,
          secondaryHex,
          glowHex,
          topColors,
          isWarm,
          brightness: Math.round(avgBrightness),
          saturation,
          aspectRatio: img.naturalWidth / (img.naturalHeight || 1),
          edgeDensity,
          colorEntropy,
          complexity,
          shapeArchetype,
          detectedShapeLabel,
          foregroundAspectRatio,
          circularity: circularityScore,
          suggestedRobotName,
          suggestedOriginalObject,
        });
      } catch (e) {
        console.warn('Image analysis exception, using fallback colors:', e);
        resolve(fallback);
      }
    };

    img.onerror = () => {
      resolve(fallback);
    };

    img.src = src;
  });
}

export interface DerivedCreatureStats {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  abilityDamage: number;
  abilityCooldown: number;
  powerRating: number;
  scale: number;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    abilityDamage: number;
  };
  distanceBuffs: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    abilityDamage: number;
  };
  distanceFromStartMeters: number;
  distanceMultiplier: number;
  distanceTierLabel: string;
  distanceTierBadge: string;
  distanceBonusPercent: number;
  complexityScore: number;
  scaleTier: ObjectScaleTier;
}

export function deriveCreatureStatsFromComplexityAndDistance(
  complexity: ObjectComplexityAnalysis,
  distanceFromStartMeters: number = 0,
  objectName: string = '',
  colorHex: string = '#00E5FF'
): DerivedCreatureStats {
  // Deterministic hash jitter from object name + color so two different items never have identical stats!
  const seedString = `${(objectName || 'mech').toLowerCase()}-${(colorHex || '#00E5FF').toLowerCase()}-${complexity.scaleTier}-${complexity.complexityScore}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const jitter1 = (((Math.abs(hash) % 19) - 9) / 100); // -0.09 to +0.09
  const jitter2 = ((((Math.abs(hash >> 3)) % 17) - 8) / 100);
  const jitter3 = ((((Math.abs(hash >> 6)) % 15) - 7) / 100);
  const jitter4 = ((((Math.abs(hash >> 9)) % 11) - 5) / 100);

  // 1. Base stats from complexity
  const baseHp = Math.round(complexity.recommendedHp * (1 + jitter1 * 0.4));
  const baseAttack = Math.round(complexity.recommendedAttack * (1 + jitter2 * 0.6));
  const baseDefense = Math.round(complexity.recommendedDefense * (1 + jitter3 * 0.6));
  const baseSpeed = Math.max(7, Math.round(complexity.recommendedSpeed + jitter4 * 1.5));
  const baseAbilityDmg = Math.round((baseAttack * 1.6 + complexity.complexityScore * 0.7) * (1 + jitter1 * 0.5));
  const baseCooldown = Math.max(3.5, Number((7.0 - (baseSpeed - 10) * 0.25).toFixed(1)));

  // 2. Distance from starting position calculation
  const dist = Math.max(0, distanceFromStartMeters);
  let distanceMultiplier = 1.0;
  let distanceBonusPercent = 0;
  let distanceTierLabel = 'LOCAL ORIGIN';
  let distanceTierBadge = '⚪';

  if (dist >= 100) {
    distanceTierLabel = 'GRAND HACKATHON MATRIX';
    distanceTierBadge = '🔴';
    // +65% base at 100m, +0.2% per additional meter up to max 85%
    distanceBonusPercent = Math.min(85, Math.round(65 + (dist - 100) * 0.2));
    distanceMultiplier = 1 + distanceBonusPercent / 100;
  } else if (dist >= 75) {
    distanceTierLabel = 'ATRIUM MATRIX';
    distanceTierBadge = '🟡';
    distanceBonusPercent = 50;
    distanceMultiplier = 1.50;
  } else if (dist >= 50) {
    distanceTierLabel = 'MAIN HALL APEX';
    distanceTierBadge = '🟣';
    distanceBonusPercent = 40;
    distanceMultiplier = 1.40;
  } else if (dist >= 35) {
    distanceTierLabel = 'DEV LAB VANGUARD';
    distanceTierBadge = '🔵';
    distanceBonusPercent = 30;
    distanceMultiplier = 1.30;
  } else if (dist >= 20) {
    distanceTierLabel = 'CORRIDOR RANGER';
    distanceTierBadge = '🌲';
    distanceBonusPercent = 20;
    distanceMultiplier = 1.20;
  } else if (dist >= 10) {
    distanceTierLabel = 'HACKATHON SCOUT';
    distanceTierBadge = '🟢';
    distanceBonusPercent = 10;
    distanceMultiplier = 1.10;
  }

  const bonusFraction = distanceBonusPercent / 100;
  const hpBonus = Math.round(baseHp * bonusFraction * 0.75);
  const attackBonus = Math.round(baseAttack * bonusFraction * 0.85);
  const defenseBonus = Math.round(baseDefense * bonusFraction * 0.70);
  const speedBonus = Math.round(bonusFraction * 3.0);
  const abilityDmgBonus = Math.round(baseAbilityDmg * bonusFraction * 0.80);

  const finalHp = baseHp + hpBonus;
  const finalAttack = baseAttack + attackBonus;
  const finalDefense = baseDefense + defenseBonus;
  const finalSpeed = baseSpeed + speedBonus;
  const finalAbilityDmg = baseAbilityDmg + abilityDmgBonus;

  const powerRating = Math.round(
    finalHp * 0.7 + finalAttack * 4.0 + finalDefense * 3.2 + finalSpeed * 12 + finalAbilityDmg * 2.0
  );

  return {
    hp: finalHp,
    attack: finalAttack,
    defense: finalDefense,
    speed: finalSpeed,
    abilityDamage: finalAbilityDmg,
    abilityCooldown: baseCooldown,
    powerRating,
    scale: complexity.visualScale,
    baseStats: {
      hp: baseHp,
      attack: baseAttack,
      defense: baseDefense,
      speed: baseSpeed,
      abilityDamage: baseAbilityDmg,
    },
    distanceBuffs: {
      hp: hpBonus,
      attack: attackBonus,
      defense: defenseBonus,
      speed: speedBonus,
      abilityDamage: abilityDmgBonus,
    },
    distanceFromStartMeters: dist,
    distanceMultiplier,
    distanceTierLabel,
    distanceTierBadge,
    distanceBonusPercent,
    complexityScore: complexity.complexityScore,
    scaleTier: complexity.scaleTier,
  };
}
