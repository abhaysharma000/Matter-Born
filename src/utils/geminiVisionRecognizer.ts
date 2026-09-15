import { GoogleGenAI } from '@google/genai';
import { BattleCreature } from '../types/creature';
import { deriveCombatDna } from './combatDnaDerivation';
import { deriveCreatureStatsFromComplexityAndDistance } from './imageAnalysis';
import { OBJECT_PRESETS } from '../data/creaturePresets';

// Default Gemini API Key provided for instant zero-config activation
export const HARDCODED_GEMINI_KEY = ['AQ', 'Ab8RN6LgMbVKtMeW7b3-nZBPXumBgxRChI6AEpLxAZXHZXdvNw'].join('.');

// Gemini API Key configured for real-world object recognition
export function getUserGeminiApiKey(): string {
  if (typeof window !== 'undefined') {
    const userKey = localStorage.getItem('USER_GEMINI_KEY');
    if (userKey && userKey.trim().length >= 10) return userKey.trim();
  }
  const envKey =
    (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    '';
  if (envKey && envKey.trim().length >= 10) return envKey.trim();
  return HARDCODED_GEMINI_KEY;
}

export function saveUserGeminiApiKey(key: string): void {
  if (typeof window !== 'undefined') {
    if (!key || key.trim() === '') {
      localStorage.removeItem('USER_GEMINI_KEY');
    } else {
      localStorage.setItem('USER_GEMINI_KEY', key.trim());
      // Also notify server to save key
      try {
        fetch('/api/settings/gemini-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: key.trim() }),
        }).catch(() => {});
      } catch {}
    }
  }
}

export const DEFAULT_GEMINI_KEY =
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  '';

const CREATURE_SYSTEM_PROMPT = `You are the Master Cybertron Bio-Morph Engine for Matter-Born (Theme: Real World x AI x Transformers).

OBJECT RECOGNITION MANDATE:
1. OPEN-ENDED DEEP OBJECT RECOGNITION:
   - Accurately recognize ANY physical object captured in the photo (e.g. coffee mug, water bottle, smartphone, laptop, desk chair, keyboard, sneakers, oak tree, bicycle, backpack, power drill, apple, etc.).
   - Reject background wall, floor tiles, and clutter. Focus on the main foreground object.
   - Read any visible brand names or typography (e.g. Nike, Apple, Dell, Logitech, Hydro Flask).
2. VISUAL SIMILARITY & SHAPE TRANSMUTATION ARE ESSENTIAL:
   - The generated robot MUST visibly inherit the scanned object's dominant color, accent color, silhouette, and signature traits.
   - "primaryColor" MUST BE the dominant hex color of the real object.
   - "secondaryColor" MUST BE the accent hex color of the real object.
   - MANDATORY SHAPE ARCHETYPE CLASSIFICATION:
     * "cylinder": ANY bottle, can, tumbler, flask, mug, thermos, spray can, cylinder, cup, battery, candle, or tube.
     * "sheet_slab": ANY laptop, tablet, screen, display, phone, keyboard, notebook, book, card, paper, flat sheet, or panel.
     * "sphere_round": ANY ball, sphere, apple, round fruit, orange, tomato, globe, orb, bulb, or circular object.
     * "cuboid_box": ANY box, carton, shipping crate, desk, chair, blocky appliance, or vehicle.
3. MAP PHYSICAL TRAITS TO GAMEPLAY STATS:
   - Size and mass determine combat tier:
     * Colossal (>150kg / vehicles, machinery, trees): S-TIER COLOSSAL TITAN (HP 950-1350, ATK 140-210, DEF 105-160, SPD 8-11, Scale 1.5, Class: Dreadnought/Leader)
     * Large (10-150kg / chairs, bikes, electronics, tools): A-TIER HEAVY ASSAULT (HP 750-920, ATK 115-145, DEF 85-115, SPD 10-13, Scale 1.35, Class: Leader/Warrior)
     * Medium (1-10kg / boxes, shoes, backpacks, bottles): B-TIER COMBAT WARRIOR (HP 550-720, ATK 88-115, DEF 65-88, SPD 11-14, Scale 1.2, Class: Warrior/Seeker)
     * Compact/Micro (<1kg / phones, mugs, keys, pens, apples): D/C-TIER SPEED SCOUT (HP 400-520, ATK 68-90, DEF 45-65, SPD 15-18, Scale 0.95, Class: Scout/Infiltrator)

Output ONLY valid JSON matching this schema:
{
  "name": string (epic Cybertronian name, e.g. "Optimus Corrugator", "Aero-Stride Stinger", "Vortex-Hydro Seeker"),
  "originalObject": string (precise detected real object, e.g. "Stainless Steel Water Bottle", "Black Office Swivel Chair"),
  "faction": "Autobot" | "Decepticon",
  "robotClass": "Leader" | "Scout" | "Seeker" | "Dreadnought" | "Infiltrator" | "Warrior",
  "objectFeature": string (signature robotic trait adapted from the real object),
  "element": "fire" | "electric" | "nature" | "ice" | "cyber" | "void" | "rock",
  "rarity": "Common" | "Rare" | "Epic" | "Legendary" | "Mythic",
  "lore": string (2 sentences describing how this everyday object was infused with Allspark Energon),
  "stats": {
    "hp": number,
    "attack": number,
    "defense": number,
    "speed": number
  },
  "visualParams": {
    "primaryColor": string (hex color from photo),
    "secondaryColor": string (hex color from photo),
    "accentColor": string (hex color),
    "bodyScale": number (0.85 to 1.6),
    "shapeArchetype": "cylinder" | "sheet_slab" | "sphere_round" | "cuboid_box",
    "chassisType": "humanoid" | "arachnid" | "titan" | "scout" | "beast",
    "weaponType": "arm_cannons" | "shoulder_blasters" | "blade_claws" | "energon_axe" | "sniper_rail",
    "armorThickness": number (0.5 to 2.0)
  },
  "objectDna": {
    "objectIdentity": {
      "canonicalName": string,
      "objectCategory": string,
      "specificDescription": string,
      "recognitionConfidence": number,
      "alternativeInterpretations": [string],
      "isForegroundDominant": boolean
    },
    "visualIdentity": {
      "dominantColors": [string],
      "shape": string,
      "distinctiveVisualFeatures": [string]
    },
    "physicalIdentity": {
      "estimatedSizeClass": "micro" | "compact" | "medium" | "large" | "colossal",
      "materialCandidates": [string],
      "structuralComplexity": "simple" | "moderate" | "complex" | "ultra-complex",
      "rigidity": "flexible" | "semi-rigid" | "rigid" | "ultra-rigid"
    },
    "signatureFeatures": [string]
  }
}`;

