import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ExplorationOrigin,
  GeoLocationReading,
  DiscoveryZone,
} from '../../types/exploration';
import {
  Compass,
  Navigation,
  Crosshair,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Layers,
  MapPin,
  ShieldCheck,
  Radio,
  Footprints,
  Eye,
} from 'lucide-react';
import { formatExplorationDistance } from '../../utils/geoUtils';

export interface RealWorldExplorationMapProps {
  origin: ExplorationOrigin | null;
  currentLocation: GeoLocationReading | null;
  discoveryZones: DiscoveryZone[];
  distanceExplored: number;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  speedMps?: number;
  isStationary?: boolean;
  gpsStatus?: string;
  nextMilestoneTitle?: string;
  nextMilestoneDistance?: number;
  onSelectZone?: (zone: DiscoveryZone) => void;
  onBackToLobby?: () => void;
  className?: string;
}

/**
 * Isolated OpenStreetMap Tile Configuration.
 * The provider configuration is kept isolated so it can be swapped without rewriting the map layer.
 */
export const OPENSTREETMAP_CONFIG = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
  subdomains: ['a', 'b', 'c'],
  maxZoom: 19,
  minZoom: 2,
};

/**
 * Creates custom HTML Leaflet DivIcons matching the Matter Born / Animatrix theme.
 */
