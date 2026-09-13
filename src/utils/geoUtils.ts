import { GeoPoint, GeoLocationReading } from '../types/exploration';
import { GPS_ACCURACY_THRESHOLD, MAX_REASONABLE_SPEED } from '../constants/explorationConfig';

/**
 * Calculates great-circle distance between two coordinates in meters using the Haversine formula.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in meters into human-readable representation.
 * Never displays street addresses or home labels.
 * Examples: "0 m", "250 m", "742 m", "1.2 km", "3.5 km"
 */
export function formatExplorationDistance(meters?: number | null): string {
  const safeMeters = Math.max(0, Number(meters) || 0);
  if (safeMeters < 1000) {
    return `${Math.round(safeMeters)} m`;
  }
  const km = safeMeters / 1000;
  return `${km.toFixed(km >= 10 ? 1 : 2)} km`;
}

/**
 * Calculates compass bearing from point 1 to point 2 in degrees (0 = North, 90 = East, etc.)
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

/**
 * Calculates a new coordinate given an origin, distance (meters), and bearing (degrees).
 */
export function calculateDestinationPoint(
  lat: number,
  lon: number,
  distanceMeters: number,
  bearingDegrees: number
): GeoPoint {
  const R = 6371000; // Earth radius in meters
  const δ = distanceMeters / R;
  const θ = (bearingDegrees * Math.PI) / 180;
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ)
  );
  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(δ) * Math.cos(φ1),
      Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2)
    );

  return {
    latitude: (φ2 * 180) / Math.PI,
    longitude: (((λ2 * 180) / Math.PI + 540) % 360) - 180,
  };
}

/**
 * Validates whether a new GPS reading is reasonable or represents noise/spoofing.
 */
export interface GpsValidationResult {
  isValid: boolean;
  reason?: string;
  isWeakSignal: boolean;
  isSuspiciousSpeed: boolean;
  effectiveSpeed: number;
}

export function validateGpsReading(
  newReading: GeoLocationReading,
  previousReading: GeoLocationReading | null
): GpsValidationResult {
  const isWeakSignal = newReading.accuracy > GPS_ACCURACY_THRESHOLD;

  if (!previousReading) {
    return {
      isValid: true,
      isWeakSignal,
      isSuspiciousSpeed: false,
      effectiveSpeed: 0,
      reason: isWeakSignal ? 'Accuracy exceeds threshold' : undefined,
    };
  }

  const distanceDelta = calculateHaversineDistance(
    previousReading.latitude,
    previousReading.longitude,
    newReading.latitude,
    newReading.longitude
  );

  const timeDeltaSec = Math.max(0.4, (newReading.timestamp - previousReading.timestamp) / 1000);
  const calculatedSpeed = distanceDelta / timeDeltaSec;
  const effectiveSpeed =
    newReading.speed !== null && newReading.speed !== undefined && newReading.speed >= 0
      ? newReading.speed
      : calculatedSpeed;

  const isSuspiciousSpeed = calculatedSpeed > MAX_REASONABLE_SPEED;

  if (isSuspiciousSpeed) {
    return {
      isValid: false,
      isWeakSignal,
      isSuspiciousSpeed: true,
      effectiveSpeed,
      reason: `Movement velocity (${calculatedSpeed.toFixed(1)} m/s) exceeds human exploration limits.`,
    };
  }

  // Only reject for weak signal if distance jump is also suspiciously large (> 35m)
  if (isWeakSignal && distanceDelta > 35) {
    return {
      isValid: false,
      isWeakSignal: true,
      isSuspiciousSpeed: false,
      effectiveSpeed,
      reason: `GPS accuracy (±${Math.round(newReading.accuracy)}m) is too imprecise.`,
    };
  }

  return {
    isValid: true,
    isWeakSignal,
    isSuspiciousSpeed: false,
    effectiveSpeed,
  };
}
