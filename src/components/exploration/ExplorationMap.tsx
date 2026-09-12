import React, { useEffect, useState, useMemo } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  ExplorationOrigin,
  GeoLocationReading,
  DiscoveryZone,
} from '../../types/exploration';
import { MapPin, Navigation, Compass, Sparkles, Crosshair, AlertCircle } from 'lucide-react';
import { formatExplorationDistance } from '../../utils/geoUtils';

interface ExplorationMapProps {
  origin: ExplorationOrigin | null;
  currentLocation: GeoLocationReading | null;
  discoveryZones: DiscoveryZone[];
  distanceExplored: number;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  onSelectZone?: (zone: DiscoveryZone) => void;
  onBackToLobby?: () => void;
  className?: string;
}

// Custom map camera updater hook
function MapCameraController({
  currentLocation,
  origin,
}: {
  currentLocation: GeoLocationReading | null;
  origin: ExplorationOrigin | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (currentLocation) {
      map.panTo({
        lat: currentLocation.latitude,
        lng: currentLocation.longitude,
      });
    } else if (origin) {
      map.panTo({
        lat: origin.latitude,
        lng: origin.longitude,
      });
    }
  }, [map, currentLocation?.latitude, currentLocation?.longitude, origin?.latitude, origin?.longitude]);

  return null;
}