function createStartIcon(): L.DivIcon {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="flex flex-col items-center select-none" style="transform: translate(-50%, -100%);">
        <div class="px-2 py-0.5 rounded-md bg-emerald-950/95 border border-emerald-400 text-[10px] font-black text-emerald-300 shadow-md tracking-wider uppercase whitespace-nowrap text-center">
          📍 START
        </div>
        <div class="relative flex items-center justify-center mt-1">
          <div class="w-8 h-8 rounded-full bg-emerald-500/30 animate-ping absolute inset-0 -m-0.5"></div>
          <div class="w-8 h-8 rounded-full bg-emerald-700 border-2 border-white text-white flex items-center justify-center shadow-lg">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createPlayerIcon(heading: number = 0): L.DivIcon {
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="flex flex-col items-center select-none" style="transform: translate(-50%, -50%);">
        <div class="px-2 py-0.5 rounded-md bg-sky-950/95 border border-sky-400 text-[10px] font-black text-sky-300 shadow-md tracking-wider uppercase whitespace-nowrap mb-1 text-center">
          🔵 PLAYER
        </div>
        <div class="relative flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-sky-500/25 animate-pulse absolute"></div>
          <div class="w-7 h-7 rounded-full bg-white border-2 border-sky-600 shadow-xl flex items-center justify-center relative">
            <div class="w-4 h-4 rounded-full bg-sky-600 flex items-center justify-center" style="transform: rotate(${heading}deg);">
              <svg class="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="3 11 22 2 13 21 11 13 3 11" fill="currentColor"/></svg>
            </div>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function createDiscoveryIcon(
  zone: DiscoveryZone,
  isReached: boolean
): L.DivIcon {
  const accentColor = isReached ? '#F59E0B' : zone.accentColor;
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `
      <div class="flex flex-col items-center select-none cursor-pointer group" style="transform: translate(-50%, -100%);">
        <div class="px-2 py-0.5 rounded-md text-[9px] font-black border shadow-md whitespace-nowrap text-center transition-transform group-hover:scale-105 ${
          isReached
            ? 'bg-amber-400 text-amber-950 border-amber-300 ring-2 ring-amber-400/50'
            : 'bg-emerald-950/90 text-emerald-200 border-emerald-600/70'
        }">
          ⭐ Discovery (${zone.milestoneDistance}m)
        </div>
        <div class="relative mt-1 flex items-center justify-center">
          ${isReached ? '<div class="w-8 h-8 rounded-full bg-amber-400/35 animate-ping absolute"></div>' : ''}
          <div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg transition-transform group-hover:scale-110" style="background-color: ${accentColor};">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.2h7.6l-6 4.8 2.4 7.2-6.4-4.8-6.4 4.8 2.4-7.2-6-4.8h7.6z"/></svg>
          </div>
        </div>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export const RealWorldExplorationMap: React.FC<RealWorldExplorationMapProps> = ({
  origin,
  currentLocation,
  discoveryZones,
  distanceExplored,
  breadcrumbs,
  speedMps = 0,
  isStationary = false,
  gpsStatus = 'GPS READY',
  nextMilestoneTitle,
  nextMilestoneDistance,
  onSelectZone,
  onBackToLobby,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Marker references for efficient imperative updates
  const startMarkerRef = useRef<L.Marker | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const discoveryMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const breadcrumbPolylineRef = useRef<L.Polyline | null>(null);

  // State
  const [isFollowMode, setIsFollowMode] = useState<boolean>(true);
  const [tileErrorDetected, setTileErrorDetected] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'radar'>('map');
  const [selectedZone, setSelectedZone] = useState<DiscoveryZone | null>(null);
  const isInitialCenteringDone = useRef<boolean>(false);

  // Determine effective coordinates for fallback / initial center
  const defaultCoord = useMemo<[number, number]>(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (origin) return [origin.latitude, origin.longitude];
    return [37.7955, -122.3937];
  }, [currentLocation?.latitude, currentLocation?.longitude, origin?.latitude, origin?.longitude]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: defaultCoord,
        zoom: 16,
        zoomControl: true,
        attributionControl: true,
      });

      const tileLayer = L.tileLayer(OPENSTREETMAP_CONFIG.url, {
        attribution: OPENSTREETMAP_CONFIG.attribution,
        subdomains: OPENSTREETMAP_CONFIG.subdomains,
        maxZoom: OPENSTREETMAP_CONFIG.maxZoom,
        minZoom: OPENSTREETMAP_CONFIG.minZoom,
      });

      tileLayer.on('tileerror', () => {
        setTileErrorDetected(true);
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Handle user pan/drag: switch to manual map mode so the map doesn't snap back
      map.on('dragstart', () => {
        setIsFollowMode(false);
      });
      map.on('zoomstart', (e: L.LeafletEvent) => {
        // If triggered by user interaction
        const originalEvent = (e as any).originalEvent;
        if (originalEvent) {
          setIsFollowMode(false);
        }
      });

      // Breadcrumb polyline
      const polyline = L.polyline([], {
        color: '#10B981',
        weight: 4,
        opacity: 0.85,
        dashArray: '6, 6',
        lineCap: 'round',
      }).addTo(map);
      breadcrumbPolylineRef.current = polyline;

      mapInstanceRef.current = map;
    } catch (err) {
      console.warn('Leaflet map initialization notice:', err);
      setTileErrorDetected(true);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        startMarkerRef.current = null;
        playerMarkerRef.current = null;
        discoveryMarkersRef.current.clear();
        breadcrumbPolylineRef.current = null;
      }
    };
  }, []);

  // Update Breadcrumb Polyline
  useEffect(() => {
    if (!breadcrumbPolylineRef.current) return;
    const latLngs: L.LatLngExpression[] = breadcrumbs.map((b) => [b.lat, b.lng]);
    breadcrumbPolylineRef.current.setLatLngs(latLngs);
  }, [breadcrumbs]);

  // Update Start / Origin Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (origin) {
      const latLng: [number, number] = [origin.latitude, origin.longitude];
      if (!startMarkerRef.current) {
        const marker = L.marker(latLng, {
          icon: createStartIcon(),
          zIndexOffset: 100,
        }).addTo(map);
        marker.bindPopup(`
          <div class="p-2.5 text-stone-900 select-none">
            <div class="text-[10px] font-black uppercase text-emerald-700 tracking-wider">EXPEDITION ORIGIN</div>
            <div class="font-bold text-xs text-stone-900 mt-0.5">Start Anchor Locked</div>
            <p class="text-[11px] text-stone-600 mt-1">Real-world distance is tracked relative to this point.</p>
          </div>
        `);
        startMarkerRef.current = marker;
      } else {
        startMarkerRef.current.setLatLng(latLng);
      }

      // Initial center on origin if player hasn't moved yet
      if (!isInitialCenteringDone.current && !currentLocation) {
        map.setView(latLng, 16);
        isInitialCenteringDone.current = true;
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
  }, [origin, currentLocation]);

  // Update Player Marker & Camera Follow
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLocation) {
      const latLng: [number, number] = [currentLocation.latitude, currentLocation.longitude];
      const heading = currentLocation.heading || 0;

      if (!playerMarkerRef.current) {
        const marker = L.marker(latLng, {
          icon: createPlayerIcon(heading),
          zIndexOffset: 500,
        }).addTo(map);
        marker.bindPopup(`
          <div class="p-2.5 text-stone-900 select-none">
            <div class="text-[10px] font-black uppercase text-sky-700 tracking-wider">CURRENT EXPLORER POSITION</div>
            <div class="font-bold text-xs text-stone-900 mt-0.5">Live Phone GPS</div>
            <div class="text-[11px] text-stone-600 mt-1 flex items-center justify-between gap-2">
              <span>Accuracy:</span>
              <span class="font-bold text-sky-800">±${Math.round(currentLocation.accuracy)}m</span>
            </div>
          </div>
        `);
        playerMarkerRef.current = marker;
      } else {
        playerMarkerRef.current.setLatLng(latLng);
        playerMarkerRef.current.setIcon(createPlayerIcon(heading));
      }

      // Camera follow logic
      if (isFollowMode) {
        map.panTo(latLng, { animate: true, duration: 0.5 });
      }

      if (!isInitialCenteringDone.current) {
        map.setView(latLng, 16);
        isInitialCenteringDone.current = true;
      }
    }
  }, [currentLocation, isFollowMode]);

  // Update Discovery Zone Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const currentMap = discoveryMarkersRef.current;
    const activeZoneIds = new Set(discoveryZones.map((z) => z.id));

    // Remove obsolete markers
    for (const [id, marker] of currentMap.entries()) {
      if (!activeZoneIds.has(id)) {
        marker.remove();
        currentMap.delete(id);
      }
    }

    // Add or update markers
    discoveryZones.forEach((zone) => {
      const latLng: [number, number] = [zone.latitude, zone.longitude];
      const isReached = distanceExplored >= zone.milestoneDistance;

      let marker = currentMap.get(zone.id);
      if (!marker) {
        marker = L.marker(latLng, {
          icon: createDiscoveryIcon(zone, isReached),
          zIndexOffset: isReached ? 250 : 200,
        }).addTo(map);

        marker.on('click', () => {
          setSelectedZone(zone);
          if (onSelectZone) onSelectZone(zone);
        });

        currentMap.set(zone.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(createDiscoveryIcon(zone, isReached));
        marker.setZIndexOffset(isReached ? 250 : 200);
      }
    });
  }, [discoveryZones, distanceExplored, onSelectZone]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 17, { animate: true });
      setIsFollowMode(true);
    } else if (origin) {
      map.setView([origin.latitude, origin.longitude], 16, { animate: true });
      setIsFollowMode(true);
    }
  }, [currentLocation, origin]);

  return (
    <div
      className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-[#CFE2D3] bg-[#0E1B13] shadow-inner ${className}`}
    >
      {/* 1. Real-World Leaflet OpenStreetMap Layer */}
      <div
        ref={mapContainerRef}
        className={`w-full h-full ${viewMode === 'radar' ? 'hidden' : 'block'}`}
        style={{ minHeight: '100%', height: '100%' }}
      />

      {/* 2. Tactical Radar HUD (Fallback or alternate view) */}
      {viewMode === 'radar' && (
        <div className="w-full h-full relative">
          <TacticalRadarMap
            origin={origin}
            currentLocation={currentLocation}
            discoveryZones={discoveryZones}
            distanceExplored={distanceExplored}
            breadcrumbs={breadcrumbs}
            onSelectZone={onSelectZone}
          />
        </div>
      )}

      {/* 3. Map Tile Offline / Error Notification Banner */}
      {tileErrorDetected && viewMode === 'map' && (
        <div className="absolute inset-x-3 bottom-14 z-20 p-3 rounded-xl bg-[#08120B]/92 backdrop-blur-md border border-amber-500/40 shadow-2xl text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-amber-300">MAP CONNECTION NOTICE:</span>{' '}
                <span className="text-stone-300">OpenStreetMap tiles may be slow or offline. GPS tracking & distance remain 100% active.</span>
              </div>
            </div>
            <button
              onClick={() => setViewMode('radar')}
              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold shrink-0 transition-colors"
            >
              SWITCH TO RADAR
            </button>
          </div>
        </div>
      )}

      {/* 4. Top Floating Navigation & Telemetry Bar */}
      <div className="absolute top-3 left-3 right-3 pointer-events-none flex items-center justify-between gap-2 z-10">
        {/* Left: GPS Live Status Badge */}
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#0E1B13]/85 backdrop-blur-md border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono font-bold tracking-wider text-[11px]">
            {viewMode === 'map' ? 'MAP VIEW' : 'RADAR VIEW'}
          </span>
        </div>

        {/* Right: Distance & Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Recenter Button */}
          <button
            onClick={handleRecenter}
            className={`px-2.5 py-1.5 rounded-xl backdrop-blur-md border text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
              isFollowMode
                ? 'bg-[#0E1B13]/85 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500 text-amber-950 border-amber-400 animate-bounce-gentle'
            }`}
            title={isFollowMode ? 'Follow Mode Active' : 'Recenter map on player'}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {isFollowMode ? 'FOLLOWING' : 'RECENTER'}
            </span>
          </button>

          {/* View Mode Toggle (OSM Map vs Radar) */}
          <button
            onClick={() => setViewMode(viewMode === 'map' ? 'radar' : 'map')}
            className="p-1.5 rounded-xl bg-[#0E1B13]/85 backdrop-blur-md border border-emerald-500/30 text-emerald-300 hover:text-white shadow-lg transition-colors cursor-pointer"
            title={viewMode === 'map' ? 'Switch to Radar View' : 'Switch to Street Map'}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Distance Counter Badge */}
          <div className="px-2.5 py-1.5 rounded-xl bg-[#0E1B13]/85 backdrop-blur-md border border-emerald-500/30 text-xs text-white flex items-center gap-1.5 shadow-lg">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] font-bold">
              {formatExplorationDistance(distanceExplored)}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Bottom Contextual Status & Safety Banner */}
      <div className="absolute bottom-3 left-3 right-3 pointer-events-none z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Status Pill */}
        <div className="pointer-events-auto px-3.5 py-2 rounded-xl bg-[#08120B]/90 backdrop-blur-md border border-emerald-500/30 text-white text-xs shadow-lg flex items-center justify-between sm:justify-start gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStationary ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-bold text-[11px] uppercase tracking-wider text-emerald-300">
              {isStationary ? 'STOPPED — SCAN READY' : 'EXPLORING — MOVING'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-300 pl-2 border-l border-emerald-800">
            <span>Speed: {(speedMps ?? 0).toFixed(1)} m/s</span>
            {nextMilestoneDistance && (
              <span className="hidden md:inline text-emerald-400 font-semibold">
                • Next: {formatExplorationDistance(nextMilestoneDistance)}
              </span>
            )}
          </div>
        </div>

        {/* Persistent Safety Reminder */}
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#08120B]/85 backdrop-blur-md border border-[#CFE2D3]/20 text-[10px] text-stone-300 flex items-center gap-1.5 shadow-md">
          <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Travel first. Stop somewhere safe before scanning.</span>
        </div>
      </div>

      {/* 6. Selected Discovery Zone Modal Card */}
      {selectedZone && (
        <div className="absolute inset-x-4 top-16 z-20 p-3.5 rounded-xl bg-[#08120B]/95 backdrop-blur-md border border-emerald-400 shadow-2xl text-white max-w-sm mx-auto">
          <div className="flex items-center justify-between gap-2 border-b border-emerald-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">⭐</span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-xs text-emerald-300 uppercase">
                    {selectedZone.codename}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-emerald-900 text-emerald-200 text-[9px] font-bold">
                    {selectedZone.tier}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white">{selectedZone.title}</h4>
              </div>
            </div>
            <button
              onClick={() => setSelectedZone(null)}
              className="text-stone-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-stone-300 mt-2 leading-tight">
            {selectedZone.bonusDescription}
          </p>

          <div className="mt-2.5 pt-2 border-t border-emerald-900 flex items-center justify-between text-[11px]">
            <span className="text-stone-400">Target Distance:</span>
            <span className="font-bold text-emerald-300 font-mono">
              {selectedZone.milestoneDistance} m
            </span>
          </div>

          <div className="mt-2 text-[10px] font-bold text-center py-1 rounded bg-emerald-950/80 border border-emerald-600/40 text-emerald-300">
            {distanceExplored >= selectedZone.milestoneDistance
              ? isStationary
                ? '✅ ZONE REACHED • SCAN OBJECT READY'
                : '⚠️ ZONE REACHED • STOP SAFELY TO SCAN'
              : `WALK ${Math.max(0, selectedZone.milestoneDistance - distanceExplored)}M FURTHER TO UNLOCK`}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Tactical Radar Fallback Map
 * Rendered with SVG when offline or when tactical radar mode is toggled.
 */
export const TacticalRadarMap: React.FC<{
  origin: ExplorationOrigin | null;
  currentLocation: GeoLocationReading | null;
  discoveryZones: DiscoveryZone[];
  distanceExplored: number;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  onSelectZone?: (zone: DiscoveryZone) => void;
}> = ({ origin, currentLocation, discoveryZones, distanceExplored, breadcrumbs, onSelectZone }) => {
  const baseLat = origin ? origin.latitude : 37.7955;
  const baseLng = origin ? origin.longitude : -122.3937;

  const scale = 0.22;
  const cx = 200;
  const cy = 200;

  const toSvgCoords = (lat: number, lng: number) => {
    const latMeters = (lat - baseLat) * 111000;
    const lngMeters = (lng - baseLng) * (111000 * Math.cos((baseLat * Math.PI) / 180));
    return {
      x: cx + lngMeters * scale,
      y: cy - latMeters * scale,
    };
  };

  const playerPos = currentLocation
    ? toSvgCoords(currentLocation.latitude, currentLocation.longitude)
    : { x: cx, y: cy };

  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-b from-[#08120B] via-[#0D1C12] to-[#08120B] select-none flex items-center justify-center">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, #10B981 1px, transparent 1px),
            linear-gradient(to bottom, #10B981 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Radar sweep animation */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div
          className="w-[360px] h-[360px] rounded-full border border-emerald-500/20 relative animate-spin"
          style={{ animationDuration: '8s' }}
        >
          <div className="w-1/2 h-1/2 absolute top-0 right-0 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-tr-full" />
        </div>
      </div>

      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[500px] max-h-[500px] relative z-10 overflow-visible"
      >
        {/* Milestone concentric range rings */}
        {[250, 500, 750, 1000].map((dist) => {
          const r = dist * scale;
          return (
            <g key={dist}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke="#10B981"
                strokeWidth="1"
                strokeDasharray="4,4"
                className="opacity-30"
              />
              <text
                x={cx + 6}
                y={cy - r + 12}
                fill="#34D399"
                fontSize="9"
                fontFamily="monospace"
                className="opacity-60 font-bold"
              >
                {dist}m
              </text>
            </g>
          );
        })}

        {/* Trail from Origin to Player */}
        <line
          x1={cx}
          y1={cy}
          x2={playerPos.x}
          y2={playerPos.y}
          stroke="#34D399"
          strokeWidth="2"
          strokeDasharray="3,3"
          className="opacity-70"
        />

        {/* Origin Marker */}
        <g transform={`translate(${cx}, ${cy})`}>
          <circle r="12" fill="#10B981" fillOpacity="0.2" className="animate-ping" />
          <circle r="7" fill="#047857" stroke="#34D399" strokeWidth="2" />
          <text
            y="-12"
            textAnchor="middle"
            fill="#A7F3D0"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            📍 START
          </text>
        </g>

        {/* Discovery Zones */}
        {discoveryZones.map((zone) => {
          const pos = toSvgCoords(zone.latitude, zone.longitude);
          const isReached = distanceExplored >= zone.milestoneDistance;
          return (
            <g
              key={zone.id}
              transform={`translate(${pos.x}, ${pos.y})`}
              className="cursor-pointer group"
              onClick={() => onSelectZone && onSelectZone(zone)}
            >
              <circle
                r={isReached ? 14 : 10}
                fill={isReached ? '#F59E0B' : zone.accentColor}
                fillOpacity={isReached ? 0.35 : 0.2}
                stroke={isReached ? '#FBBF24' : zone.accentColor}
                strokeWidth="2"
              />
              <circle r="4" fill={isReached ? '#F59E0B' : zone.accentColor} />
              <text
                y="-14"
                textAnchor="middle"
                fill={isReached ? '#FDE68A' : '#D1FAE5'}
                fontSize="9"
                fontFamily="sans-serif"
                fontWeight="bold"
              >
                ⭐ Discovery ({zone.milestoneDistance}m)
              </text>
            </g>
          );
        })}

        {/* Player Locator */}
        <g transform={`translate(${playerPos.x}, ${playerPos.y})`}>
          <circle r="16" fill="#38BDF8" fillOpacity="0.25" className="animate-pulse" />
          <circle r="8" fill="#0284C7" stroke="#FFFFFF" strokeWidth="2" />
          <polygon points="0,-4 3,3 0,1 -3,3" fill="#FFFFFF" />
          <text
            y="20"
            textAnchor="middle"
            fill="#E0F2FE"
            fontSize="10"
            fontFamily="sans-serif"
            fontWeight="bold"
          >
            🔵 PLAYER
          </text>
        </g>
      </svg>
    </div>
  );
};
