import { DiscoveryZone } from '../types/exploration';
import { calculateHaversineDistance, calculateDestinationPoint } from './geoUtils';

export const CLAIMED_GARDENS_STORAGE_KEY = 'matter_born_claimed_gardens_24h_v1';
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

interface ClaimedGardensRecord {
  timestamp: number;
  ids: string[];
}

/**
 * Retrieves the set of garden IDs claimed by the player within the last 24 hours.
 */
export function getClaimedGardenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(CLAIMED_GARDENS_STORAGE_KEY);
    if (!raw) return new Set();
    const data: ClaimedGardensRecord = JSON.parse(raw);
    if (!data.timestamp || Date.now() - data.timestamp > TWENTY_FOUR_HOURS_MS) {
      localStorage.removeItem(CLAIMED_GARDENS_STORAGE_KEY);
      return new Set();
    }
    return new Set(data.ids || []);
  } catch {
    return new Set();
  }
}

/**
 * Records a claimed garden zone into localStorage with 24-hour expiration.
 */
export function markGardenClaimedInStorage(zoneId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getClaimedGardenIds();
    current.add(zoneId);
    const record: ClaimedGardensRecord = {
      timestamp: Date.now(),
      ids: Array.from(current),
    };
    localStorage.setItem(CLAIMED_GARDENS_STORAGE_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('Failed to save claimed garden ID:', err);
  }
}

/**
 * Resets the 24-hour claimed gardens storage (called on 24-hr reset or new expedition).
 */
export function resetClaimedGardensStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CLAIMED_GARDENS_STORAGE_KEY);
  } catch {}
}

interface OverpassElement {
  type: 'node' | 'way';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: {
    name?: string;
    'name:en'?: string;
    leisure?: string;
    park?: string;
    garden?: string;
  };
}

/**
 * Deterministic procedural fallback nature zones situated at natural outdoor walking distances around the player.
 */
function generateProceduralNatureZones(
  centerLat: number,
  centerLon: number,
  claimedSet: Set<string>
): DiscoveryZone[] {
  const proceduralTemplates: Array<{
    title: string;
    category: 'garden' | 'playground' | 'park' | 'ground';
    distanceMeters: number;
    bearing: number;
  }> = [
    {
      title: 'Verdant Oasis Garden',
      category: 'garden',
      distanceMeters: 175,
      bearing: 42,
    },
    {
      title: 'Solar Kinetic Playground',
      category: 'playground',
      distanceMeters: 310,
      bearing: 285,
    },
    {
      title: 'Echo Canopy Park',
      category: 'park',
      distanceMeters: 520,
      bearing: 135,
    },
    {
      title: 'Victory Athletic Ground',
      category: 'ground',
      distanceMeters: 780,
      bearing: 215,
    },
    {
      title: 'Aether Blossom Garden',
      category: 'garden',
      distanceMeters: 1050,
      bearing: 350,
    },
  ];

  return proceduralTemplates.map((t, idx) => {
    const dest = calculateDestinationPoint(centerLat, centerLon, t.distanceMeters, t.bearing);
    const id = `proc-nature-${idx + 1}`;
    const claimed = claimedSet.has(id);

    return {
      id,
      milestoneDistance: t.distanceMeters,
      tier: 'SCOUT',
      title: t.title,
      codename: `STAR-${t.category.toUpperCase()}-${idx + 1}`,
      latitude: dest.latitude,
      longitude: dest.longitude,
      unlocked: true,
      claimed,
      bonusTitle: 'Bonus 1000 EP',
      bonusDescription: 'Outdoor Motivation Bonus: Reach this garden or ground to earn +1,000 EP!',
      accentColor: '#F59E0B',
      isGarden: true,
      bonusEp: 1000,
      category: t.category,
    };
  });
}

/**
 * Queries OpenStreetMap Overpass API for real gardens, parks, and playgrounds within 2,500m of coordinates.
 * Seamlessly falls back and augments with procedural nature hubs when offline or in sparse regions.
 */
export async function fetchNearbyGardensAndParks(
  lat: number,
  lon: number
): Promise<DiscoveryZone[]> {
  const claimedSet = getClaimedGardenIds();
  const proceduralZones = generateProceduralNatureZones(lat, lon, claimedSet);

  // If coordinates are invalid or zero, return procedural
  if (!lat || !lon || Math.abs(lat) < 0.0001) {
    return proceduralZones;
  }

  const query = `[out:json][timeout:4];(node["leisure"~"park|garden|playground|pitch"](around:2500,${lat},${lon});way["leisure"~"park|garden|playground|pitch"](around:2500,${lat},${lon}););out center 12;`;

  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
  ];

  for (const url of endpoints) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3800);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (!response.ok) continue;
      const data = await response.json();
      if (!data || !Array.isArray(data.elements)) continue;

      const elements: OverpassElement[] = data.elements;
      const realZones: DiscoveryZone[] = [];

      for (const el of elements) {
        const itemLat = el.type === 'way' ? el.center?.lat : el.lat;
        const itemLon = el.type === 'way' ? el.center?.lon : el.lon;
        if (!itemLat || !itemLon) continue;

        const dist = calculateHaversineDistance(lat, lon, itemLat, itemLon);
        // Exclude items that are immediately stacked (< 60m from another added zone)
        const isDuplicate = realZones.some(
          (rz) => calculateHaversineDistance(rz.latitude, rz.longitude, itemLat, itemLon) < 60
        );
        if (isDuplicate) continue;

        const leisure = el.tags?.leisure || 'park';
        const defaultName =
          leisure === 'playground'
            ? 'Playground'
            : leisure === 'garden'
            ? 'Community Garden'
            : leisure === 'pitch'
            ? 'Sports Ground'
            : 'City Park';

        const name = el.tags?.name || el.tags?.['name:en'] || defaultName;
        const id = `osm-nature-${el.id}`;
        const claimed = claimedSet.has(id);

        realZones.push({
          id,
          milestoneDistance: Math.round(dist),
          tier: dist < 250 ? 'SCOUT' : dist < 600 ? 'RANGER' : 'VANGUARD',
          title: name,
          codename: `STAR-${leisure.toUpperCase()}-${el.id}`,
          latitude: itemLat,
          longitude: itemLon,
          unlocked: true,
          claimed,
          bonusTitle: 'Bonus 1000 EP',
          bonusDescription: `Outdoor Nature Hub: Reach ${name} to claim +1,000 Bonus EP!`,
          accentColor: '#F59E0B',
          isGarden: true,
          bonusEp: 1000,
          category: (leisure === 'playground'
            ? 'playground'
            : leisure === 'garden'
            ? 'garden'
            : leisure === 'pitch'
            ? 'pitch'
            : 'park') as any,
        });

        if (realZones.length >= 8) break;
      }

      if (realZones.length >= 3) {
        // Sort by distance from player
        realZones.sort((a, b) => a.milestoneDistance - b.milestoneDistance);
        return realZones;
      } else if (realZones.length > 0) {
        // Supplement with procedural zones that aren't too close to the real ones
        const combined = [...realZones];
        for (const p of proceduralZones) {
          const hasOverlap = realZones.some(
            (rz) => calculateHaversineDistance(rz.latitude, rz.longitude, p.latitude, p.longitude) < 120
          );
          if (!hasOverlap) {
            combined.push(p);
          }
          if (combined.length >= 6) break;
        }
        combined.sort((a, b) => a.milestoneDistance - b.milestoneDistance);
        return combined;
      }
    } catch {
      clearTimeout(timeoutId);
      // Try next endpoint or fall back
    }
  }

  // If Overpass failed or offline, return procedural nature zones
  return proceduralZones;
}
