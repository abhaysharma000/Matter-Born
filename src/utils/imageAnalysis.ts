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

        const sampleSize = 48; // Increased resolution for high-frequency edge analysis
        canvas.width = sampleSize;
        canvas.height = sampleSize;

        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
        const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imgData.data;

        // Color quantization: build histogram
        const colorCounts: Record<string, { r: number; g: number; b: number; count: number }> = {};
        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let totalPixels = 0;

        // Grayscale map for Sobel edge detection
        const grayMap = new Float32Array(sampleSize * sampleSize);

        for (let i = 0; i < data.length; i += 4) {
          const pixelIdx = i / 4;
          const pxX = pixelIdx % sampleSize;
          const pxY = Math.floor(pixelIdx / sampleSize);
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          // Store grayscale value (0.0 to 1.0)
          grayMap[pixelIdx] = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;

          // Skip nearly transparent pixels
          if (a < 80) continue;

          // Foreground center-weighting: objects are framed in the central 60% of the image
          const normX = (pxX - sampleSize / 2) / (sampleSize / 2);
          const normY = (pxY - sampleSize / 2) / (sampleSize / 2);
          const distFromCenter = Math.hypot(normX, normY);
          const weight = Math.max(0.25, 1.25 - distFromCenter * 0.95);

          totalR += r * weight;
          totalG += g * weight;
          totalB += b * weight;
          totalPixels += weight;

          // Quantize to reduce bins
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;

          if (!colorCounts[key]) {
            colorCounts[key] = { r: qr, g: qg, b: qb, count: 0 };
          }
          colorCounts[key].count += weight;
        }

        if (totalPixels === 0) return resolve(fallback);

        // Compute Sobel edge density (detect high-frequency mechanical detail & complexity)
        let edgeSum = 0;
        let edgeCount = 0;
        for (let y = 1; y < sampleSize - 1; y++) {
          for (let x = 1; x < sampleSize - 1; x++) {
            const idx = y * sampleSize + x;
            // Center weight edge focus so background borders don't distort object edge score
            const normX = (x - sampleSize / 2) / (sampleSize / 2);
            const normY = (y - sampleSize / 2) / (sampleSize / 2);
            const edgeWeight = Math.max(0.3, 1.15 - Math.hypot(normX, normY) * 0.85);

            // Horizontal gradient
            const gx =
              -grayMap[idx - sampleSize - 1] + grayMap[idx - sampleSize + 1] +
              -2 * grayMap[idx - 1] + 2 * grayMap[idx + 1] +
              -grayMap[idx + sampleSize - 1] + grayMap[idx + sampleSize + 1];

            // Vertical gradient
            const gy =
              -grayMap[idx - sampleSize - 1] - 2 * grayMap[idx - sampleSize] - grayMap[idx - sampleSize + 1] +
              grayMap[idx + sampleSize - 1] + 2 * grayMap[idx + sampleSize] + grayMap[idx + sampleSize + 1];

            const magnitude = Math.sqrt(gx * gx + gy * gy);
            if (magnitude > 0.16) {
              edgeSum += magnitude * edgeWeight;
            }
            edgeCount += edgeWeight;
          }
        }
        const edgeDensity = Math.min(1.0, (edgeSum / (edgeCount || 1)) * 3.4);

        // Color entropy: number of distinct color clusters
        const distinctColorCount = Object.keys(colorCounts).length;
        const colorEntropy = Math.min(1.0, distinctColorCount / 35.0);

        // Sort by frequency
        const sortedColors = Object.values(colorCounts).sort((a, b) => {
          const satA = Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b);
          const satB = Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b);
          return (b.count * (1 + satB / 128)) - (a.count * (1 + satA / 128));
        });

        const dominant = sortedColors[0] || { r: 0, g: 229, b: 255 };
        const secondary = sortedColors[1] || sortedColors[0] || { r: 124, g: 77, b: 255 };

        const toHex = (r: number, g: number, b: number) => {
          const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
          return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`.toUpperCase();
        };

        const primaryHex = toHex(dominant.r, dominant.g, dominant.b);
        const secondaryHex = toHex(secondary.r, secondary.g, secondary.b);

        // Create an energy glow color
        const isWarm = dominant.r > dominant.b && dominant.r > dominant.g * 0.8;
        let glowHex: string;
        if (dominant.g > dominant.r && dominant.g > dominant.b) {
          glowHex = '#00FF66'; // nature/green
        } else if (dominant.b > dominant.r && dominant.b > dominant.g) {
          glowHex = '#00E5FF'; // cyan/ice/cyber
        } else if (isWarm) {
          glowHex = dominant.r > 200 && dominant.g > 160 ? '#FFD600' : '#FF3D00'; // fire/electric
        } else {
          glowHex = '#E040FB'; // void/magenta
        }

        const avgBrightness = (totalR + totalG + totalB) / (totalPixels * 3);
        const maxC = Math.max(dominant.r, dominant.g, dominant.b) / 255;
        const minC = Math.min(dominant.r, dominant.g, dominant.b) / 255;
        const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
        const aspectRatio = img.naturalWidth / (img.naturalHeight || 1);

        // Evaluate comprehensive physical scale and structural complexity
        const complexity = evaluateObjectComplexityAndScale(hintText, edgeDensity, colorEntropy);

        resolve({
          primaryHex,
          secondaryHex,
          glowHex,
          isWarm,
          brightness: Math.round(avgBrightness),
          saturation,
          aspectRatio,
          edgeDensity,
          colorEntropy,
          complexity,
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
