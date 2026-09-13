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
  Users,
  UserPlus,
  Swords,
  Check,
  X,
} from 'lucide-react';
import { formatExplorationDistance, calculateHaversineDistance } from '../../utils/geoUtils';
import { PlayerPresence } from '../../types/multiplayer';
import { multiplayerManager } from '../../utils/multiplayerManager';
import { sound } from '../../utils/audio';

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
  nearbyPlayers?: PlayerPresence[];
  onAddFriend?: (player: PlayerPresence) => void;
  onChallengePlayer?: (player: PlayerPresence) => void;
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
  maxZoom: 22,
  maxNativeZoom: 19,
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
          🔵 YOU ARE HERE
        </div>
        <div class="relative flex items-center justify-center">
          <div class="w-12 h-12 rounded-full bg-sky-500/25 animate-ping absolute"></div>
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

function createRemotePlayerIcon(player: PlayerPresence, isFriend: boolean): L.DivIcon {
  const isAutobot = player.faction === 'Autobot';
  const factionColor = isAutobot ? '#06b6d4' : '#f43f5e';
  const badgeColor = isFriend 
    ? 'border-emerald-400 text-emerald-100 bg-emerald-950/95 ring-2 ring-emerald-400/80 shadow-[0_0_15px_rgba(16,185,129,0.7)]' 
    : 'border-emerald-400 text-emerald-300 bg-stone-950/95';
  const badgeTitle = isFriend ? '⭐ FRIEND' : '⚔️ PILOT';
  const statusColor = player.status === 'in-battle' ? '#ef4444' : player.status === 'exploring' ? '#10b981' : '#3b82f6';

  return L.divIcon({
    className: 'custom-leaflet-icon remote-player-radar-beacon',
    html: `
      <div onclick="window.dispatchEvent(new CustomEvent('select_remote_player', { detail: '${player.id}' }))" class="flex flex-col items-center select-none cursor-pointer pointer-events-auto" style="transform: translate(-50%, -50%);">
        <div class="px-2.5 py-1 rounded-md border ${badgeColor} text-[10px] font-black shadow-lg tracking-wider uppercase whitespace-nowrap mb-1 text-center flex items-center gap-1.5 backdrop-blur-sm">
          <span class="${isFriend ? 'text-amber-300 animate-pulse font-bold' : ''}">${badgeTitle}</span>
          <span class="text-white">${player.name}</span>
        </div>
        <div class="relative flex items-center justify-center">
          <div class="w-12 h-12 rounded-full animate-ping absolute" style="background-color: ${isFriend ? '#10b98144' : statusColor + '33'};"></div>
          <div class="w-9 h-9 rounded-full bg-stone-900 border-2 shadow-xl flex items-center justify-center relative ${isFriend ? 'border-emerald-400 ring-2 ring-emerald-500/50' : ''}" style="${!isFriend ? `border-color: ${factionColor};` : ''}">
            <span class="text-sm">${isFriend ? '⭐' : '🤖'}</span>
          </div>
        </div>
      </div>
    `,
    iconSize: [80, 80],
    iconAnchor: [40, 40],
  });
}