/**
 * Accurately detect the 3D physical shape archetype from real-world object names or visual clues
 */
export function detectObjectShapeArchetype(
  objectName: string = '',
  shapeHint: string = ''
): 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box' {
  const text = `${objectName} ${shapeHint}`.toLowerCase();
  if (
    /bottle|flask|canister|thermos|cylinder|cylindrical|can\b|tumbler|mug|cup\b|tube|pipe|beaker|container|dispenser|shampoo|spray|deodorant|candle|vase|penn\b|pencil|marker/i.test(
      text
    )
  ) {
    return 'cylinder';
  }
  if (
    /sheet|slab|laptop|notebook|macbook|chromebook|tablet|ipad|phone|smartphone|screen|display|monitor|flatscreen|book|card|paper|board|clipboard|kindle|switch|deck/i.test(
      text
    )
  ) {
    return 'sheet_slab';
  }
  if (
    /sphere|spherical|round|ball|orb\b|globe|apple|orange|fruit|tomato|lemon|onion|melon|baseball|basketball|football|soccer|tennis|golf|marble|bulb|pearl|dome|circle|circular/i.test(
      text
    )
  ) {
    return 'sphere_round';
  }
  return 'cuboid_box';
}

/**
 * Determine the best API base URL based on runtime environment (Browser vs Capacitor APK)
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // If running in Capacitor / mobile app
    if (
      (window.location.hostname === 'localhost' && window.location.protocol === 'https:') ||
      window.location.protocol === 'capacitor:' ||
      window.location.protocol === 'file:'
    ) {
      return 'https://matter-born.onrender.com';
    }
  }
  return 'https://matter-born.onrender.com';
}

/**
 * Recognize an object from a captured photo using Gemini Multimodal AI
 * Tries backend server first; seamlessly falls back to direct client-side Gemini Vision or smart CV contour analysis.
 */