export const ExplorationMap: React.FC<ExplorationMapProps> = ({
  origin,
  currentLocation,
  discoveryZones,
  distanceExplored,
  breadcrumbs,
  onSelectZone,
  onBackToLobby,
  className = '',
}) => {
  const [selectedZone, setSelectedZone] = useState<DiscoveryZone | null>(null);
  const [mapError, setMapError] = useState<boolean>(false);

  // Retrieve Google Maps API key from environment variable
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Center coordinate: prefer player position, then origin, then default
  const center = useMemo(() => {
    if (currentLocation) {
      return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    }
    if (origin) {
      return { lat: origin.latitude, lng: origin.longitude };
    }
    return { lat: 37.7955, lng: -122.3937 };
  }, [currentLocation?.latitude, currentLocation?.longitude, origin?.latitude, origin?.longitude]);

  // Tactical game style options for clean readability
  const mapOptions: google.maps.MapOptions = useMemo(
    () => ({
      disableDefaultUI: true,
      zoomControl: true,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      maxZoom: 20,
      minZoom: 12,
    }),
    []
  );

  return (
    <div className={`relative w-full h-full min-h-[380px] sm:min-h-[460px] rounded-2xl overflow-hidden border border-[#CFE2D3] bg-[#0E1B13] shadow-inner ${className}`}>
      {apiKey && !mapError ? (
        <APIProvider apiKey={apiKey} onError={() => setMapError(true)}>
          <div className="w-full h-full" style={{ minHeight: '100%', height: '100%' }}>
            <Map
              defaultCenter={center}
              defaultZoom={16}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              options={mapOptions}
              style={{ width: '100%', height: '100%' }}
            >
              <MapCameraController currentLocation={currentLocation} origin={origin} />

              {/* 1. START / ORIGIN MARKER */}
              {origin && (
                <AdvancedMarker
                  position={{ lat: origin.latitude, lng: origin.longitude }}
                  title="Expedition Origin"
                >
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="px-2 py-0.5 rounded-md bg-emerald-950/90 border border-emerald-400 text-[10px] font-black text-emerald-300 shadow-md backdrop-blur-xs tracking-wider uppercase">
                      📍 START
                    </div>
                    <div className="relative mt-0.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/30 animate-ping absolute inset-0 -m-1" />
                      <div className="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white text-white flex items-center justify-center shadow-lg">
                        <MapPin className="w-4 h-4 fill-current" />
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* 2. PLAYER CURRENT LOCATION MARKER */}
              {currentLocation && (
                <AdvancedMarker
                  position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
                  title="Player Location"
                  zIndex={50}
                >
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="px-2 py-0.5 rounded-md bg-sky-950/90 border border-sky-400 text-[10px] font-black text-sky-300 shadow-md backdrop-blur-xs tracking-wider uppercase mb-1">
                      🔵 PLAYER
                    </div>
                    <div className="relative flex items-center justify-center">
                      {/* Pulsing GPS beacon ring */}
                      <div className="w-12 h-12 rounded-full bg-sky-500/25 animate-pulse absolute" />
                      {/* Core player radar puck */}
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-sky-600 shadow-xl flex items-center justify-center relative">
                        <div className="w-3.5 h-3.5 rounded-full bg-sky-600 flex items-center justify-center">
                          <Navigation
                            className="w-2.5 h-2.5 text-white transition-transform"
                            style={{
                              transform: `rotate(${currentLocation.heading || 0}deg)`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              )}

              {/* 3. DISCOVERY ZONE BEACONS */}
              {discoveryZones.map((zone) => {
                const isReached = distanceExplored >= zone.milestoneDistance;
                return (
                  <AdvancedMarker
                    key={zone.id}
                    position={{ lat: zone.latitude, lng: zone.longitude }}
                    onClick={() => {
                      setSelectedZone(zone);
                      if (onSelectZone) onSelectZone(zone);
                    }}
                    title={`${zone.title} (${zone.milestoneDistance}m)`}
                  >
                    <div className="flex flex-col items-center cursor-pointer group">
                      <div
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black border shadow-md backdrop-blur-xs transition-transform group-hover:scale-105 ${
                          isReached
                            ? 'bg-amber-400 text-amber-950 border-amber-300'
                            : 'bg-emerald-950/80 text-emerald-200 border-emerald-600/60'
                        }`}
                      >
                        ⭐ Discovery ({zone.milestoneDistance}m)
                      </div>
                      <div className="relative mt-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white shadow-lg transition-transform group-hover:scale-110"
                          style={{ backgroundColor: isReached ? '#F59E0B' : zone.accentColor }}
                        >
                          <Sparkles className="w-3.5 h-3.5 fill-current" />
                        </div>
                      </div>
                    </div>
                  </AdvancedMarker>
                );
              })}

              {/* InfoWindow for Selected Discovery Zone */}
              {selectedZone && (
                <InfoWindow
                  position={{ lat: selectedZone.latitude, lng: selectedZone.longitude }}
                  onCloseClick={() => setSelectedZone(null)}
                >
                  <div className="p-2 max-w-[220px] text-stone-900 select-none">
                    <div className="flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700">
                      <span>{selectedZone.codename}</span>
                      <span>•</span>
                      <span>{selectedZone.tier}</span>
                    </div>
                    <h4 className="font-bold text-xs text-stone-900 mt-0.5">
                      {selectedZone.title}
                    </h4>
                    <p className="text-[11px] text-stone-600 mt-1 leading-tight">
                      {selectedZone.bonusDescription}
                    </p>
                    <div className="mt-2 pt-1.5 border-t border-stone-200 flex items-center justify-between text-[10px] font-semibold">
                      <span className="text-stone-500">Distance Target:</span>
                      <span className="font-bold text-emerald-800">
                        {selectedZone.milestoneDistance} m
                      </span>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </div>
        </APIProvider>
      ) : (
        /* Tactical Radar Map (High-Fidelity Canvas Fallback when API key is pending or in preview) */
        <div className="relative w-full h-full">
          <TacticalRadarMap
            origin={origin}
            currentLocation={currentLocation}
            discoveryZones={discoveryZones}
            distanceExplored={distanceExplored}
            breadcrumbs={breadcrumbs}
            onSelectZone={onSelectZone}
          />

          {/* Missing API Key Notice Card */}
          {(!apiKey || mapError) && (
            <div className="absolute inset-x-3 bottom-3 z-20 p-3.5 rounded-xl bg-[#08120B]/92 backdrop-blur-md border border-amber-500/40 shadow-2xl text-white">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>EXPLORATION MAP NOT CONFIGURED</span>
                  </div>
                  <p className="text-[11px] text-stone-300">
                    Google Maps API key required for Exploration Mode. Add <code className="text-amber-300 font-mono text-[10px] bg-black/40 px-1 py-0.5 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to enable the real-world map.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  {onBackToLobby && (
                    <button
                      type="button"
                      onClick={onBackToLobby}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition-colors cursor-pointer"
                    >
                      CONTINUE TO ARENA
                    </button>
                  )}
                  <div className="flex-1 sm:flex-initial px-3.5 py-2 rounded-lg bg-emerald-700/80 text-emerald-200 text-xs font-bold border border-emerald-500/40 text-center">
                    TACTICAL RADAR ACTIVE
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Tactical Map Overlay HUD */}
      <div className="absolute top-3 left-3 right-3 pointer-events-none flex items-center justify-between gap-2 z-10">
        <div className="pointer-events-auto px-3 py-1.5 rounded-xl bg-[#0E1B13]/85 backdrop-blur-md border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-mono font-bold tracking-wider text-[11px]">
            {apiKey && !mapError ? 'GOOGLE MAPS LIVE' : 'TACTICAL RADAR HUD'}
          </span>
          {currentLocation?.accuracy && (
            <span className="text-[10px] text-emerald-400/80 pl-1 border-l border-emerald-700/60">
              ±{Math.round(currentLocation.accuracy)}m
            </span>
          )}
        </div>

        <div className="pointer-events-auto px-2.5 py-1.5 rounded-xl bg-[#0E1B13]/85 backdrop-blur-md border border-emerald-500/30 text-xs text-white flex items-center gap-1.5 shadow-lg">
          <Compass className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-mono text-[11px] font-bold">
            {formatExplorationDistance(distanceExplored)}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Tactical Radar Fallback Map
 * Rendered seamlessly with SVG/Canvas when running without an external API key or in offline/isolated environments.
 */
const TacticalRadarMap: React.FC<{
  origin: ExplorationOrigin | null;
  currentLocation: GeoLocationReading | null;
  discoveryZones: DiscoveryZone[];
  distanceExplored: number;
  breadcrumbs: Array<{ lat: number; lng: number; timestamp: number }>;
  onSelectZone?: (zone: DiscoveryZone) => void;
}> = ({ origin, currentLocation, discoveryZones, distanceExplored, breadcrumbs, onSelectZone }) => {
  // Compute normalized local Cartesian bounds (center around player or origin)
  const baseLat = origin ? origin.latitude : 37.7955;
  const baseLng = origin ? origin.longitude : -122.3937;

  // Scale: 1 meter = 0.22 pixels in view (1000m = 220px radius)
  const scale = 0.22;
  const cx = 200;
  const cy = 200;

  // Converts lat/lng offset to local SVG coordinates relative to origin
  const toSvgCoords = (lat: number, lng: number) => {
    const latMeters = (lat - baseLat) * 111000;
    const lngMeters = (lng - baseLng) * (111000 * Math.cos((baseLat * Math.PI) / 180));
    return {
      x: cx + lngMeters * scale,
      y: cy - latMeters * scale, // SVG y is inverted
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
        <div className="w-[360px] h-[360px] rounded-full border border-emerald-500/20 relative animate-spin" style={{ animationDuration: '8s' }}>
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
              <circle
                r="4"
                fill={isReached ? '#F59E0B' : zone.accentColor}
              />
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