// Discovery stars removed from map per user request

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
  nearbyPlayers = [],
  onAddFriend,
  onChallengePlayer,
  onSelectZone,
  onBackToLobby,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const remotePlayersMarkersRef = useRef<Map<string, L.Marker>>(new Map());

  const [selectedPlayer, setSelectedPlayer] = useState<PlayerPresence | null>(null);
  const [friendToast, setFriendToast] = useState<string | null>(null);

  // Marker references for efficient imperative updates
  const startMarkerRef = useRef<L.Marker | null>(null);
  const playerMarkerRef = useRef<L.Marker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const rangeRingsRef = useRef<L.Circle[]>([]);
  const discoveryMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const breadcrumbPolylineRef = useRef<L.Polyline | null>(null);

  // State
  const [isFollowMode, setIsFollowMode] = useState<boolean>(true);
  const [tileErrorDetected, setTileErrorDetected] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'map' | 'radar'>('map');
  const [selectedZone, setSelectedZone] = useState<DiscoveryZone | null>(null);
  const isInitialCenteringDone = useRef<boolean>(false);
  const [recenterToast, setRecenterToast] = useState<string | null>(null);

  // Determine effective coordinates for fallback / initial center
  const defaultCoord = useMemo<[number, number]>(() => {
    if (currentLocation) return [currentLocation.latitude, currentLocation.longitude];
    if (origin) return [origin.latitude, origin.longitude];
    return [37.7955, -122.3937];
  }, [currentLocation?.latitude, currentLocation?.longitude, origin?.latitude, origin?.longitude]);

  // Zoom handlers for custom on-map controls
  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    try {
      const map = L.map(mapContainerRef.current, {
        center: defaultCoord,
        zoom: 19,
        maxZoom: 22,
        zoomControl: false, // Prevents default top-left buttons from colliding with UI
        attributionControl: false,
      });

      const tileLayer = L.tileLayer(OPENSTREETMAP_CONFIG.url, {
        attribution: OPENSTREETMAP_CONFIG.attribution,
        subdomains: OPENSTREETMAP_CONFIG.subdomains,
        maxZoom: 22,
        maxNativeZoom: 19,
        minZoom: OPENSTREETMAP_CONFIG.minZoom,
      });

      tileLayer.on('tileerror', () => {
        setTileErrorDetected(true);
      });

      tileLayer.addTo(map);
      tileLayerRef.current = tileLayer;

      // Invalidate size shortly after mount to ensure smooth immediate rendering
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 150);

      // Handle user pan/drag: switch to manual map mode so the map doesn't snap back
      map.on('dragstart', () => {
        setIsFollowMode(false);
      });
      map.on('zoomstart', (e: L.LeafletEvent) => {
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

      return () => {
        clearTimeout(timer);
      };
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
        if (accuracyCircleRef.current) {
          accuracyCircleRef.current.remove();
          accuracyCircleRef.current = null;
        }
        rangeRingsRef.current.forEach((r) => r.remove());
        rangeRingsRef.current = [];
        discoveryMarkersRef.current.clear();
        remotePlayersMarkersRef.current.forEach((m) => m.remove());
        remotePlayersMarkersRef.current.clear();
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

  // Sync Remote Teammates & Nearby Players on OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const activeIds = new Set<string>();

    (nearbyPlayers || []).forEach((player) => {
      activeIds.add(player.id);
      const isFriend = Boolean(player.isFriend || multiplayerManager.isFriend(player.id));
      const latLng: [number, number] = [player.latitude, player.longitude];

      let marker = remotePlayersMarkersRef.current.get(player.id);
      if (!marker) {
        marker = L.marker(latLng, {
          icon: createRemotePlayerIcon(player, isFriend),
          zIndexOffset: 350,
        }).addTo(map);

        marker.on('click', () => {
          sound.playClick();
          setSelectedPlayer(player);
        });

        remotePlayersMarkersRef.current.set(player.id, marker);
      } else {
        marker.setLatLng(latLng);
        marker.setIcon(createRemotePlayerIcon(player, isFriend));
      }
    });

    // Remove inactive markers
    for (const [id, marker] of remotePlayersMarkersRef.current.entries()) {
      if (!activeIds.has(id)) {
        marker.remove();
        remotePlayersMarkersRef.current.delete(id);
      }
    }
  }, [nearbyPlayers]);

  // Handle remote player click via custom event
  useEffect(() => {
    const handleSelectRemote = (e: Event) => {
      const custom = e as CustomEvent<string>;
      const pId = custom.detail;
      const target = (nearbyPlayers || []).find((p) => p.id === pId);
      if (target) {
        sound.playClick();
        setSelectedPlayer(target);
      }
    };
    window.addEventListener('select_remote_player', handleSelectRemote);
    return () => window.removeEventListener('select_remote_player', handleSelectRemote);
  }, [nearbyPlayers]);

  // Update Start / Origin Marker & Indoor Building Range Rings
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

      // Draw concentric building perimeter rings (10m, 20m, 35m, 50m, 75m, 100m)
      rangeRingsRef.current.forEach((r) => r.remove());
      rangeRingsRef.current = [];

      const distances = [10, 20, 35, 50, 75, 100];
      distances.forEach((dist) => {
        const ring = L.circle(latLng, {
          radius: dist,
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.02,
          weight: 1.2,
          dashArray: '3, 5',
          opacity: 0.5,
        }).addTo(map);
        ring.bindTooltip(`${dist}m Ring`, { permanent: false, direction: 'top' });
        rangeRingsRef.current.push(ring);
      });

      // Initial center on origin if player hasn't moved yet
      if (!isInitialCenteringDone.current && !currentLocation) {
        map.setView(latLng, 19);
        isInitialCenteringDone.current = true;
      }
    } else if (startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
      rangeRingsRef.current.forEach((r) => r.remove());
      rangeRingsRef.current = [];
    }
  }, [origin, currentLocation]);

  // Update Player Marker & High-Accuracy GPS Circle & Camera Follow
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
            <div class="font-bold text-xs text-stone-900 mt-0.5">High-Accuracy Device GPS</div>
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

      // Live GPS accuracy circle
      const accuracyRadius = Math.max(1.5, Math.min(35, currentLocation.accuracy || 4));
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = L.circle(latLng, {
          radius: accuracyRadius,
          color: '#0284C7',
          fillColor: '#38BDF8',
          fillOpacity: 0.18,
          weight: 1.5,
          dashArray: '3, 4',
        }).addTo(map);
      } else {
        accuracyCircleRef.current.setLatLng(latLng);
        accuracyCircleRef.current.setRadius(accuracyRadius);
      }

      // Camera follow logic
      if (isFollowMode || !isInitialCenteringDone.current) {
        map.setView(latLng, 18, { animate: true });
        map.invalidateSize();
        isInitialCenteringDone.current = true;
      }
    }
  }, [currentLocation, isFollowMode]);

  // Discovery star markers removed per user request (clean map view)
  useEffect(() => {
    const currentMap = discoveryMarkersRef.current;
    for (const [, marker] of currentMap.entries()) {
      marker.remove();
    }
    currentMap.clear();
  }, [discoveryZones]);



  // Recenter handler
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (currentLocation) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 18, { animate: true });
      setIsFollowMode(true);
      setRecenterToast('Map centered on your location');
      setTimeout(() => setRecenterToast(null), 1800);
      return;
    }

    if (origin) {
      map.setView([origin.latitude, origin.longitude], 18, { animate: true });
      setIsFollowMode(true);
      setRecenterToast('Map centered on expedition origin');
      setTimeout(() => setRecenterToast(null), 1800);
      return;
    }

    // Actively query device location if not yet received
    if (navigator.geolocation) {
      setRecenterToast('Locating your position...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 18, { animate: true });
          setIsFollowMode(true);
          setRecenterToast('Location acquired!');
          setTimeout(() => setRecenterToast(null), 1800);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setRecenterToast('Location permission denied in browser');
          } else {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                map.setView([pos.coords.latitude, pos.coords.longitude], 18, { animate: true });
                setIsFollowMode(true);
                setRecenterToast('Location acquired!');
                setTimeout(() => setRecenterToast(null), 1800);
              },
              () => {
                setRecenterToast('Unable to detect location. Please check browser permissions.');
                setTimeout(() => setRecenterToast(null), 2500);
              },
              { enableHighAccuracy: false, timeout: 10000 }
            );
            return;
          }
          setTimeout(() => setRecenterToast(null), 2500);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
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

      {/* 4. Top Floating Navigation & Telemetry Bar (Zero overlaps) */}
      <div className="absolute top-3 left-3 right-3 pointer-events-none flex flex-wrap items-center justify-between gap-2 z-10">
        {/* Left: GPS Live Telemetry Status Badge */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="px-3 py-1.5 rounded-xl bg-[#0E1B13]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2 shadow-lg">
            <div
              className={`w-2 h-2 rounded-full ${
                gpsStatus === 'GPS DENIED'
                  ? 'bg-rose-400'
                  : !currentLocation
                  ? 'bg-amber-400 animate-ping'
                  : 'bg-emerald-400 animate-ping'
              }`}
            />
            <span className="font-mono font-bold tracking-wider text-[11px]">
              {gpsStatus === 'GPS DENIED'
                ? 'GPS OFFLINE'
                : !currentLocation
                ? 'ACQUIRING GPS...'
                : 'LIVE GPS'}
            </span>
            {currentLocation && (
              <span className="text-[10px] text-emerald-400 font-mono hidden sm:inline border-l border-emerald-800 pl-2">
                ±{Math.round(currentLocation.accuracy)}m
              </span>
            )}
          </div>

          {nearbyPlayers.length > 0 && (
            <div className="px-2.5 py-1.5 rounded-xl bg-[#0E1B13]/90 backdrop-blur-md border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-1.5 shadow-lg animate-in fade-in">
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {nearbyPlayers.some(p => p.isFriend || multiplayerManager.isFriend(p.id))
                  ? `${nearbyPlayers.filter(p => p.isFriend || multiplayerManager.isFriend(p.id)).length} Friend(s) on Map`
                  : `${nearbyPlayers.length} Pilots Nearby`}
              </span>
            </div>
          )}
        </div>

        {/* Right: Distance & Instant Recenter Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          {/* Always-Visible Recenter Button */}
          <button
            onClick={handleRecenter}
            className={`px-3 py-1.5 rounded-xl backdrop-blur-md border text-xs font-black flex items-center gap-1.5 shadow-xl transition-all cursor-pointer active:scale-95 ${
              isFollowMode
                ? 'bg-emerald-800/80 border-emerald-400/60 text-emerald-100 hover:bg-emerald-700'
                : 'bg-amber-500 text-amber-950 border-amber-300 hover:bg-amber-400 animate-pulse'
            }`}
            title="Recenter map on your position immediately"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-bold tracking-wider">
              RECENTER
            </span>
          </button>

          {/* View Mode Toggle (OSM Map vs Radar) */}
          <button
            onClick={() => setViewMode(viewMode === 'map' ? 'radar' : 'map')}
            className="p-1.5 rounded-xl bg-[#0E1B13]/90 backdrop-blur-md border border-emerald-500/40 text-emerald-300 hover:text-white shadow-lg transition-colors cursor-pointer"
            title={viewMode === 'map' ? 'Switch to Radar View' : 'Switch to Street Map'}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Distance Counter Badge */}
          <div className="px-2.5 py-1.5 rounded-xl bg-[#0E1B13]/90 backdrop-blur-md border border-emerald-500/40 text-xs text-white flex items-center gap-1.5 shadow-lg">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-[11px] font-bold">
              {formatExplorationDistance(distanceExplored)}
            </span>
          </div>
        </div>
      </div>

      {/* Floating Action Controls on Right Side (Easy access Recenter FAB & Zoom) */}
      {viewMode === 'map' && (
        <div className="absolute right-3.5 top-16 z-20 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Quick Recenter FAB */}
          <button
            onClick={handleRecenter}
            className={`w-9 h-9 rounded-xl backdrop-blur-md border flex items-center justify-center shadow-2xl transition-all cursor-pointer active:scale-90 ${
              isFollowMode
                ? 'bg-[#0E1B13]/90 border-emerald-500/50 text-emerald-300 hover:text-white hover:border-emerald-400'
                : 'bg-amber-500 text-amber-950 border-amber-300 animate-bounce-gentle'
            }`}
            title="Recenter on player position"
            aria-label="Recenter on player"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          {/* Custom Cyber Zoom In / Zoom Out */}
          <div className="flex flex-col rounded-xl overflow-hidden border border-emerald-500/40 bg-[#0E1B13]/90 backdrop-blur-md shadow-2xl">
            <button
              onClick={handleZoomIn}
              className="w-9 h-9 flex items-center justify-center text-emerald-200 hover:text-white hover:bg-emerald-800/50 text-base font-bold border-b border-emerald-500/30 transition-colors cursor-pointer"
              title="Zoom In"
              aria-label="Zoom In"
            >
              +
            </button>
            <button
              onClick={handleZoomOut}
              className="w-9 h-9 flex items-center justify-center text-emerald-200 hover:text-white hover:bg-emerald-800/50 text-base font-bold transition-colors cursor-pointer"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              −
            </button>
          </div>
        </div>
      )}

      {/* Recenter confirmation toast */}
      {recenterToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1.5 rounded-full bg-[#08120B]/95 border border-emerald-400 text-emerald-200 text-xs font-bold shadow-2xl flex items-center gap-1.5 animate-in fade-in zoom-in duration-150">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
          <span>{recenterToast}</span>
        </div>
      )}

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

      {/* Interactive Nearby Player Dossier Modal (Add to Friend List & Challenge) */}
      {selectedPlayer && (
        <div className="absolute inset-x-3 bottom-3 z-30 p-4 rounded-2xl bg-[#091E16]/95 backdrop-blur-md border border-emerald-500/50 shadow-2xl text-white animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-stone-900 border-2 border-emerald-400 flex items-center justify-center text-xl shadow-md">
                🤖
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-base text-white">{selectedPlayer.name}</h4>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Lv. {selectedPlayer.level}
                  </span>
                  <span className="text-[10px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    {selectedPlayer.faction}
                  </span>
                </div>
                <div className="text-xs text-[#8BA996] flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-white">{selectedPlayer.robotName}</span>
                  <span>•</span>
                  <span>{selectedPlayer.robotClass}</span>
                  {currentLocation && (
                    <>
                      <span>•</span>
                      <span className="text-amber-300 font-mono font-bold">
                        📍 {formatExplorationDistance(calculateHaversineDistance(
                          currentLocation.latitude,
                          currentLocation.longitude,
                          selectedPlayer.latitude,
                          selectedPlayer.longitude
                        ))} away
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              id="dossier-close-btn"
              onClick={() => setSelectedPlayer(null)}
              className="p-1.5 rounded-lg bg-[#0E2A1F] hover:bg-[#153D2D] text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3 border-t border-[#184635]">
            <button
              id="dossier-add-friend-btn"
              onClick={async () => {
                sound.playBonus();
                multiplayerManager.addFriend(selectedPlayer);
                multiplayerManager.sendFriendRequest(selectedPlayer.id);
                if (onAddFriend) onAddFriend(selectedPlayer);
                setFriendToast(`✓ Friend request sent to ${selectedPlayer.name}!`);
                setTimeout(() => setFriendToast(null), 3500);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md ${
                multiplayerManager.isFriend(selectedPlayer.id)
                  ? 'bg-emerald-900/60 border border-emerald-400/50 text-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
              }`}
            >
              {multiplayerManager.isFriend(selectedPlayer.id) ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>In Friend List</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add to Friend List</span>
                </>
              )}
            </button>

            <button
              id="dossier-challenge-btn"
              onClick={async () => {
                sound.playClick();
                setFriendToast(`⚔️ Sending battle challenge to ${selectedPlayer.name}...`);
                const challengeRes = await multiplayerManager.sendBattleInvite(selectedPlayer.id, 'classic');
                const roomCode = challengeRes.roomCode || `MATE-${Math.floor(1000 + Math.random() * 9000)}`;
                setFriendToast(`⚔️ Challenge sent to ${selectedPlayer.name}! Room ${roomCode}`);
                setTimeout(() => setFriendToast(null), 4000);

                if (onChallengePlayer) {
                  onChallengePlayer(selectedPlayer);
                }
              }}
              className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>Challenge to Battle</span>
            </button>
          </div>
        </div>
      )}

      {/* Friend Added Feedback Toast */}
      {friendToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-emerald-950/95 border border-emerald-400 text-emerald-300 text-xs font-black shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{friendToast}</span>
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

  const scale = 1.6;
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
        {/* Indoor building concentric range rings */}
        {[10, 20, 35, 50, 75, 100].map((dist) => {
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