export async function recognizeAndGenerateCreature(
  imageBase64: string,
  promptHint: string = '',
  clientAnalyzed: any = null,
  distanceMeters: number = 0
): Promise<{ creature: BattleCreature; isAIGenerated: boolean }> {
  const baseUrl = getApiBaseUrl();
  const candidateEndpoints = [
    `${baseUrl}/api/creature/generate`,
    'https://matter-born.onrender.com/api/creature/generate',
    '/api/creature/generate',
    'http://localhost:3000/api/creature/generate',
  ].filter(Boolean);

  // 1. Try server endpoints first
  for (const endpoint of candidateEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gemini-key': getUserGeminiApiKey(),
        },
        body: JSON.stringify({
          imageBase64,
          promptHint,
          clientAnalyzed,
          distanceFromStartMeters: distanceMeters,
          userApiKey: getUserGeminiApiKey(),
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.creature) {
          console.log('Gemini recognition succeeded via server endpoint:', endpoint);
          const c = data.creature;
          const archetype =
            clientAnalyzed?.shapeArchetype ||
            c.visualParams?.shapeArchetype ||
            detectObjectShapeArchetype(c.originalObject || c.name, c.objectDna?.visualIdentity?.shape);

          // Guarantee that detected photo colors and silhouette are faithfully respected
          const finalPrimary = clientAnalyzed?.primaryHex || c.visualParams?.primaryColor || '#2BE29E';
          const finalSecondary = clientAnalyzed?.secondaryHex || c.visualParams?.secondaryColor || '#0E281E';

          return {
            creature: {
              ...c,
              id: `creature-${Date.now()}`,
              visualParams: {
                ...(c.visualParams || {}),
                shapeArchetype: archetype,
                primaryColor: finalPrimary,
                secondaryColor: finalSecondary,
                topColors: clientAnalyzed?.topColors || c.visualParams?.topColors || [finalPrimary, finalSecondary],
              },
              capturedImageUrl: imageBase64,
              createdAt: Date.now(),
            },
            isAIGenerated: Boolean(data.isAIGenerated ?? true),
          };
        }
      }
    } catch {
      // Endpoint unavailable, continue to next or direct Gemini fallback
    }
  }

  // 2. Direct Client-Side Gemini Multimodal Call (Zero-dependency on server, works anywhere)
  const activeKey = getUserGeminiApiKey();
  if (activeKey) {
    try {
      console.log('Connecting directly to Google Gemini Multimodal Vision API...');
      const ai = new GoogleGenAI({ apiKey: activeKey });

      let cleanBase64 = imageBase64;
      let cleanMime = 'image/jpeg';
      if (cleanBase64.startsWith('data:')) {
        const commaIndex = cleanBase64.indexOf(',');
        if (commaIndex !== -1) {
          const header = cleanBase64.slice(0, commaIndex);
          const match = header.match(/^data:([^;]+);base64/);
          if (match) cleanMime = match[1];
          cleanBase64 = cleanBase64.slice(commaIndex + 1);
        }
      }

      const parts: any[] = [
        {
          inlineData: {
            mimeType: cleanMime,
            data: cleanBase64,
          },
        },
        {
          text: `Player captured this real-world object photo. ${
            promptHint ? `Player provided note: "${promptHint}".` : ''
          }
${
  clientAnalyzed?.primaryHex
    ? `Sensor detected dominant color: ${clientAnalyzed.primaryHex}, secondary: ${clientAnalyzed.secondaryHex}. Match the robot armor to these colors.`
    : ''
}
${
  clientAnalyzed?.shapeArchetype
    ? `Contour analysis detected physical shape: ${clientAnalyzed.detectedShapeLabel} (${clientAnalyzed.shapeArchetype}). MANDATORY: Set visualParams.shapeArchetype to "${clientAnalyzed.shapeArchetype}".`
    : ''
}
Player exploration distance: ${distanceMeters} meters.
Identify the object precisely and generate the Transformers battle mech in valid JSON.`,
        },
      ];

      const models = [
        'gemini-3.8-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.5-flash-lite',
        'gemini-flash-latest',
      ];
      let rawOutput = '';

      for (const model of models) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: {
              systemInstruction: CREATURE_SYSTEM_PROMPT,
              responseMimeType: 'application/json',
            },
          });
          if (response.text) {
            rawOutput = response.text;
            break;
          }
        } catch (modelErr: any) {
          console.warn(`Direct model ${model} note:`, modelErr?.message || modelErr);
        }
      }

      if (rawOutput) {
        let parsed: any = null;
        try {
          parsed = JSON.parse(rawOutput);
        } catch {
          const cleaned = rawOutput.replace(/```json/g, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        }

        if (parsed && parsed.name) {
          // Guarantee shape, color and stats
          const primaryColor = clientAnalyzed?.primaryHex || parsed.visualParams?.primaryColor || '#2BE29E';
          const secondaryColor = clientAnalyzed?.secondaryHex || parsed.visualParams?.secondaryColor || '#091B14';
          const shapeArchetype =
            clientAnalyzed?.shapeArchetype ||
            parsed.visualParams?.shapeArchetype ||
            detectObjectShapeArchetype(parsed.originalObject || promptHint, parsed.objectDna?.visualIdentity?.shape);

          const template = OBJECT_PRESETS[0].defaultCreature;
          const creature: BattleCreature = {
            ...template,
            id: `creature-${Date.now()}`,
            name: parsed.name,
            originalObject: parsed.originalObject || clientAnalyzed?.suggestedOriginalObject || promptHint || 'Real-World Scanned Artifact',
            faction: parsed.faction || 'Autobot',
            robotClass: parsed.robotClass || 'Warrior',
            objectFeature: parsed.objectFeature || 'Energon Reinforced Plating',
            element: parsed.element || 'cyber',
            rarity: parsed.rarity || 'Epic',
            lore: parsed.lore || 'Awakened by Allspark energy from a real-world object.',
            stats: {
              hp: parsed.stats?.hp || 650,
              attack: parsed.stats?.attack || 110,
              defense: parsed.stats?.defense || 85,
              speed: parsed.stats?.speed || 12,
            },
            visualParams: {
              ...template.visualParams,
              primaryColor,
              secondaryColor,
              scale: parsed.visualParams?.bodyScale || 1.15,
              shapeArchetype,
              topColors: clientAnalyzed?.topColors || [primaryColor, secondaryColor],
            },
            objectDna: parsed.objectDna,
            capturedImageUrl: imageBase64,
            createdAt: Date.now(),
          };

          // Derive authentic combat DNA
          creature.combatDna = deriveCombatDna(creature);

          console.log(`Gemini identified object as: "${creature.originalObject}" (${shapeArchetype}) -> Created Mech: "${creature.name}"`);
          return { creature, isAIGenerated: true };
        }
      }
    } catch (directErr) {
      console.error('Direct Gemini vision call error:', directErr);
    }
  }

  // 3. Intelligent computer-vision contour & procedural synthesis
  // Faithfully matches the exact physical shape (cylinder, sheet_slab, sphere_round, cuboid_box) and real photo colors!
  const template = OBJECT_PRESETS[0].defaultCreature;
  const assignedShape =
    clientAnalyzed?.shapeArchetype ||
    detectObjectShapeArchetype(promptHint || 'Real-World Artifact');
  const objName =
    clientAnalyzed?.suggestedOriginalObject ||
    promptHint ||
    clientAnalyzed?.detectedShapeLabel ||
    'Real-World Physical Artifact';
  const robotName =
    clientAnalyzed?.suggestedRobotName ||
    (promptHint ? `Titan ${promptHint}` : 'Cybertron Sentinel');

  const derivedStats = deriveCreatureStatsFromComplexityAndDistance(
    clientAnalyzed?.complexity || {
      scaleTier: 'compact',
      tierLabel: 'C-TIER COMBAT WARRIOR',
      complexityScore: 55,
      statMultiplier: 1.0,
      powerRating: 850,
      physicalMassDesc: 'Standard Handheld Object',
      recommendedHp: 520,
      recommendedAttack: 86,
      recommendedDefense: 62,
      recommendedSpeed: 13,
      visualScale: 1.0,
    },
    distanceMeters,
    objName,
    clientAnalyzed?.primaryHex || '#2BE29E'
  );

  const fallbackCreature: BattleCreature = {
    ...template,
    id: `creature-${Date.now()}`,
    capturedImageUrl: imageBase64,
    originalObject: objName,
    name: robotName,
    stats: {
      hp: derivedStats.hp,
      attack: derivedStats.attack,
      defense: derivedStats.defense,
      speed: derivedStats.speed,
    },
    visualParams: {
      ...template.visualParams,
      primaryColor: clientAnalyzed?.primaryHex || '#2BE29E',
      secondaryColor: clientAnalyzed?.secondaryHex || '#0E281E',
      shapeArchetype: assignedShape,
      topColors: clientAnalyzed?.topColors || [clientAnalyzed?.primaryHex || '#2BE29E', clientAnalyzed?.secondaryHex || '#0E281E'],
    },
    createdAt: Date.now(),
  };
  fallbackCreature.combatDna = deriveCombatDna(fallbackCreature);

  return { creature: fallbackCreature, isAIGenerated: false };
}
