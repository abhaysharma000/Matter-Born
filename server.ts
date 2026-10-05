import express from "express";
import http from "http";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { deriveCombatDna } from "./src/utils/combatDnaDerivation";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Enable CORS for mobile devices connecting over Wi-Fi / LAN
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for large payload (e.g. base64 photo capture from camera)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Explicit, Uncached Production APK Download Route
app.get(["/Matter-Born.apk", "/api/download-apk"], (_req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Type", "application/vnd.android.package-archive");
  res.setHeader("Content-Disposition", 'attachment; filename="Matter-Born.apk"');

  const apkPath = path.join(process.cwd(), "apk", "Matter-Born.apk");
  if (fs.existsSync(apkPath)) {
    return res.sendFile(apkPath);
  }
  res.status(404).send("APK build not found in apk/ folder.");
});

// IP Geolocation fallback endpoint for devices without hardware GPS (e.g. desktops/laptops)
app.get("/api/ip-location", async (_req, res) => {
  try {
    const response = await fetch("https://ipwho.is/");
    const data = (await response.json()) as any;
    if (data && data.latitude && data.longitude) {
      return res.json({
        success: true,
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city || "",
        region: data.region || "",
        country: data.country || "",
      });
    }
  } catch (err) {
    console.warn("IP geolocation fallback note:", err);
  }
  res.json({ success: false });
});

// ============================================================================
// MULTIPLAYER PRESENCE & ROOM SYNCHRONIZATION BACKEND
// ============================================================================

interface ServerPlayerPresence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  heading?: number;
  level: number;
  rankTier: string;
  robotName: string;
  robotClass: string;
  faction: 'Autobot' | 'Decepticon';
  status: 'exploring' | 'in-room' | 'in-battle' | 'online';
  lastSeen: number;
}

const activePresenceMap = new Map<string, ServerPlayerPresence>();
const activeRoomsMap = new Map<string, any>();
const roomCombatPackets = new Map<string, Map<string, any>>();
const roomDamageEvents = new Map<string, any[]>();

// 1. Presence Heartbeat
app.post("/api/multiplayer/presence/heartbeat", (req, res) => {
  const presence = req.body as ServerPlayerPresence;
  if (!presence || !presence.id) {
    return res.status(400).json({ error: "Invalid presence payload" });
  }

  presence.lastSeen = Date.now();
  activePresenceMap.set(presence.id, presence);

  // Prune players inactive for > 45 seconds
  const now = Date.now();
  for (const [id, p] of activePresenceMap.entries()) {
    if (now - p.lastSeen > 45000) {
      activePresenceMap.delete(id);
    }
  }

  res.json({ success: true, activeCount: activePresenceMap.size });
});

// 2. Get Active Players for Real Map
app.get("/api/multiplayer/presence/active", (_req, res) => {
  const now = Date.now();
  const activePlayers: ServerPlayerPresence[] = [];

  for (const [id, p] of activePresenceMap.entries()) {
    if (now - p.lastSeen <= 45000) {
      activePlayers.push(p);
    } else {
      activePresenceMap.delete(id);
    }
  }

  res.json({ success: true, players: activePlayers });
});

// Search pilot by ID or Gamer Tag across Wi-Fi presence
app.get("/api/multiplayer/pilot/search", (req, res) => {
  const query = (req.query.query as string || "").trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: "Missing search query" });
  }

  const now = Date.now();
  for (const [id, p] of activePresenceMap.entries()) {
    if (now - p.lastSeen <= 60000) {
      if (id.toLowerCase() === query || p.name.toLowerCase().includes(query)) {
        return res.json({ success: true, player: p });
      }
    }
  }

  res.json({ success: false, message: "Pilot not found on Wi-Fi" });
});

// --------------------------------------------------------------------------
// FRIEND REQUESTS & BATTLE CHALLENGE INBOX (WI-FI LAN SYNC)
// --------------------------------------------------------------------------
interface ServerFriendRequest {
  id: string;
  fromPilotId: string;
  fromName: string;
  fromRobotName: string;
  fromRobotClass?: string;
  fromFaction?: string;
  fromLevel: number;
  toPilotId: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
  acceptedAt?: number;
  recipientPilot?: any;
}

interface ServerBattleInvite {
  id: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  fromPilotId: string;
  fromName: string;
  fromRobotName: string;
  fromLevel: number;
  toPilotId: string;
  mode: string;
  timestamp: number;
  status: 'pending' | 'accepted' | 'declined';
}

const serverFriendRequests: ServerFriendRequest[] = [];
const serverBattleInvites: ServerBattleInvite[] = [];

// Send Friend Request
app.post("/api/multiplayer/friend-request/send", (req, res) => {
  const { fromPilot, toPilotId } = req.body;
  if (!fromPilot || !fromPilot.id || !toPilotId) {
    return res.status(400).json({ error: "Missing fromPilot or toPilotId" });
  }

  const cleanToId = String(toPilotId).trim();
  const cleanFromId = String(fromPilot.id).trim();

  if (cleanToId.toLowerCase() === cleanFromId.toLowerCase()) {
    return res.status(400).json({ error: "Cannot send friend request to yourself" });
  }

  // Remove any stale pending request between these two
  const existingIdx = serverFriendRequests.findIndex(
    r => r.fromPilotId.toLowerCase() === cleanFromId.toLowerCase() &&
         r.toPilotId.toLowerCase() === cleanToId.toLowerCase() &&
         r.status === 'pending'
  );
  if (existingIdx >= 0) {
    serverFriendRequests.splice(existingIdx, 1);
  }

  const newRequest: ServerFriendRequest = {
    id: `freq-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    fromPilotId: cleanFromId,
    fromName: fromPilot.name || 'Anonymous Pilot',
    fromRobotName: fromPilot.robotName || 'Combat Mech',
    fromRobotClass: fromPilot.robotClass || 'Warrior',
    fromFaction: fromPilot.faction || 'Autobot',
    fromLevel: fromPilot.level || 1,
    toPilotId: cleanToId,
    timestamp: Date.now(),
    status: 'pending',
  };

  serverFriendRequests.push(newRequest);
  console.log(`[Friend Request] Sent from ${newRequest.fromName} (${cleanFromId}) -> ${cleanToId}`);

  res.json({ success: true, request: newRequest });
});

// Single Consolidated Polling Inbox: Friend Requests + Battle Invites + Accepted Confirmations
app.get("/api/multiplayer/inbox/:pilotId", (req, res) => {
  const pid = (req.params.pilotId || "").trim().toLowerCase();
  if (!pid) {
    return res.status(400).json({ error: "Missing pilotId" });
  }

  const now = Date.now();

  // 1. Pending incoming friend requests for this pilot
  const incomingFriendRequests = serverFriendRequests.filter(
    r => r.toPilotId.toLowerCase() === pid && r.status === 'pending' && now - r.timestamp < 120000
  );

  // 2. Pending battle invites for this pilot (< 45 seconds old)
  const incomingBattleInvites = serverBattleInvites.filter(
    i => i.toPilotId.toLowerCase() === pid && i.status === 'pending' && now - i.timestamp < 45000
  );

  // 3. Accepted friend requests sent BY this pilot (so sender's friend list updates immediately!)
  const acceptedOutbox = serverFriendRequests.filter(
    r => r.fromPilotId.toLowerCase() === pid &&
         r.status === 'accepted' &&
         r.acceptedAt &&
         now - r.acceptedAt < 45000
  );

  res.json({
    success: true,
    incomingFriendRequests,
    incomingBattleInvites,
    acceptedOutbox,
    timestamp: now,
  });
});

// Respond to Friend Request (Accept / Decline)
app.post("/api/multiplayer/friend-request/respond", (req, res) => {
  const { requestId, response, myPilot } = req.body;
  if (!requestId || !response) {
    return res.status(400).json({ error: "Missing requestId or response" });
  }

  const reqItem = serverFriendRequests.find(r => r.id === requestId);
  if (!reqItem) {
    return res.status(404).json({ error: "Friend request not found or expired" });
  }

  reqItem.status = response === 'accept' ? 'accepted' : 'declined';
  reqItem.acceptedAt = Date.now();
  if (myPilot) {
    reqItem.recipientPilot = myPilot;
  }

  console.log(`[Friend Request] ${requestId} marked as ${reqItem.status}`);
  res.json({ success: true, request: reqItem });
});

// Send Battle Challenge Invite
app.post("/api/multiplayer/battle-invite/send", (req, res) => {
  const { fromPilot, toPilotId, roomId, roomCode, roomName, mode } = req.body;
  if (!fromPilot || !toPilotId || !roomCode) {
    return res.status(400).json({ error: "Missing required battle invite fields" });
  }

  const cleanToId = String(toPilotId).trim();
  const cleanFromId = String(fromPilot.id).trim();

  // Create room in active rooms map if not already present
  if (!activeRoomsMap.has(roomCode)) {
    activeRoomsMap.set(roomCode, {
      code: roomCode,
      name: roomName || `${fromPilot.name}'s Duel`,
      mode: mode || 'classic',
      hostId: cleanFromId,
      players: [
        {
          id: cleanFromId,
          name: fromPilot.name,
          isHost: true,
          ping: 10,
        }
      ],
      currentPlayers: 1,
      maxPlayers: 2,
      isPrivate: true,
      status: 'waiting',
      createdAt: Date.now(),
    });
    roomCombatPackets.set(roomCode, new Map());
    roomDamageEvents.set(roomCode, []);
  }

  const newInvite: ServerBattleInvite = {
    id: `binv-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    roomId: roomId || roomCode,
    roomCode,
    roomName: roomName || `1v1 vs ${fromPilot.name}`,
    fromPilotId: cleanFromId,
    fromName: fromPilot.name || 'Challenger',
    fromRobotName: fromPilot.robotName || 'Battle Mech',
    fromLevel: fromPilot.level || 1,
    toPilotId: cleanToId,
    mode: mode || 'classic',
    timestamp: Date.now(),
    status: 'pending',
  };

  serverBattleInvites.push(newInvite);
  console.log(`[Battle Invite] ${newInvite.fromName} challenged ${cleanToId} to room ${roomCode}`);

  res.json({ success: true, invite: newInvite });
});

// Respond to Battle Challenge Invite (Accept / Decline)
app.post("/api/multiplayer/battle-invite/respond", (req, res) => {
  const { inviteId, response } = req.body;
  if (!inviteId || !response) {
    return res.status(400).json({ error: "Missing inviteId or response" });
  }

  const invItem = serverBattleInvites.find(i => i.id === inviteId);
  if (!invItem) {
    return res.status(404).json({ error: "Battle invite not found or expired" });
  }

  invItem.status = response === 'accept' ? 'accepted' : 'declined';
  console.log(`[Battle Invite] ${inviteId} status updated to ${invItem.status}`);

  res.json({ success: true, invite: invItem });
});

// --------------------------------------------------------------------------
// Real-Time LAN Player Presence & GPS Radar Sync
// --------------------------------------------------------------------------
const serverPlayerPresenceMap = new Map<string, any>();

// Player Heartbeat / GPS broadcast
app.post("/api/multiplayer/presence/heartbeat", (req, res) => {
  const player = req.body;
  if (!player || !player.id) {
    return res.status(400).json({ error: "Missing player.id" });
  }

  serverPlayerPresenceMap.set(player.id, {
    ...player,
    lastSeen: Date.now(),
  });

  res.json({ success: true });
});

// Active Players on LAN
app.get("/api/multiplayer/presence/active", (req, res) => {
  const now = Date.now();
  const activeList: any[] = [];

  for (const [id, player] of serverPlayerPresenceMap.entries()) {
    // Keep players seen within last 60 seconds
    if (now - (player.lastSeen || 0) < 60000) {
      activeList.push(player);
    } else {
      serverPlayerPresenceMap.delete(id);
    }
  }

  res.json({ success: true, players: activeList });
});

// Search pilot
app.get("/api/multiplayer/pilot/search", (req, res) => {
  const query = String(req.query.query || "").trim().toLowerCase();
  if (!query) {
    return res.status(400).json({ error: "Missing query" });
  }

  for (const player of serverPlayerPresenceMap.values()) {
    if (
      player.id?.toLowerCase() === query ||
      player.name?.toLowerCase().includes(query)
    ) {
      return res.json({ success: true, player });
    }
  }

  res.json({ success: false, message: "Pilot not found" });
});


// 3. Create Room
app.post("/api/multiplayer/rooms/create", (req, res) => {
  const room = req.body;
  if (!room || !room.code) {
    return res.status(400).json({ error: "Missing room code" });
  }

  activeRoomsMap.set(room.code, room);
  roomCombatPackets.set(room.code, new Map());
  roomDamageEvents.set(room.code, []);

  res.json({ success: true, room });
});

// 4. Join Room
app.post("/api/multiplayer/rooms/join", (req, res) => {
  const { code, member } = req.body;
  if (!code || !member) {
    return res.status(400).json({ error: "Missing code or member" });
  }

  const room = activeRoomsMap.get(code);
  if (!room) {
    // If room doesn't exist yet on server, create an ad-hoc room
    const adHocRoom = {
      code,
      name: `${code} Match`,
      hostId: member.id,
      mode: 'easy',
      maxPlayers: 8,
      status: 'waiting',
      createdAt: Date.now(),
      botsEnabled: true,
      players: [member],
    };
    activeRoomsMap.set(code, adHocRoom);
    return res.json({ success: true, room: adHocRoom });
  }

  // Check if member already in room
  const existingIdx = room.players.findIndex((p: any) => p.id === member.id);
  if (existingIdx >= 0) {
    room.players[existingIdx] = member;
  } else {
    room.players.push(member);
  }

  res.json({ success: true, room });
});

// 5. Get Room Details
app.get("/api/multiplayer/rooms/:code", (req, res) => {
  const room = activeRoomsMap.get(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  res.json({ success: true, room });
});

// 6. Start Match
app.post("/api/multiplayer/rooms/:code/start", (req, res) => {
  const room = activeRoomsMap.get(req.params.code);
  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }
  room.status = 'in-match';
  res.json({ success: true, room });
});

// 7. Push Combat Packet
app.post("/api/multiplayer/rooms/:code/packet", (req, res) => {
  const code = req.params.code;
  const packet = req.body;
  if (!code || !packet || !packet.senderId) {
    return res.status(400).json({ error: "Invalid combat packet" });
  }

  let packets = roomCombatPackets.get(code);
  if (!packets) {
    packets = new Map();
    roomCombatPackets.set(code, packets);
  }
  packets.set(packet.senderId, packet);
  res.json({ success: true });
});

// 8. Push Damage Event
app.post("/api/multiplayer/rooms/:code/damage", (req, res) => {
  const code = req.params.code;
  const event = req.body;
  if (!code || !event) {
    return res.status(400).json({ error: "Invalid damage event" });
  }

  let events = roomDamageEvents.get(code);
  if (!events) {
    events = [];
    roomDamageEvents.set(code, events);
  }
  events.push(event);
  if (events.length > 50) events.shift();

  res.json({ success: true });
});

// 9. Sync Combat State
app.get("/api/multiplayer/rooms/:code/sync", (req, res) => {
  const code = req.params.code;
  const client = (req.query.client as string) || '';

  const packetsMap = roomCombatPackets.get(code);
  const packets: any[] = [];
  if (packetsMap) {
    for (const [id, pkt] of packetsMap.entries()) {
      if (id !== client) {
        packets.push(pkt);
      }
    }
  }

  const events = roomDamageEvents.get(code) || [];
  // Clear events that are older than 2 seconds
  const cutoff = Date.now() - 2000;
  const freshEvents = events.filter((e: any) => (e.timestamp || 0) >= cutoff);
  roomDamageEvents.set(code, freshEvents);

  res.json({ success: true, packets, damageEvents: freshEvents });
});

// Lazy initialization of GoogleGenAI
function getGenAI(userKey?: string): GoogleGenAI | null {
  const apiKey = (userKey && userKey.trim().length > 10)
    ? userKey.trim()
    : (process.env.GEMINI_API_KEY || "");
  if (!apiKey || apiKey.length < 10) return null;
  return new GoogleGenAI({ apiKey });
}

// System Prompt for Object Recognition 2.0: Open-Ended Visual-to-Robot Transformation
const CREATURE_PROMPT = `You are the Master Cybertron Bio-Morph Engine for Animatrix 3D (Theme: Real World x AI x Transformers).

OBJECT RECOGNITION 2.0 MANDATE:
1. OPEN-ENDED OBJECT RECOGNITION:
   - You MUST recognize ANY reasonable physical object the player photographs (e.g., blue cardboard box, office chair, commuter bicycle, oak tree, building, backpack, keyboard, power drill, street sign, tennis racket, water bottle, coffee mug, sneaker, apple, etc.).
   - The system is NOT restricted to presets. Do NOT force objects into preset molds. Perform authentic, perceptive visual recognition.
2. CONSERVATIVE RECOGNITION & FOREGROUND FOCUS:
   - Identify the primary foreground physical object, ignoring background wall/floor clutter.
   - Assign "recognitionConfidence" between 0.0 and 1.0 (e.g., 0.92 for crisp, unambiguous objects; 0.40 for blurry, occluded, or ambiguous items).
   - If multiple interpretations are plausible, state the most likely one and provide "alternativeInterpretations" (e.g., ["plastic storage crate", "mailer box"]).
3. VISUAL SIMILARITY IS A FIRST-CLASS REQUIREMENT:
   - The generated robot MUST visibly inherit the scanned object's color, silhouette, and signature traits.
   - "primaryColor" MUST BE the dominant color of the object and will be painted across the robot's major armor plates (chest, helmet, thighs, forearms). If the object is blue, the robot's main armor MUST be blue.
   - Provide "visualFingerprint" with "geometryHints" (e.g. ["box_armor", "broad_torso", "flat_panels"], ["dorsal_backrest", "strut_supports"], ["wheel_motifs", "tubular_frame"], ["branching_arbor", "organic_vanes"], ["columnar_tower", "window_grid"], ["strap_harness"], ["tool_tines"], ["fluid_canister"], ["screen_hud"]).
4. PHYSICAL TRAITS TO GAMEPLAY ATTRIBUTES:
   - The REAL-WORLD SIZE, ESTIMATED MASS, and STRUCTURAL COMPLEXITY determine combat tiers:
     * Colossal (>150kg / vehicles, machinery, buildings): S-TIER COLOSSAL TITAN (HP 950-1350, ATK 140-210, DEF 105-160, SPD 8-11, Scale 1.45-1.75, Class: Dreadnought/Leader)
     * Large (10-150kg / furniture, electronics, bikes, power tools): A-TIER HEAVY ASSAULT (HP 750-920, ATK 115-145, DEF 85-115, SPD 10-13, Scale 1.30-1.45, Class: Leader/Warrior)
     * Medium (1-10kg / boxes, shoes, backpacks, bottles, plants, tools): B-TIER COMBAT WARRIOR (HP 550-720, ATK 88-115, DEF 65-88, SPD 11-14, Scale 1.15-1.28, Class: Warrior/Seeker)
     * Compact/Micro (<1kg / phones, mugs, keys, pens, clips, apples): D/C-TIER SPEED SCOUT (HP 400-520, ATK 68-90, DEF 45-65, SPD 15-18, Scale 0.88-1.05, Class: Scout/Infiltrator)
   - Real physical properties MUST translate into gameplay consequences in "propertyConsequences" (e.g., Rigid structure -> +Defense buff; Lightweight mass -> +Mobility/Dash speed; Cardboard/Cellulose -> Fire vulnerability; Conductive metal -> Shock vulnerability).

Output ONLY valid JSON matching this schema:
{
  "name": string (epic Cybertronian name, e.g. "Optimus Corrugator", "Aero-Stride Stinger", "Vortex-Hydro Seeker"),
  "originalObject": string (precise detected object, e.g. "Blue Corrugated Shipping Box"),
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
  "objectDna": {
    "objectIdentity": {
      "canonicalName": string,
      "objectCategory": string,
      "specificDescription": string,
      "recognitionConfidence": number (0.0 to 1.0),
      "alternativeInterpretations": [string],
      "isForegroundDominant": boolean
    },
    "visualIdentity": {
      "silhouetteDescription": string,
      "dominantColors": [string],
      "secondaryColors": [string],
      "colorDistribution": string,
      "shape": string,
      "proportions": string,
      "surfaceAppearance": string,
      "distinctiveVisualFeatures": [string]
    },
    "physicalIdentity": {
      "estimatedSizeClass": "micro" | "compact" | "medium" | "large" | "colossal",
      "estimatedMassClass": string (e.g. "Lightweight (~0.35 kg visual estimate)"),
      "materialCandidates": [string],
      "structuralComplexity": "simple" | "moderate" | "complex" | "ultra-complex",
      "rigidity": "flexible" | "semi-rigid" | "rigid" | "ultra-rigid",
      "flexibility": number (0 to 100),
      "density": "featherweight" | "light" | "medium" | "heavy" | "superdense",
      "likelyPhysicalProperties": [string]
    },
    "signatureFeatures": [string] (3 to 5 clear visual features preserved from the photo into the robot),
    "gameplayIdentity": {
      "combatTier": string (e.g. "B-TIER COMBAT WARRIOR"),
      "suggestedClass": "Leader" | "Scout" | "Seeker" | "Dreadnought" | "Infiltrator" | "Warrior",
      "strengths": [string],
      "weaknesses": [string],
      "movementStyle": string,
      "attackStyle": string,
      "specialAbilityConcept": string,
      "propertyConsequences": [
        { "property": string, "effect": string, "isBuff": boolean },
        { "property": string, "effect": string, "isBuff": boolean },
        { "property": string, "effect": string, "isBuff": boolean }
      ]
    },
    "visualFingerprint": {
      "primaryShape": string,
      "aspectRatio": string,
      "primaryColor": string (hex matching photo),
      "secondaryColor": string (hex matching photo),
      "signatureFeatures": [string],
      "surface": string,
      "geometryHints": [string] (e.g. "box_armor", "broad_torso", "flat_panels", "dorsal_backrest", "wheel_motifs", "branching_arbor", "columnar_tower", "strap_harness", "tool_tines", "fluid_canister", "screen_hud"),
      "mustPreserveFeatures": [string]
    },
    "visualTransmutation": {
      "silhouette": string (e.g. "rectangular_box" | "cylindrical_bottle" | "spherical_orb" | "thin_plate_clam" | "backrest_strut" | "tubular_frame" | "columnar_tower" | "branching_arbor" | "aerodynamic_wedge" | "compact_faceted"),
      "bodyProportions": {
        "width": number (0.8 to 1.6),
        "height": number (0.8 to 1.6),
        "depth": number (0.8 to 1.6)
      },
      "primaryColor": string (hex matching photo),
      "secondaryColor": string (hex matching photo),
      "accentColors": [string],
      "surfaceMaterial": "metal" | "rubber" | "plastic" | "ceramic" | "glass" | "wood" | "cardboard" | "fabric" | "stone",
      "roughness": number (0.0 to 1.0),
      "metallic": number (0.0 to 1.0),
      "signatureFeatures": [string] (3 to 8 visually distinctive features preserved from object),
      "geometryMotifs": [string],
      "armorPatterns": [string],
      "mechanicalDetails": [string],
      "featurePlacement": [
        { "feature": string, "placement": "shoulder" | "chest" | "back" | "head" | "arm" | "hip" | "leg" | "feet", "meshType": "ring_handle" | "wheel_hub" | "screen_hud" | "vent_exhaust" | "strut_brace" | "strap_band" | "hinge_pivot" | "tine_blade" | "cap_crest" | "tread_plate" | "branch_crest" | "antenna_spike" | "button_node" | "box_flap" | "canister_core" | "generic_panel", "scale": number, "label": string }
      ],
      "transmutationMappings": [
        { "originalFeature": string, "robotFeature": string, "visualEffect": string, "consequence": string }
      ]
    }
  },
  "visualTransmutation": {
    "silhouette": string,
    "bodyProportions": { "width": number, "height": number, "depth": number },
    "primaryColor": string,
    "secondaryColor": string,
    "accentColors": [string],
    "surfaceMaterial": string,
    "roughness": number,
    "metallic": number,
    "signatureFeatures": [string],
    "geometryMotifs": [string],
    "armorPatterns": [string],
    "mechanicalDetails": [string],
    "featurePlacement": [{ "feature": string, "placement": string, "meshType": string, "scale": number, "label": string }],
    "transmutationMappings": [{ "originalFeature": string, "robotFeature": string, "visualEffect": string, "consequence": string }]
  },
  "materialPhysics": {
    "materialName": string,
    "heatResistance": number (0 to 100),
    "electricalConductivity": number (0 to 100),
    "impactDurability": number (0 to 100),
    "elasticity": number (0 to 100),
    "density": "light" | "medium" | "heavy" | "superdense",
    "counterStrengths": [string, string],
    "counterWeaknesses": [string, string]
  },
  "specialAbility": {
    "name": string,
    "description": string,
    "cooldown": number,
    "damage": number,
    "vfxType": "nova" | "beam" | "vortex" | "missiles" | "spikes" | "lightning"
  },
  "visualParams": {
    "primaryColor": string (hex),
    "secondaryColor": string (hex),
    "glowColor": string (hex),
    "shapeArchetype": "cylinder" | "sheet_slab" | "sphere_round" | "cuboid_box",
    "objectArchetype": string,
    "bodyShape": "mech",
    "scale": number,
    "geometryHints": [string],
    "primaryShape": string,
    "hornsOrCrest": boolean,
    "wings": boolean,
    "tail": boolean,
    "spikes": boolean,
    "armorPlates": boolean,
    "floatingOrbs": boolean,
    "auraParticleType": string,
    "hasHandle": boolean,
    "hasScreen": boolean,
    "hasCapOrLid": boolean,
    "hasCordOrTail": boolean,
    "hasKeypadOrButtons": boolean,
    "hasBladesOrTines": boolean,
    "hasSoleTread": boolean,
    "hasSucculentSpines": boolean,
    "hasHeadbandArc": boolean,
    "metallicFactor": number,
    "roughnessFactor": number
  }
}`;

// Dynamic combat stat calculator derived from Object Complexity + Distance from starting position
function deriveServerCombatStats(
  complexity: any,
  distanceFromStartMeters: number = 0,
  objName: string = '',
  primaryColor: string = '#2563EB'
) {
  // Deterministic jitter seeded by object name + color so different objects don't share identical stats
  const seedString = `${(objName || 'mech').toLowerCase()}-${(primaryColor || '#00E5FF').toLowerCase()}-${complexity?.scaleTier || 'compact'}-${complexity?.complexityScore || 50}`;
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }
  const jitter1 = (((Math.abs(hash) % 19) - 9) / 100); // -0.09 to +0.09
  const jitter2 = ((((Math.abs(hash >> 3)) % 17) - 8) / 100);
  const jitter3 = ((((Math.abs(hash >> 6)) % 15) - 7) / 100);
  const jitter4 = ((((Math.abs(hash >> 9)) % 11) - 5) / 100);

  const recHp = complexity?.recommendedHp || 520;
  const recAtk = complexity?.recommendedAttack || 86;
  const recDef = complexity?.recommendedDefense || 60;
  const recSpd = complexity?.recommendedSpeed || 13;

  const baseHp = Math.round(recHp * (1 + jitter1 * 0.4));
  const baseAttack = Math.round(recAtk * (1 + jitter2 * 0.6));
  const baseDefense = Math.round(recDef * (1 + jitter3 * 0.6));
  const baseSpeed = Math.max(7, Math.round(recSpd + jitter4 * 1.5));
  const baseAbilityDmg = Math.round((baseAttack * 1.6 + (complexity?.complexityScore || 50) * 0.7) * (1 + jitter1 * 0.5));
  const baseCooldown = Math.max(3.5, Number((7.0 - (baseSpeed - 10) * 0.25).toFixed(1)));

  const dist = Math.max(0, Number(distanceFromStartMeters) || 0);
  let distanceBonusPercent = 0;
  let distanceTierLabel = 'LOCAL ORIGIN';
  let distanceTierBadge = '⚪';

  if (dist >= 100) {
    distanceTierLabel = 'GRAND HACKATHON MATRIX';
    distanceTierBadge = '🔴';
    distanceBonusPercent = Math.min(85, Math.round(65 + (dist - 100) * 0.2));
  } else if (dist >= 75) {
    distanceTierLabel = 'ATRIUM MATRIX';
    distanceTierBadge = '🟡';
    distanceBonusPercent = 50;
  } else if (dist >= 50) {
    distanceTierLabel = 'MAIN HALL APEX';
    distanceTierBadge = '🟣';
    distanceBonusPercent = 40;
  } else if (dist >= 35) {
    distanceTierLabel = 'DEV LAB VANGUARD';
    distanceTierBadge = '🔵';
    distanceBonusPercent = 30;
  } else if (dist >= 20) {
    distanceTierLabel = 'CORRIDOR RANGER';
    distanceTierBadge = '🌲';
    distanceBonusPercent = 20;
  } else if (dist >= 10) {
    distanceTierLabel = 'HACKATHON SCOUT';
    distanceTierBadge = '🟢';
    distanceBonusPercent = 10;
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
    baseStats: { hp: baseHp, attack: baseAttack, defense: baseDefense, speed: baseSpeed, abilityDamage: baseAbilityDmg },
    distanceBuffs: { hp: hpBonus, attack: attackBonus, defense: defenseBonus, speed: speedBonus, abilityDamage: abilityDmgBonus },
    distanceFromStartMeters: dist,
    distanceTierLabel,
    distanceTierBadge,
    distanceBonusPercent,
    distanceMultiplier: 1 + bonusFraction,
  };
}

// Server-side object scale & structural complexity evaluator
function evaluateServerObjectScale(hint: string = '', clientAnalyzed?: any) {
  if (clientAnalyzed?.complexity) {
    return clientAnalyzed.complexity;
  }

  const h = (hint || '').toLowerCase();
  const isColossal =
    h.includes('car') ||
    h.includes('truck') ||
    h.includes('vehicle') ||
    h.includes('automobile') ||
    h.includes('motorcycle') ||
    h.includes('engine') ||
    h.includes('refrigerator') ||
    h.includes('fridge') ||
    h.includes('washing machine') ||
    h.includes('generator') ||
    h.includes('machinery') ||
    h.includes('tractor') ||
    h.includes('transformer') ||
    h.includes('server') ||
    h.includes('piano') ||
    h.includes('crane') ||
    h.includes('boat') ||
    h.includes('building') ||
    h.includes('tower') ||
    h.includes('monolith') ||
    h.includes('house') ||
    h.includes('architecture');

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
    h.includes('speaker') ||
    h.includes('skateboard') ||
    h.includes('chair') ||
    h.includes('seat') ||
    h.includes('stool') ||
    h.includes('desk') ||
    h.includes('table') ||
    h.includes('furniture') ||
    h.includes('bicycle') ||
    h.includes('bike') ||
    h.includes('scooter');

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
    h.includes('clip') ||
    h.includes('eraser') ||
    h.includes('needle');

  if (isColossal) {
    return {
      scaleTier: 'colossal',
      tierLabel: 'S-TIER COLOSSAL TITAN',
      complexityScore: 94,
      statMultiplier: 2.1,
      powerRating: 1520,
      physicalMassDesc: 'Colossal Multi-Part Heavy Vehicle / Structural Architecture',
      recommendedHp: 1180,
      recommendedAttack: 175,
      recommendedDefense: 135,
      recommendedSpeed: 9,
      visualScale: 1.65,
    };
  }

  if (isLarge) {
    return {
      scaleTier: 'large',
      tierLabel: 'A-TIER HEAVY ASSAULT',
      complexityScore: 82,
      statMultiplier: 1.6,
      powerRating: 1240,
      physicalMassDesc: 'Heavy Multi-Component Framework & Complex Apparatus',
      recommendedHp: 880,
      recommendedAttack: 132,
      recommendedDefense: 100,
      recommendedSpeed: 11,
      visualScale: 1.4,
    };
  }

  if (isMicro) {
    return {
      scaleTier: 'micro',
      tierLabel: 'D-TIER SPEED SCOUT',
      complexityScore: 32,
      statMultiplier: 0.88,
      powerRating: 540,
      physicalMassDesc: 'Micro Pocket Item / Agile Kinetic Infiltrator',
      recommendedHp: 430,
      recommendedAttack: 74,
      recommendedDefense: 48,
      recommendedSpeed: 16,
      visualScale: 0.92,
    };
  }

  return {
    scaleTier: 'medium',
    tierLabel: 'B-TIER COMBAT WARRIOR',
    complexityScore: 65,
    statMultiplier: 1.25,
    powerRating: 920,
    physicalMassDesc: 'Balanced Physical Object / Medium Armor Profile',
    recommendedHp: 640,
    recommendedAttack: 102,
    recommendedDefense: 76,
    recommendedSpeed: 12,
    visualScale: 1.2,
  };
}

// Helpers for Object Recognition 2.0 DNA Synthesis
function inferCategoryFromObject(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('box') || n.includes('carton') || n.includes('package') || n.includes('crate') || n.includes('tote')) return 'Packaging & Containers';
  if (n.includes('chair') || n.includes('table') || n.includes('desk') || n.includes('sofa') || n.includes('furniture')) return 'Furniture & Structural';
  if (n.includes('bike') || n.includes('bicycle') || n.includes('car') || n.includes('vehicle') || n.includes('wheel')) return 'Transportation & Wheels';
  if (n.includes('tree') || n.includes('plant') || n.includes('leaf') || n.includes('wood') || n.includes('flower') || n.includes('cactus')) return 'Botanical & Organic';
  if (n.includes('phone') || n.includes('laptop') || n.includes('computer') || n.includes('screen') || n.includes('tablet') || n.includes('keyboard')) return 'Consumer Electronics';
  if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot') || n.includes('jacket') || n.includes('backpack')) return 'Wearables & Apparel';
  if (n.includes('mug') || n.includes('cup') || n.includes('bottle') || n.includes('flask') || n.includes('thermos') || n.includes('can')) return 'Beverage & Vessels';
  if (n.includes('tool') || n.includes('drill') || n.includes('knife') || n.includes('scissors') || n.includes('wrench')) return 'Hardware & Tools';
  if (n.includes('building') || n.includes('tower') || n.includes('monolith') || n.includes('sign')) return 'Architecture & Street';
  return 'Physical Artifact';
}

function inferShapeFromObject(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('box') || n.includes('carton') || n.includes('package') || n.includes('brick') || n.includes('book')) return 'rectangular cuboid';
  if (n.includes('bottle') || n.includes('mug') || n.includes('cup') || n.includes('can') || n.includes('thermos') || n.includes('flask')) return 'cylindrical';
  if (n.includes('chair') || n.includes('stool') || n.includes('desk') || n.includes('table') || n.includes('bicycle') || n.includes('bike')) return 'tubular frame';
  if (n.includes('tree') || n.includes('plant') || n.includes('branch') || n.includes('cactus')) return 'branching arbor';
  if (n.includes('building') || n.includes('tower') || n.includes('monolith')) return 'columnar tower';
  if (n.includes('ball') || n.includes('apple') || n.includes('fruit') || n.includes('sphere')) return 'spherical';
  return 'geometric multifaceted';
}

function inferGeometryHints(name: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('box') || n.includes('carton') || n.includes('package')) return ['box_armor', 'broad_torso', 'flat_panels'];
  if (n.includes('chair') || n.includes('seat') || n.includes('stool') || n.includes('furniture')) return ['dorsal_backrest', 'strut_supports'];
  if (n.includes('bicycle') || n.includes('bike') || n.includes('wheel') || n.includes('scooter')) return ['wheel_motifs', 'tubular_frame'];
  if (n.includes('building') || n.includes('tower') || n.includes('monolith')) return ['columnar_tower', 'window_grid'];
  if (n.includes('tree') || n.includes('plant') || n.includes('branch') || n.includes('cactus') || n.includes('wood')) return ['branching_arbor', 'organic_vanes'];
  if (n.includes('backpack') || n.includes('bag') || n.includes('luggage') || n.includes('strap')) return ['strap_harness'];
  if (n.includes('tool') || n.includes('blade') || n.includes('drill') || n.includes('knife') || n.includes('scissors')) return ['tool_tines'];
  if (n.includes('bottle') || n.includes('can') || n.includes('thermos') || n.includes('fluid')) return ['fluid_canister'];
  if (n.includes('phone') || n.includes('screen') || n.includes('laptop') || n.includes('monitor') || n.includes('tech')) return ['screen_hud'];
  return ['broad_torso', 'flat_panels'];
}

function extractSignatureFeatures(name: string, primary: string, secondary: string): string[] {
  const n = name.toLowerCase();
  if (n.includes('box') || n.includes('carton')) {
    return [
      'Rectangular boxy chest armor',
      'Folded flap shoulder plates',
      'Corrugated fiber shock absorption',
      'Reinforced center seam plating',
    ];
  }
  if (n.includes('chair') || n.includes('furniture')) {
    return [
      'Dorsal backrest defensive shield',
      'Quad structural support struts',
      'Hydraulic elevation shock absorbers',
      'Ergonomic armored lumbar chassis',
    ];
  }
  if (n.includes('bike') || n.includes('bicycle')) {
    return [
      'Dual shoulder-mounted wheel hub motifs',
      'Lightweight aerodynamic tube frame',
      'All-terrain grip sole treads',
      'High-velocity steering stabilizers',
    ];
  }
  if (n.includes('building') || n.includes('tower')) {
    return [
      'Towering columnar monolithic armor',
      'Window-grid energon conduit matrix',
      'Reinforced foundational stomp footplates',
      'Seismic shockwave structural inertia',
    ];
  }
  if (n.includes('tree') || n.includes('plant') || n.includes('cactus')) {
    return [
      'Branching solar canopy crests',
      'Hardwood bark armor plates',
      'Cellular photosynthesis regeneration core',
      'Flexible vine articulation conduits',
    ];
  }
  if (n.includes('mug') || n.includes('cup')) {
    return [
      'Curved side structural grab handle',
      'High-temp glazed ceramic chestplate',
      'Pressurized thermal steam vents',
      'Liquid-containment reservoir spark core',
    ];
  }
  if (n.includes('shoe') || n.includes('sneaker')) {
    return [
      'Shock-absorbing rubber tread soles',
      'Aerodynamic heel stabilizers',
      'High-traction sprint dampeners',
      'Rapid kinetic recoil springs',
    ];
  }
  if (n.includes('bottle') || n.includes('flask')) {
    return [
      'Pressurized fluid reservoir canister',
      'Hermetic valve cap helmet crest',
      'Cylindrical aerodynamic torso shell',
      'Cryogenic coolant release nozzles',
    ];
  }
  return [
    `Sculpted ${name} armor geometry`,
    `${primary} dominant outer hull plates`,
    `${secondary} mechanical joint articulation`,
    'Energon Matrix infused power core',
  ];
}

function generatePropertyConsequences(name: string, materialPhysics: any, complexity: any) {
  const n = name.toLowerCase();
  const consequences = [];

  if (n.includes('box') || n.includes('carton') || n.includes('cardboard') || n.includes('paper')) {
    consequences.push(
      { property: 'Corrugated Cardboard Hull', effect: '-20% Kinetic bullet impact shock', isBuff: true },
      { property: 'Lightweight Mass Class', effect: '+15% Dash agility & recharge speed', isBuff: true },
      { property: 'Cellulose Fiber Composition', effect: '+30% Vulnerability to Fire/Flame damage', isBuff: false }
    );
  } else if (n.includes('chair') || n.includes('furniture')) {
    consequences.push(
      { property: 'Rigid High Backrest', effect: '+25% Defense against rear & flanking attacks', isBuff: true },
      { property: 'Quad-Strut Base Support', effect: '-35% Stagger duration from heavy melee hits', isBuff: true },
      { property: 'Heavy Frame Weight', effect: '-10% Dash sprint top speed', isBuff: false }
    );
  } else if (n.includes('bike') || n.includes('bicycle')) {
    consequences.push(
      { property: 'Tubular Alloy Frame', effect: '+25% Movement speed & evasive strafing', isBuff: true },
      { property: 'Radial Wheel Gyros', effect: '+15% Rapid turn rate & weapon tracking', isBuff: true },
      { property: 'Exposed Frame Spars', effect: '+15% Critical strike vulnerability', isBuff: false }
    );
  } else if (n.includes('building') || n.includes('tower') || n.includes('monolith')) {
    consequences.push(
      { property: 'Monolithic Concrete & Steel', effect: '+40% Maximum HP & Impact durability', isBuff: true },
      { property: 'Seismic Mass Inertia', effect: 'Normal attacks inflict +30% enemy knockback', isBuff: true },
      { property: 'Towering Structural Bulk', effect: 'Larger target hitbox for incoming fire', isBuff: false }
    );
  } else if (n.includes('tree') || n.includes('plant') || n.includes('wood') || n.includes('cactus')) {
    consequences.push(
      { property: 'Living Cellulose & Lignin', effect: 'Passive cellular regeneration (+4 HP/sec in rain)', isBuff: true },
      { property: 'Organic Fiber Resilience', effect: '-30% Electric shock & EMP disruption', isBuff: true },
      { property: 'Dry Organic Matter', effect: '+35% Extra damage taken from Fire hazards', isBuff: false }
    );
  } else if (n.includes('mug') || n.includes('cup') || n.includes('ceramic')) {
    consequences.push(
      { property: 'Glazed Vitreous Ceramic', effect: 'Complete immunity to thermal fire burn damage', isBuff: true },
      { property: 'Dielectric Insulator', effect: '-30% Lightning & electric stun duration', isBuff: true },
      { property: 'Brittle Crystalline Lattice', effect: '+25% Damage taken from heavy blunt impacts', isBuff: false }
    );
  } else if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot')) {
    consequences.push(
      { property: 'Vulcanized Rubber Tread', effect: '+20% Sprint acceleration & ground friction', isBuff: true },
      { property: 'Kinetic Rebound Dampening', effect: 'Dashing consumes 30% less battle energy', isBuff: true },
      { property: 'Flexible Polymer Shell', effect: '+20% Piercing damage from sharp projectiles', isBuff: false }
    );
  } else if (n.includes('bottle') || n.includes('flask') || n.includes('thermos')) {
    consequences.push(
      { property: 'Pressurized Alloy Cylinder', effect: '-25% Slashing & shearing attack damage', isBuff: true },
      { property: 'Thermal Vacuum Barrier', effect: 'Extreme resistance to cryogenic freezing', isBuff: true },
      { property: 'Internal Pressure Dynamic', effect: 'Vulnerable to rupture under continuous heat', isBuff: false }
    );
  } else {
    consequences.push(
      { property: 'Hardened Outer Chassis', effect: `+${Math.round(complexity.statMultiplier * 15)}% Overall Armor Durability`, isBuff: true },
      { property: 'Calibrated Physical Mass', effect: 'Optimized arena combat balance & stride', isBuff: true },
      { property: 'Elemental Resonance', effect: 'Susceptible to opposing environmental surges', isBuff: false }
    );
  }

  return consequences;
}

// ========================================================
// VISUAL TRANSMUTATION 2.0 CONTRACT SYNTHESIZER
// ========================================================
function synthesizeVisualTransmutation(
  objName: string,
  primary: string,
  secondary: string,
  materialPhysics: any,
  clientAnalyzed: any,
  complexity: any,
  aiTransmutation?: any
): any {
  const n = (objName || '').toLowerCase();

  // 1. Silhouette & Proportions
  let silhouette = aiTransmutation?.silhouette;
  let bodyProportions = aiTransmutation?.bodyProportions;

  if (!silhouette || !bodyProportions) {
    if (n.includes('box') || n.includes('carton') || n.includes('package') || n.includes('brick') || n.includes('book') || n.includes('crate')) {
      silhouette = silhouette || 'rectangular_box';
      bodyProportions = bodyProportions || { width: 1.35, height: 0.95, depth: 1.15 };
    } else if (n.includes('bottle') || n.includes('flask') || n.includes('thermos') || n.includes('can') || n.includes('tumbler') || n.includes('cylinder') || n.includes('cup') || n.includes('mug')) {
      silhouette = silhouette || 'cylindrical_bottle';
      bodyProportions = bodyProportions || { width: 0.85, height: 1.35, depth: 0.85 };
    } else if (n.includes('ball') || n.includes('sphere') || n.includes('globe') || n.includes('apple') || n.includes('fruit') || n.includes('orb')) {
      silhouette = silhouette || 'spherical_orb';
      bodyProportions = bodyProportions || { width: 1.15, height: 1.10, depth: 1.15 };
    } else if (n.includes('laptop') || n.includes('tablet') || n.includes('screen') || n.includes('monitor') || n.includes('phone') || n.includes('display')) {
      silhouette = silhouette || 'thin_plate_clam';
      bodyProportions = bodyProportions || { width: 1.30, height: 0.90, depth: 0.65 };
    } else if (n.includes('chair') || n.includes('seat') || n.includes('stool') || n.includes('bench') || n.includes('furniture')) {
      silhouette = silhouette || 'backrest_strut';
      bodyProportions = bodyProportions || { width: 1.10, height: 1.25, depth: 1.20 };
    } else if (n.includes('bike') || n.includes('bicycle') || n.includes('wheel') || n.includes('scooter') || n.includes('motorcycle')) {
      silhouette = silhouette || 'tubular_frame';
      bodyProportions = bodyProportions || { width: 0.95, height: 1.15, depth: 1.20 };
    } else if (n.includes('building') || n.includes('tower') || n.includes('monolith') || n.includes('skyscraper') || n.includes('pillar')) {
      silhouette = silhouette || 'columnar_tower';
      bodyProportions = bodyProportions || { width: 1.15, height: 1.45, depth: 1.20 };
    } else if (n.includes('tree') || n.includes('plant') || n.includes('branch') || n.includes('cactus') || n.includes('flower') || n.includes('succulent')) {
      silhouette = silhouette || 'branching_arbor';
      bodyProportions = bodyProportions || { width: 1.25, height: 1.25, depth: 1.00 };
    } else if (n.includes('shoe') || n.includes('sneaker') || n.includes('boot') || n.includes('footwear') || n.includes('iron')) {
      silhouette = silhouette || 'aerodynamic_wedge';
      bodyProportions = bodyProportions || { width: 1.05, height: 0.95, depth: 1.35 };
    } else {
      silhouette = silhouette || 'compact_faceted';
      const ar = clientAnalyzed?.aspectRatio || 1.0;
      if (ar > 1.3) {
        bodyProportions = bodyProportions || { width: 1.25, height: 0.95, depth: 1.00 };
      } else if (ar < 0.75) {
        bodyProportions = bodyProportions || { width: 0.88, height: 1.30, depth: 0.90 };
      } else {
        bodyProportions = bodyProportions || { width: 1.05, height: 1.05, depth: 1.05 };
      }
    }
  }

  bodyProportions = {
    width: Math.max(0.65, Math.min(1.8, Number(bodyProportions.width) || 1.0)),
    height: Math.max(0.65, Math.min(1.8, Number(bodyProportions.height) || 1.0)),
    depth: Math.max(0.65, Math.min(1.8, Number(bodyProportions.depth) || 1.0)),
  };

  // 2. Surface Material & Roughness / Metallic
  let surfaceMaterial = aiTransmutation?.surfaceMaterial;
  let roughness = typeof aiTransmutation?.roughness === 'number' ? aiTransmutation.roughness : undefined;
  let metallic = typeof aiTransmutation?.metallic === 'number' ? aiTransmutation.metallic : undefined;

  const matName = (materialPhysics?.materialName || '').toLowerCase();
  if (!surfaceMaterial) {
    if (matName.includes('rubber') || n.includes('rubber') || n.includes('tire') || n.includes('sneaker') || n.includes('shoe')) {
      surfaceMaterial = 'rubber';
    } else if (matName.includes('wood') || n.includes('wood') || n.includes('branch') || n.includes('tree')) {
      surfaceMaterial = 'wood';
    } else if (matName.includes('cardboard') || n.includes('cardboard') || n.includes('box') || n.includes('carton') || n.includes('paper')) {
      surfaceMaterial = 'cardboard';
    } else if (matName.includes('ceramic') || n.includes('ceramic') || n.includes('porcelain') || n.includes('mug')) {
      surfaceMaterial = 'ceramic';
    } else if (matName.includes('glass') || n.includes('glass') || n.includes('lens')) {
      surfaceMaterial = 'glass';
    } else if (matName.includes('stone') || n.includes('concrete') || n.includes('brick') || n.includes('building')) {
      surfaceMaterial = 'stone';
    } else if (matName.includes('plastic') || n.includes('plastic') || n.includes('polymer') || n.includes('toy')) {
      surfaceMaterial = 'plastic';
    } else if (matName.includes('fabric') || n.includes('fabric') || n.includes('cloth') || n.includes('nylon') || n.includes('backpack')) {
      surfaceMaterial = 'fabric';
    } else {
      surfaceMaterial = 'metal';
    }
  }

  if (roughness === undefined || metallic === undefined) {
    switch (surfaceMaterial) {
      case 'rubber':
        roughness = roughness ?? 0.85;
        metallic = metallic ?? 0.08;
        break;
      case 'wood':
        roughness = roughness ?? 0.84;
        metallic = metallic ?? 0.06;
        break;
      case 'cardboard':
        roughness = roughness ?? 0.90;
        metallic = metallic ?? 0.04;
        break;
      case 'ceramic':
        roughness = roughness ?? 0.16;
        metallic = metallic ?? 0.22;
        break;
      case 'glass':
        roughness = roughness ?? 0.08;
        metallic = metallic ?? 0.35;
        break;
      case 'stone':
        roughness = roughness ?? 0.80;
        metallic = metallic ?? 0.25;
        break;
      case 'plastic':
        roughness = roughness ?? 0.42;
        metallic = metallic ?? 0.18;
        break;
      case 'fabric':
        roughness = roughness ?? 0.85;
        metallic = metallic ?? 0.05;
        break;
      case 'metal':
      default:
        roughness = roughness ?? 0.22;
        metallic = metallic ?? 0.92;
        break;
    }
  }

  // 3. Color Fidelity
  const primaryColor = aiTransmutation?.primaryColor || primary || '#2563EB';
  const secondaryColor = aiTransmutation?.secondaryColor || secondary || '#64748B';
  const glowHex = clientAnalyzed?.glowHex || '#00E5FF';
  const accentColors = Array.isArray(aiTransmutation?.accentColors) && aiTransmutation.accentColors.length > 0
    ? aiTransmutation.accentColors
    : [glowHex, '#FFFFFF', '#1E293B'];

  // 4. Geometry Motifs, Armor Patterns, Mechanical Details
  const geometryMotifs: string[] = Array.isArray(aiTransmutation?.geometryMotifs) && aiTransmutation.geometryMotifs.length > 0
    ? aiTransmutation.geometryMotifs
    : inferGeometryHints(objName);

  const armorPatterns: string[] = Array.isArray(aiTransmutation?.armorPatterns) && aiTransmutation.armorPatterns.length > 0
    ? aiTransmutation.armorPatterns
    : [];

  if (armorPatterns.length === 0) {
    if (silhouette === 'rectangular_box') armorPatterns.push('folded_flaps', 'reinforced_tape_seam', 'ribbed_core');
    else if (silhouette === 'cylindrical_bottle') armorPatterns.push('cylindrical_barrel', 'threaded_collar', 'coolant_level');
    else if (silhouette === 'spherical_orb') armorPatterns.push('spherical_core_pod', 'circular_pauldrons');
    else if (silhouette === 'thin_plate_clam') armorPatterns.push('display_bezel', 'dual_hinge_points', 'keypad_nodes');
    else if (silhouette === 'backrest_strut') armorPatterns.push('dorsal_blast_shield', 'quad_support_struts');
    else if (silhouette === 'tubular_frame') armorPatterns.push('rollcage_spars', 'dual_spoked_wheels');
    else if (silhouette === 'columnar_tower') armorPatterns.push('window_matrix_grid', 'stacked_cornice_slabs', 'stomp_footplates');
    else if (silhouette === 'branching_arbor') armorPatterns.push('branching_crest_vanes', 'foliage_shields');
    else if (silhouette === 'aerodynamic_wedge') armorPatterns.push('traction_sole_lugs', 'raked_wedge_prow');
    else armorPatterns.push('faceted_chassis_plates', 'articulated_pivots');
  }

  const mechanicalDetails: string[] = Array.isArray(aiTransmutation?.mechanicalDetails) && aiTransmutation.mechanicalDetails.length > 0
    ? aiTransmutation.mechanicalDetails
    : [
        'High-pressure hydraulic knee & elbow actuators',
        'Optic energon eye visor targeting array',
        'Rotary heat-dissipation vents',
        'Heavy magnetic footplate locking clamps',
      ];

  // 5. Signature Features (3 to 8 features)
  const signatureFeatures: string[] = Array.isArray(aiTransmutation?.signatureFeatures) && aiTransmutation.signatureFeatures.length >= 3
    ? aiTransmutation.signatureFeatures
    : extractSignatureFeatures(objName, primaryColor, secondaryColor);

  // 6. Feature Placement mapped to 3D mech anatomy
  let featurePlacement: any[] = Array.isArray(aiTransmutation?.featurePlacement) && aiTransmutation.featurePlacement.length >= 2
    ? aiTransmutation.featurePlacement
    : [];

  if (featurePlacement.length === 0) {
    if (silhouette === 'rectangular_box') {
      featurePlacement.push(
        { feature: 'Cardboard Box Flaps', placement: 'shoulder', meshType: 'box_flap', scale: 1.1, label: 'Shoulder Flap Shields' },
        { feature: 'Central Packing Tape Seam', placement: 'chest', meshType: 'generic_panel', scale: 1.0, label: 'Chassis Centerline Lock' },
        { feature: 'Corrugated Internal Midriff', placement: 'hip', meshType: 'vent_exhaust', scale: 0.9, label: 'Impact Shock Absorber' }
      );
    } else if (silhouette === 'cylindrical_bottle') {
      featurePlacement.push(
        { feature: 'Threaded Pressure Cap', placement: 'head', meshType: 'cap_crest', scale: 1.0, label: 'Hermetic Crown Seal' },
        { feature: 'Cylindrical Reservoir Core', placement: 'chest', meshType: 'canister_core', scale: 1.2, label: 'Energon Fluid Chamber' }
      );
      if (n.includes('mug') || n.includes('cup') || n.includes('handle')) {
        featurePlacement.push({ feature: 'Curved Grab Handle', placement: 'shoulder', meshType: 'ring_handle', scale: 1.1, label: 'Shoulder Grab Loop' });
      }
    } else if (silhouette === 'backrest_strut') {
      featurePlacement.push(
        { feature: 'Ergonomic High Backrest', placement: 'back', meshType: 'generic_panel', scale: 1.4, label: 'Dorsal Heavy Shield' },
        { feature: 'Quad Hydraulic Support Struts', placement: 'leg', meshType: 'strut_brace', scale: 1.2, label: 'Anti-Stagger Struts' },
        { feature: 'Pneumatic Elevation Cylinder', placement: 'back', meshType: 'canister_core', scale: 1.0, label: 'Spinal Elevation Piston' }
      );
    } else if (silhouette === 'tubular_frame') {
      featurePlacement.push(
        { feature: 'Dual Spoked Wheel Hubs', placement: 'shoulder', meshType: 'wheel_hub', scale: 1.2, label: 'Gyroscopic Wheel Hubs' },
        { feature: 'Tubular Alloy Triangle Spars', placement: 'chest', meshType: 'strut_brace', scale: 1.1, label: 'Exoskeleton Rollcage' },
        { feature: 'Steering Stem Horns', placement: 'head', meshType: 'antenna_spike', scale: 1.0, label: 'Sensor Antenna Horns' }
      );
    } else if (silhouette === 'columnar_tower') {
      featurePlacement.push(
        { feature: 'Monolith Columnar Slabs', placement: 'chest', meshType: 'columnar_tower', scale: 1.3, label: 'Fortress Spire Armor' },
        { feature: 'Window Matrix Grid Conduits', placement: 'chest', meshType: 'generic_panel', scale: 1.0, label: 'Grid Power Conduits' },
        { feature: 'Seismic Foundation Footpads', placement: 'feet', meshType: 'tread_plate', scale: 1.4, label: 'Seismic Stomp Soles' }
      );
    } else if (silhouette === 'thin_plate_clam') {
      featurePlacement.push(
        { feature: 'Tactical Display HUD', placement: 'chest', meshType: 'screen_hud', scale: 1.2, label: 'Combat Screen HUD' },
        { feature: 'Heavy Articulation Hinges', placement: 'shoulder', meshType: 'hinge_pivot', scale: 1.1, label: 'Rotary Shoulder Hinges' },
        { feature: 'Tactile Sensor Nodes', placement: 'arm', meshType: 'button_node', scale: 1.0, label: 'Capacitor Control Nodes' }
      );
    } else if (silhouette === 'aerodynamic_wedge') {
      featurePlacement.push(
        { feature: 'Vulcanized Lugged Traction Sole', placement: 'feet', meshType: 'tread_plate', scale: 1.3, label: 'High-Grip Tread Footplates' },
        { feature: 'Aerodynamic Heel Stabilizer', placement: 'leg', meshType: 'strut_brace', scale: 1.0, label: 'Heel Sprint Braces' },
        { feature: 'Harness Lacing Bands', placement: 'chest', meshType: 'strap_band', scale: 1.0, label: 'Utility Chest Straps' }
      );
    } else if (silhouette === 'branching_arbor') {
      featurePlacement.push(
        { feature: 'Branching Canopy Crests', placement: 'shoulder', meshType: 'branch_crest', scale: 1.2, label: 'Arbor Canopy Pauldrons' },
        { feature: 'Fibrous Trunk Armor', placement: 'chest', meshType: 'generic_panel', scale: 1.1, label: 'Fibrous Chest Plate' }
      );
    } else {
      if (n.includes('handle')) {
        featurePlacement.push({ feature: 'Grab Handle Arc', placement: 'shoulder', meshType: 'ring_handle', scale: 1.0, label: 'Shoulder Handle Loop' });
      }
      if (n.includes('screen') || n.includes('tech') || n.includes('phone')) {
        featurePlacement.push({ feature: 'Display Screen HUD', placement: 'chest', meshType: 'screen_hud', scale: 1.1, label: 'Display Panel' });
      }
      if (n.includes('button') || n.includes('key')) {
        featurePlacement.push({ feature: 'Tactile Control Keys', placement: 'arm', meshType: 'button_node', scale: 1.0, label: 'Control Nodes' });
      }
      if (n.includes('wheel')) {
        featurePlacement.push({ feature: 'Spoked Wheel Rims', placement: 'shoulder', meshType: 'wheel_hub', scale: 1.1, label: 'Wheel Hubs' });
      }
      if (n.includes('tread') || n.includes('sole') || n.includes('shoe')) {
        featurePlacement.push({ feature: 'Traction Lug Treads', placement: 'feet', meshType: 'tread_plate', scale: 1.2, label: 'Grip Footplates' });
      }
      if (featurePlacement.length === 0) {
        featurePlacement.push(
          { feature: 'Reinforced Chassis Plate', placement: 'chest', meshType: 'generic_panel', scale: 1.0, label: 'Main Armor Plate' },
          { feature: 'Heavy Articulation Pivots', placement: 'shoulder', meshType: 'hinge_pivot', scale: 1.0, label: 'Shoulder Pivots' },
          { feature: 'Cooling Exhaust Vents', placement: 'back', meshType: 'vent_exhaust', scale: 1.0, label: 'Cooling Vents' }
        );
      }
    }
  }

  // 7. Causal Transmutation Mappings (Original Feature -> Robot Feature)
  let transmutationMappings: any[] = Array.isArray(aiTransmutation?.transmutationMappings) && aiTransmutation.transmutationMappings.length >= 3
    ? aiTransmutation.transmutationMappings
    : [];

  if (transmutationMappings.length === 0) {
    if (silhouette === 'rectangular_box') {
      transmutationMappings = [
        { originalFeature: 'Rectangular cardboard body', robotFeature: 'Broad angular chest chassis', visualEffect: 'Flat angled deflection armor geometry', consequence: '-20% kinetic projectile impact shock' },
        { originalFeature: 'Folded box flaps', robotFeature: 'Articulated shoulder pauldrons', visualEffect: 'Multi-tiered dynamic shoulder flaps', consequence: '+15% upper torso defense coverage' },
        { originalFeature: 'Matte cardboard texture', robotFeature: 'Non-reflective low-sheen armor', visualEffect: `Stealth matte finish (roughness ${roughness.toFixed(2)})`, consequence: 'Suppresses optical & radar signatures' },
        { originalFeature: 'Reinforced center tape seam', robotFeature: 'High-tensile seal conduit', visualEffect: 'Heavy chrome centerline chassis lock', consequence: 'Prevents structural midriff breach' },
        { originalFeature: 'Dominant surface coloring', robotFeature: 'Primary Cybertronian armor plating', visualEffect: `High-fidelity ${primaryColor} chassis coating`, consequence: 'Authentic object visual signature' },
      ];
    } else if (silhouette === 'cylindrical_bottle') {
      transmutationMappings = [
        { originalFeature: 'Cylindrical fluid reservoir', robotFeature: 'Energon core liquid chamber', visualEffect: 'Pressurized translucent coolant cylinder', consequence: 'Stores volatile energy for ability burst' },
        { originalFeature: 'Threaded bottleneck cap', robotFeature: 'Hermetic crown helmet seal', visualEffect: 'Threaded crown crest atop battle helmet', consequence: 'Complete resistance to environmental gas hazards' },
        { originalFeature: 'Smooth cylindrical hull', robotFeature: 'Concentric tubular torso armor', visualEffect: `High-durability curved deflection hull in ${primaryColor}`, consequence: '-25% slashing & shearing attack damage' },
        { originalFeature: 'Narrow bottle neck', robotFeature: 'Hydraulic throat articulation', visualEffect: 'Dual-axis high-speed neck swivel joint', consequence: '+15% target acquisition & precision' },
      ];
    } else if (silhouette === 'backrest_strut') {
      transmutationMappings = [
        { originalFeature: 'Ergonomic high backrest', robotFeature: 'Dorsal heavy blast shield', visualEffect: 'Massive armored spine guard', consequence: '+25% defense against rear & flanking attacks' },
        { originalFeature: 'Quad support base legs', robotFeature: 'Hydraulic ground stabilizer struts', visualEffect: 'Diagonal steel braces anchored to knee joints', consequence: '-35% stagger duration from heavy melee hits' },
        { originalFeature: 'Pneumatic height cylinder', robotFeature: 'Spinal elevation piston', visualEffect: 'Pneumatic chrome piston along center spine', consequence: 'Dynamic combat stance adjustment' },
      ];
    } else if (silhouette === 'tubular_frame') {
      transmutationMappings = [
        { originalFeature: 'Dual spoked wheels', robotFeature: 'Shoulder & hip gyroscopic wheel hubs', visualEffect: 'Rotating alloy rims with cross-spokes', consequence: '+25% evasive strafing & sprint momentum' },
        { originalFeature: 'Tubular triangle frame', robotFeature: 'Lightweight alloy rollcage spars', visualEffect: 'Exposed high-tensile tubular exoskeleton', consequence: 'Maximum strength-to-weight ratio' },
        { originalFeature: 'Handlebar steering stem', robotFeature: 'Head-mounted sensor horns', visualEffect: 'Dual raked antenna receptors on helmet', consequence: '+15% radar scanning range in arena' },
      ];
    } else if (silhouette === 'thin_plate_clam') {
      transmutationMappings = [
        { originalFeature: 'Folding display screen', robotFeature: 'Tactical chest HUD display', visualEffect: 'Dark glass screen with glowing energon targeting grid', consequence: 'Real-time enemy trajectory tracking' },
        { originalFeature: 'Dual articulation hinges', robotFeature: 'Heavy rotary shoulder knuckles', visualEffect: 'Reinforced cylindrical mechanical hinge joints', consequence: 'Full 360-degree weapon traverse' },
        { originalFeature: 'Keyboard key matrix', robotFeature: 'Pectoral capacitor control nodes', visualEffect: 'Grid of illuminated sensor keys on forearm & chest', consequence: '-20% special ability cooldown' },
      ];
    } else if (silhouette === 'aerodynamic_wedge') {
      transmutationMappings = [
        { originalFeature: 'Vulcanized rubber sole', robotFeature: 'Traction stomp footplates', visualEffect: 'Deep grooved high-friction rubber lugs on soles', consequence: '+20% sprint acceleration & ground grip' },
        { originalFeature: 'Aerodynamic shoe profile', robotFeature: 'Streamlined wedge armor hull', visualEffect: 'Raked low-drag armor plating', consequence: 'Dashing consumes 30% less battle energy' },
        { originalFeature: 'Lacing harness system', robotFeature: 'Utility armor tension cables', visualEffect: 'Criss-cross braided alloy cables across torso', consequence: '+15% chassis structural integrity' },
      ];
    } else if (silhouette === 'columnar_tower') {
      transmutationMappings = [
        { originalFeature: 'Towering structural facade', robotFeature: 'Monolithic fortress armor slabs', visualEffect: 'Tall stacked columnar armor plating', consequence: '+40% maximum HP & impact durability' },
        { originalFeature: 'Window matrix grid', robotFeature: 'Energon conduit window cells', visualEffect: 'Illuminated grid rows along chest and waist', consequence: 'Continuous arena energy absorption' },
        { originalFeature: 'Deep foundation base', robotFeature: 'Seismic stomp ground plates', visualEffect: 'Enlarged magnetic footplates', consequence: 'Normal attacks inflict +30% enemy knockback' },
      ];
    } else {
      transmutationMappings = [
        { originalFeature: `Original ${objName} contour`, robotFeature: 'Sculpted armor plate geometry', visualEffect: `Custom chassis matching ${silhouette.replace(/_/g, ' ')} proportions`, consequence: 'Optimal combat balance & structural fidelity' },
        { originalFeature: `Dominant color (${primaryColor})`, robotFeature: 'Primary battle armor coating', visualEffect: `High-fidelity ${primaryColor} chassis finish`, consequence: 'Instant visual provenance from photo' },
        { originalFeature: `${surfaceMaterial} material composition`, robotFeature: 'Surface armor metallurgy', visualEffect: `${surfaceMaterial} finish with calibrated roughness (${roughness.toFixed(2)})`, consequence: 'Physical matter resistance bonuses' },
        { originalFeature: 'Mechanical functional elements', robotFeature: 'Integrated combat apparatus', visualEffect: 'Articulated joint knuckles and tactical vents', consequence: '+15% overall combat effectiveness' },
      ];
    }
  }

  return {
    silhouette,
    bodyProportions,
    primaryColor,
    secondaryColor,
    accentColors,
    surfaceMaterial,
    roughness,
    metallic,
    signatureFeatures,
    geometryMotifs,
    armorPatterns,
    mechanicalDetails,
    featurePlacement,
    transmutationMappings,
  };
}

// Normalizer ensuring creature data ALWAYS contains a complete, robust Object Recognition 2.0 DNA
function ensureStructuredObjectDna(
  creature: any,
  clientAnalyzed?: any,
  promptHint: string = '',
  distanceFromStartMeters: number = 0
) {
  if (!creature) return creature;

  const objName = creature.originalObject || creature.name || promptHint || 'Physical Artifact';
  const primary = creature.visualParams?.primaryColor || clientAnalyzed?.primaryHex || '#2563EB';
  const secondary = creature.visualParams?.secondaryColor || clientAnalyzed?.secondaryHex || '#64748B';
  const complexity = creature.objectComplexity || evaluateServerObjectScale(objName, clientAnalyzed);

  if (!creature.objectDna) {
    creature.objectDna = {};
  }
  const dna = creature.objectDna;

  // 1. Object Identity
  if (!dna.objectIdentity) {
    dna.objectIdentity = {
      canonicalName: objName,
      objectCategory: inferCategoryFromObject(objName),
      specificDescription: `Real-world ${objName.toLowerCase()} identified via vision sensor`,
      recognitionConfidence: 0.92,
      alternativeInterpretations: [],
      isForegroundDominant: true,
    };
  } else {
    dna.objectIdentity.canonicalName = dna.objectIdentity.canonicalName || objName;
    dna.objectIdentity.objectCategory = dna.objectIdentity.objectCategory || inferCategoryFromObject(objName);
    dna.objectIdentity.specificDescription = dna.objectIdentity.specificDescription || `Scanned ${objName}`;
    dna.objectIdentity.recognitionConfidence = typeof dna.objectIdentity.recognitionConfidence === 'number'
      ? Math.max(0.1, Math.min(1.0, dna.objectIdentity.recognitionConfidence))
      : 0.90;
    dna.objectIdentity.alternativeInterpretations = Array.isArray(dna.objectIdentity.alternativeInterpretations)
      ? dna.objectIdentity.alternativeInterpretations
      : [];
    dna.objectIdentity.isForegroundDominant = dna.objectIdentity.isForegroundDominant ?? true;
  }

  // 2. Visual Identity
  if (!dna.visualIdentity) {
    dna.visualIdentity = {
      silhouetteDescription: `Silhouette matching ${objName} with distinct contours`,
      dominantColors: [primary],
      secondaryColors: [secondary],
      colorDistribution: `Primary armor plated in ${primary} with ${secondary} trim accents`,
      shape: inferShapeFromObject(objName),
      proportions: 'proportional',
      surfaceAppearance: 'semi-matte finish with structural paneling',
      distinctiveVisualFeatures: [
        `${primary} dominant chassis tone`,
        `${secondary} mechanical joint accents`,
        'Energon infused power core',
      ],
    };
  } else {
    dna.visualIdentity.dominantColors = Array.isArray(dna.visualIdentity.dominantColors) && dna.visualIdentity.dominantColors.length > 0
      ? dna.visualIdentity.dominantColors
      : [primary];
    dna.visualIdentity.secondaryColors = Array.isArray(dna.visualIdentity.secondaryColors) && dna.visualIdentity.secondaryColors.length > 0
      ? dna.visualIdentity.secondaryColors
      : [secondary];
    dna.visualIdentity.shape = dna.visualIdentity.shape || inferShapeFromObject(objName);
    dna.visualIdentity.surfaceAppearance = dna.visualIdentity.surfaceAppearance || 'structural armored paneling';
  }

  // 3. Physical Identity
  if (!dna.physicalIdentity) {
    dna.physicalIdentity = {
      estimatedSizeClass: complexity.scaleTier || 'medium',
      estimatedMassClass: complexity.physicalMassDesc || 'Medium (~1.2 kg visual estimate)',
      materialCandidates: [creature.materialPhysics?.materialName || 'Polymer Alloy & Reinforced Steel'],
      structuralComplexity: complexity.scaleTier === 'colossal' ? 'ultra-complex' : complexity.scaleTier === 'large' ? 'complex' : 'moderate',
      rigidity: 'rigid',
      flexibility: 25,
      density: creature.materialPhysics?.density || 'medium',
      likelyPhysicalProperties: ['impact resistant', 'dielectric structural casing'],
    };
  } else {
    dna.physicalIdentity.estimatedSizeClass = dna.physicalIdentity.estimatedSizeClass || complexity.scaleTier || 'medium';
    dna.physicalIdentity.estimatedMassClass = dna.physicalIdentity.estimatedMassClass || complexity.physicalMassDesc || 'Medium visual estimate';
    dna.physicalIdentity.materialCandidates = Array.isArray(dna.physicalIdentity.materialCandidates) && dna.physicalIdentity.materialCandidates.length > 0
      ? dna.physicalIdentity.materialCandidates
      : [creature.materialPhysics?.materialName || 'High-grade Cybertronian alloy'];
    dna.physicalIdentity.rigidity = dna.physicalIdentity.rigidity || 'rigid';
    dna.physicalIdentity.flexibility = typeof dna.physicalIdentity.flexibility === 'number' ? dna.physicalIdentity.flexibility : 30;
    dna.physicalIdentity.density = dna.physicalIdentity.density || creature.materialPhysics?.density || 'medium';
  }

  // 4. Signature Features
  if (!Array.isArray(dna.signatureFeatures) || dna.signatureFeatures.length === 0) {
    dna.signatureFeatures = extractSignatureFeatures(objName, primary, secondary);
  }

  // 5. Gameplay Identity & Property Consequences
  if (!dna.gameplayIdentity) {
    dna.gameplayIdentity = {
      combatTier: complexity.tierLabel || 'B-TIER COMBAT WARRIOR',
      suggestedClass: creature.robotClass || 'Warrior',
      strengths: creature.materialPhysics?.counterStrengths || ['Balanced armor defense', 'Stable footing'],
      weaknesses: creature.materialPhysics?.counterWeaknesses || ['High impact vulnerability'],
      movementStyle: 'Grounded heavy stride',
      attackStyle: 'Kinetic blaster & energized strikes',
      specialAbilityConcept: creature.specialAbility?.name || 'Energon Surge Burst',
      propertyConsequences: generatePropertyConsequences(objName, creature.materialPhysics, complexity),
    };
  } else {
    if (!Array.isArray(dna.gameplayIdentity.propertyConsequences) || dna.gameplayIdentity.propertyConsequences.length === 0) {
      dna.gameplayIdentity.propertyConsequences = generatePropertyConsequences(objName, creature.materialPhysics, complexity);
    }
  }

  // 6. Visual Fingerprint
  if (!dna.visualFingerprint) {
    dna.visualFingerprint = {
      primaryShape: inferShapeFromObject(objName),
      aspectRatio: 'balanced',
      primaryColor: primary,
      secondaryColor: secondary,
      signatureFeatures: dna.signatureFeatures.slice(0, 4),
      surface: 'metallic composite',
      geometryHints: inferGeometryHints(objName),
      mustPreserveFeatures: dna.signatureFeatures.slice(0, 3),
    };
  } else {
    dna.visualFingerprint.primaryColor = dna.visualFingerprint.primaryColor || primary;
    dna.visualFingerprint.secondaryColor = dna.visualFingerprint.secondaryColor || secondary;
    dna.visualFingerprint.primaryShape = dna.visualFingerprint.primaryShape || inferShapeFromObject(objName);
    dna.visualFingerprint.geometryHints = Array.isArray(dna.visualFingerprint.geometryHints) && dna.visualFingerprint.geometryHints.length > 0
      ? dna.visualFingerprint.geometryHints
      : inferGeometryHints(objName);
    dna.visualFingerprint.signatureFeatures = Array.isArray(dna.visualFingerprint.signatureFeatures) && dna.visualFingerprint.signatureFeatures.length > 0
      ? dna.visualFingerprint.signatureFeatures
      : dna.signatureFeatures.slice(0, 4);
  }

  // 7. Visual Transmutation 2.0 Contract Synthesizer
  const vt = synthesizeVisualTransmutation(
    objName,
    primary,
    secondary,
    creature.materialPhysics,
    clientAnalyzed,
    complexity,
    creature.visualTransmutation || creature.objectDna?.visualTransmutation || creature.visualParams?.visualTransmutation
  );
  creature.visualTransmutation = vt;
  dna.visualTransmutation = vt;

  // Harmonize with creature.visualParams so Three.js 3D builder accesses geometry hints & transmutation
  if (!creature.visualParams) creature.visualParams = {};
  creature.visualParams.visualTransmutation = vt;
  creature.visualParams.geometryHints = vt.geometryMotifs;
  creature.visualParams.primaryShape = vt.silhouette;
  creature.visualParams.visualFingerprint = dna.visualFingerprint;
  creature.visualParams.primaryColor = clientAnalyzed?.primaryHex || vt.primaryColor || primary;
  creature.visualParams.secondaryColor = clientAnalyzed?.secondaryHex || vt.secondaryColor || secondary;
  creature.visualParams.roughnessFactor = vt.roughness;
  creature.visualParams.metallicFactor = vt.metallic;

  // Real-world physical shape archetype for 3D transformer morphology
  if (clientAnalyzed?.shapeArchetype) {
    creature.visualParams.shapeArchetype = clientAnalyzed.shapeArchetype;
  } else if (!creature.visualParams.shapeArchetype) {
    const text = `${objName} ${vt.silhouette || ''} ${dna.visualIdentity?.shape || ''}`.toLowerCase();
    if (
      /bottle|flask|canister|thermos|cylinder|cylindrical|can\b|tumbler|mug|cup\b|tube|pipe|beaker|container|dispenser|shampoo|spray|deodorant|candle|vase|penn\b|pencil|marker/i.test(
        text
      )
    ) {
      creature.visualParams.shapeArchetype = 'cylinder';
    } else if (
      /sheet|slab|laptop|notebook|macbook|chromebook|tablet|ipad|phone|smartphone|screen|display|monitor|flatscreen|book|card|paper|board|clipboard|kindle|switch|deck/i.test(
        text
      )
    ) {
      creature.visualParams.shapeArchetype = 'sheet_slab';
    } else if (
      /sphere|spherical|round|ball|orb\b|globe|apple|orange|fruit|tomato|lemon|onion|melon|baseball|basketball|football|soccer|tennis|golf|marble|bulb|pearl|dome|circle|circular/i.test(
        text
      )
    ) {
      creature.visualParams.shapeArchetype = 'sphere_round';
    } else {
      creature.visualParams.shapeArchetype = 'cuboid_box';
    }
  }

  // 8. Causal Combat DNA 3.0: Physical Properties -> Gameplay Mechanics -> Combat Consequence
  const combatDna = creature.combatDna || creature.objectDna?.combatDna || deriveCombatDna(creature);
  creature.combatDna = combatDna;
  dna.combatDna = combatDna;
  if (dna.gameplayIdentity) {
    dna.gameplayIdentity.combatDna = combatDna;
  }

  // 9. Strict Dynamic State & Power Scaling (Object Complexity + Distance from Start)
  const dist = Number(distanceFromStartMeters) || Number(creature.distanceExplored) || 0;
  const derivedStats = deriveServerCombatStats(complexity, dist, objName, primary);
  creature.stats = {
    hp: derivedStats.hp,
    attack: derivedStats.attack,
    defense: derivedStats.defense,
    speed: derivedStats.speed,
  };
  creature.powerRating = derivedStats.powerRating;
  creature.derivedStats = derivedStats;
  creature.distanceExplored = dist;
  if (creature.specialAbility) {
    creature.specialAbility.damage = derivedStats.abilityDamage;
    creature.specialAbility.cooldown = derivedStats.abilityCooldown;
  }
  if (dna.gameplayIdentity) {
    dna.gameplayIdentity.combatStats = derivedStats;
    dna.gameplayIdentity.distancePowerTier = {
      distanceMeters: dist,
      bonusPercent: derivedStats.distanceBonusPercent,
      tierLabel: derivedStats.distanceTierLabel,
      tierBadge: derivedStats.distanceTierBadge,
    };
  }

  return creature;
}

// Detect shape archetype on the server
function detectServerObjectShapeArchetype(
  objectName: string = '',
  shapeHint: string = ''
): 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box' {
  const text = `${objectName} ${shapeHint}`.toLowerCase();
  if (
    /bottle|flask|canister|thermos|cylinder|cylindrical|can\b|tumbler|mug|cup\b|tube|pipe|beaker|container|dispenser|shampoo|spray|deodorant|candle|vase|pen\b|pencil|marker/i.test(
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

// Procedural generator that dynamically crafts a custom creature tailored to the photo's colors and hint
function generateProceduralCreature(hint: string, clientAnalyzed?: any, distanceFromStartMeters: number = 0) {
  const h = (hint || "").toLowerCase();
  const primary = clientAnalyzed?.primaryHex || "#00E5FF";
  const secondary = clientAnalyzed?.secondaryHex || "#7C4DFF";
  const glow = clientAnalyzed?.glowHex || "#00FF66";
  const isWarm = clientAnalyzed?.isWarm ?? true;
  const complexity = evaluateServerObjectScale(hint, clientAnalyzed);

  // 1. Colossal Tier: Vehicles, Heavy Engines & Industrial Machinery
  if (
    h.includes("car") ||
    h.includes("truck") ||
    h.includes("vehicle") ||
    h.includes("motorcycle") ||
    h.includes("bike") ||
    h.includes("engine") ||
    h.includes("generator") ||
    h.includes("machinery") ||
    h.includes("tractor") ||
    h.includes("refrigerator")
  ) {
    return {
      name: "Optimus V8-Gigawatt (Colossal Titan)",
      faction: "Autobot",
      robotClass: "Dreadnought",
      originalObject: hint || "Heavy Combustion Vehicle & Engine",
      objectFeature: "Massive quad-exhaust smokestacks, V8 combustion heart, and dual heavy plasma railguns",
      element: "fire",
      rarity: "Mythic",
      lore: `Forged from a high-displacement vehicle engine, this colossal Autobot Dreadnought commands devastating horsepower, unbreakable chassis armor, and supreme arena dominance.`,
      stats: { hp: 1180, attack: 175, defense: 135, speed: 9 },
      materialPhysics: {
        materialName: "Tempered Cast Iron, Chromium Alloy & Reinforced Steel",
        heatResistance: 98,
        electricalConductivity: 45,
        impactDurability: 98,
        elasticity: 10,
        density: "superdense",
        counterStrengths: ["Heavy Armor Bastion: -40% damage from kinetic and projectile impacts", "High-Torque Crush: Normal attacks deal +25% knockback"],
        counterWeaknesses: ["High Inertia: Dash cooldown +0.4s", "Conductive Chassis: Vulnerable to high-voltage EMP storms"],
      },
      specialAbility: {
        name: "Cataclysmic Supercharger Nova",
        description: "Ignites twin turbochargers to unleash an arena-wide shockwave of superheated plasma that pulverizes all rivals for 280 damage.",
        cooldown: 7,
        damage: 280,
        vfxType: "nova",
        icon: "💥",
        effectType: "damage_burst",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#DC2626",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#1E293B",
        glowColor: glow || "#00E5FF",
        objectArchetype: "generic_item",
        bodyShape: "mech",
        scale: 1.65, // Towering Colossal scale
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: true,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "fire",
        hasHandle: false,
        hasCapOrLid: true,
        metallicFactor: 0.95,
        roughnessFactor: 0.2,
      },
      objectComplexity: complexity,
    };
  }

  // 2. Large Tier: Computers, Laptops, Monitors & Power Equipment
  if (
    h.includes("laptop") ||
    h.includes("computer") ||
    h.includes("pc") ||
    h.includes("monitor") ||
    h.includes("drill") ||
    h.includes("tool") ||
    h.includes("printer") ||
    h.includes("guitar")
  ) {
    return {
      name: "Cyber-Mainframe Titan (Heavy Assault)",
      faction: "Autobot",
      robotClass: "Leader",
      originalObject: hint || "Multi-Core Laptop Computer",
      objectFeature: "Silicon quantum processor matrix, dual cooling fans, and high-voltage rail-cannons",
      element: "cyber",
      rarity: "Legendary",
      lore: `Infused with billions of computing operations per second, this heavy Cybertronian assault mech predicts enemy trajectories before unleashing pinpoint laser barrages.`,
      stats: { hp: 880, attack: 132, defense: 100, speed: 11 },
      materialPhysics: {
        materialName: "Anodized Aluminum, Silicon Microchips & Gorilla Glass",
        heatResistance: 60,
        electricalConductivity: 95,
        impactDurability: 82,
        elasticity: 25,
        density: "heavy",
        counterStrengths: ["Quantum Targeting: All attacks have +25% critical strike chance", "Electromagnetic Shielding: -30% damage from electric weapons"],
        counterWeaknesses: ["Overheating Risk: +25% extra damage in high-temperature environments"],
      },
      specialAbility: {
        name: "Orbital Overclock Beam",
        description: "Channels overclocked processor bus voltage into a devastating particle beam that melts enemy armor for 235 damage.",
        cooldown: 6,
        damage: 235,
        vfxType: "beam",
        icon: "⚡",
        effectType: "laser_beam",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#0F172A",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#00E5FF",
        glowColor: glow || "#00FF66",
        objectArchetype: "phone_tech",
        bodyShape: "mech",
        scale: 1.4,
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "cyber_cubes",
        hasScreen: true,
        metallicFactor: 0.92,
        roughnessFactor: 0.18,
      },
      objectComplexity: complexity,
    };
  }

  // 3. Micro Tier: Keys, Coins, Pens, Earbuds
  if (
    h.includes("key") ||
    h.includes("coin") ||
    h.includes("pen") ||
    h.includes("pencil") ||
    h.includes("earbud") ||
    h.includes("airpod")
  ) {
    return {
      name: "Volt-Needle Infiltrator (Speed Scout)",
      faction: "Autobot",
      robotClass: "Scout",
      originalObject: hint || "Brass Mechanical Key",
      objectFeature: "Precision serrated keyblade stingers and micro-quantum teleport thrusters",
      element: "electric",
      rarity: "Rare",
      lore: `A pocket-sized key forged into an ultra-agile micro-infiltrator. While possessing lightweight armor, its blistering speed and high evasion make it impossible to hit.`,
      stats: { hp: 430, attack: 74, defense: 48, speed: 17 },
      materialPhysics: {
        materialName: "Forged Brass & Hardened Nickel Plate",
        heatResistance: 70,
        electricalConductivity: 65,
        impactDurability: 60,
        elasticity: 40,
        density: "light",
        counterStrengths: ["Extreme Agility: Base movement speed +35%", "Micro Hitbox: Evades 20% of incoming projectiles"],
        counterWeaknesses: ["Low Mass: Takes +35% damage from heavy colossal blunt attacks"],
      },
      specialAbility: {
        name: "Supersonic Keyblade Flurry",
        description: "Darts around opponents at supersonic velocity, striking with high-voltage key stings.",
        cooldown: 4,
        damage: 145,
        vfxType: "lightning",
        icon: "⚡",
        effectType: "stun_chain",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#EAB308",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#71717A",
        glowColor: glow || "#38BDF8",
        objectArchetype: "tool_blade",
        bodyShape: "mech",
        scale: 0.92,
        hornsOrCrest: true,
        wings: true,
        tail: false,
        spikes: true,
        armorPlates: false,
        floatingOrbs: true,
        auraParticleType: "electricity",
        hasBladesOrTines: true,
        metallicFactor: 0.95,
        roughnessFactor: 0.15,
      },
      objectComplexity: complexity,
    };
  }

  // Infer archetype and theme from hint or colors
  if (h.includes("mug") || h.includes("cup") || h.includes("coffee") || h.includes("tea")) {
    return {
      name: "Optimus Caffeo-Prime",
      faction: "Autobot",
      robotClass: "Leader",
      originalObject: hint || "Ceramic Beverage Mug",
      objectFeature: "Ion smokestacks, Matrix ceramic chestplate, and scalding steam blasters",
      element: "fire",
      rarity: "Legendary",
      lore: `Transformed from an everyday coffee mug, this noble Autobot Commander channels superheated ceramic plating and boiling energon to defend the Cybertron colosseum.`,
      stats: { hp: 620, attack: 95, defense: 78, speed: 11 },
      materialPhysics: {
        materialName: "Glazed Vitreous Ceramic & Cyber-Titanium",
        heatResistance: 95,
        electricalConductivity: 10,
        impactDurability: 75,
        elasticity: 15,
        density: "heavy",
        counterStrengths: ["Thermal Insulation: Complete immunity to fire burning damage", "Electrical Insulator: -40% damage from electric shocks"],
        counterWeaknesses: ["Brittle Crystal Glaze: +30% damage from rock and blunt impact", "Vulnerable to rapid cryogenic thermal shock"],
      },
      specialAbility: {
        name: "Matrix Energon Bastion",
        description: "Unleashes an expanding Matrix shockwave, heals +75 HP, and deploys a glowing energy forcefield.",
        cooldown: 6,
        damage: 195,
        vfxType: "matrix_burst",
        icon: "🛡️",
        effectType: "buff_shield",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#D32F2F",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#1976D2",
        glowColor: glow || "#00E5FF",
        objectArchetype: "cup_mug",
        bodyShape: "mech",
        scale: 1.2,
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "fire",
        hasHandle: true,
        hasCapOrLid: false,
        metallicFactor: 0.85,
        roughnessFactor: 0.25,
      },
    };
  }

  if (h.includes("shoe") || h.includes("sneaker") || h.includes("boot") || h.includes("runner")) {
    return {
      name: "Bumble-Stride Scout",
      faction: "Autobot",
      robotClass: "Scout",
      originalObject: hint || "Athletic Running Sneaker",
      objectFeature: "Shock-absorbing tread armor and arm-mounted rapid plasma stingers",
      element: "electric",
      rarity: "Epic",
      lore: `Forged from a high-performance running sneaker, this Autobot Scout maneuvers across the arena with lightning-charged reflexes and rubberized dampeners.`,
      stats: { hp: 480, attack: 105, defense: 55, speed: 14 },
      materialPhysics: {
        materialName: "Vulcanized Rubber & Thermoplastic Polyurethane",
        heatResistance: 40,
        electricalConductivity: 0,
        impactDurability: 85,
        elasticity: 95,
        density: "light",
        counterStrengths: ["Dielectric Grounding: 100% immune to electric stun", "Kinetic Rebound: Dashing consumes 35% less stamina"],
        counterWeaknesses: ["Puncture Susceptibility: Takes +30% damage from sharp spikes", "Melting Friction: Extra damage from fire hazards"],
      },
      specialAbility: {
        name: "Supersonic Stinger Warp",
        description: "Fires twin rapid-fire electric bolts that shock, stun, and destabilize enemy mechs.",
        cooldown: 5,
        damage: 185,
        vfxType: "chain_lightning",
        icon: "⚡",
        effectType: "stun_chain",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#FBC02D",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#212121",
        glowColor: glow || "#00E5FF",
        objectArchetype: "footwear_shoe",
        bodyShape: "mech",
        scale: 1.05,
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "electricity",
        hasSoleTread: true,
        metallicFactor: 0.75,
        roughnessFactor: 0.3,
      },
    };
  }

  if (h.includes("plant") || h.includes("cactus") || h.includes("flower") || h.includes("leaf") || h.includes("tree")) {
    return {
      name: "Bramble-Crush Dreadnought",
      faction: "Decepticon",
      robotClass: "Dreadnought",
      originalObject: hint || "Succulent Plant",
      objectFeature: "Dense carbonized spike armor and twin hydraulic crushing pincers",
      element: "nature",
      rarity: "Rare",
      lore: `Awakened from a hardy room succulent, this Decepticon Dreadnought crushes opposition with armored thorny plates and dark energon reserves.`,
      stats: { hp: 680, attack: 85, defense: 90, speed: 10 },
      materialPhysics: {
        materialName: "Succulent Cellulose & Lignin Thorns",
        heatResistance: 75,
        electricalConductivity: 25,
        impactDurability: 85,
        elasticity: 45,
        density: "heavy",
        counterStrengths: ["Thorny Retaliation: Reflects 20% of close melee damage back at attacker", "Internal Water Reservoir: Heals +25% faster during rain"],
        counterWeaknesses: ["Desiccating Flames: Takes +35% damage from Fire attacks", "Vulnerable to sub-zero cellular freeze damage"],
      },
      specialAbility: {
        name: "Bastion Mortar Battery",
        description: "Launches a cluster salvo of heavy armor-piercing mortar shells.",
        cooldown: 8,
        damage: 200,
        vfxType: "mortar_barrage",
        icon: "💣",
        effectType: "artillery_cluster",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#2E7D32",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#1B5E20",
        glowColor: glow || "#76FF03",
        objectArchetype: "plant_organic",
        bodyShape: "mech",
        scale: 1.25,
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: true,
        armorPlates: true,
        floatingOrbs: false,
        auraParticleType: "leaves",
        hasSucculentSpines: true,
        metallicFactor: 0.6,
        roughnessFactor: 0.4,
      },
    };
  }

  if (h.includes("bottle") || h.includes("flask") || h.includes("can") || h.includes("thermos")) {
    return {
      name: "Cryo-Jet Starscream",
      faction: "Decepticon",
      robotClass: "Seeker",
      originalObject: hint || "Beverage Bottle",
      objectFeature: "Swept-wing supersonic turbines and pressurized liquid nitrogen cryo-cannons",
      element: isWarm ? "fire" : "ice",
      rarity: "Epic",
      lore: `Infused with supersonic flight thrusters, this Decepticon Seeker strafes battlegrounds firing supercooled cryo-projectiles from its alloy wing pods.`,
      stats: { hp: 530, attack: 96, defense: 68, speed: 13 },
      materialPhysics: {
        materialName: "Anodized Stainless Steel & Polycarbonate",
        heatResistance: 85,
        electricalConductivity: 65,
        impactDurability: 80,
        elasticity: 20,
        density: "medium",
        counterStrengths: ["Rigid Cylindrical Shell: -25% damage from slashing attacks", "Pressurized Reservoir: Rapid-fire ranged cooldown"],
        counterWeaknesses: ["Conductive Metal: Takes +25% damage from electric lightning", "Pressure Burst vulnerability under high heat"],
      },
      specialAbility: {
        name: "Supersonic Null-Ray Airstrike",
        description: "Engages supersonic flight thrusters, raining tracking micro-missiles from above.",
        cooldown: 6,
        damage: 210,
        vfxType: "airstrike",
        icon: "🚀",
        effectType: "homing_barrage",
      },
      visualParams: {
        primaryColor: primary,
        secondaryColor: secondary,
        glowColor: glow || "#EF4444",
        objectArchetype: "bottle_can",
        bodyShape: "mech",
        scale: 1.15,
        hornsOrCrest: false,
        wings: true,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: isWarm ? "fire" : "ice_crystals",
        hasCapOrLid: true,
        metallicFactor: 0.9,
        roughnessFactor: 0.2,
      },
    };
  }

  if (h.includes("phone") || h.includes("laptop") || h.includes("keyboard") || h.includes("mouse") || h.includes("tech") || h.includes("screen")) {
    return {
      name: "Soundwave Digicell",
      faction: "Decepticon",
      robotClass: "Infiltrator",
      originalObject: hint || "Digital Mobile Device",
      objectFeature: "Holographic radar visor and sonic frequency disruption dish",
      element: "cyber",
      rarity: "Legendary",
      lore: `Transmuted from a high-tech smart device, this Decepticon Communications Officer unleashes concussive sonic disruption and encrypted countermeasures.`,
      stats: { hp: 490, attack: 110, defense: 60, speed: 13 },
      materialPhysics: {
        materialName: "Gorilla Glass, Silicon & Anodized Aluminum",
        heatResistance: 40,
        electricalConductivity: 90,
        impactDurability: 60,
        elasticity: 30,
        density: "light",
        counterStrengths: ["Overclocked Processing: Critical strike chance increased by +30%", "Digital Matrix: Absorbs energy from cyber attacks"],
        counterWeaknesses: ["Glass Fragility: +30% damage from blunt impacts", "Water Short-Circuit: Vulnerable in rain"],
      },
      specialAbility: {
        name: "Tactical Matrix Railgun",
        description: "Focuses an armor-piercing high-energy laser railgun beam through enemy shields.",
        cooldown: 6,
        damage: 215,
        vfxType: "railgun",
        icon: "🎯",
        effectType: "piercing_beam",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#1A237E",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#B0BEC5",
        glowColor: glow || "#D500F9",
        objectArchetype: "phone_tech",
        bodyShape: "mech",
        scale: 1.1,
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "cyber_cubes",
        hasScreen: true,
        metallicFactor: 0.9,
        roughnessFactor: 0.15,
      },
    };
  }

  // 11. Box / Cardboard / Carton / Package
  if (h.includes("box") || h.includes("cardboard") || h.includes("carton") || h.includes("package") || h.includes("crate")) {
    const rawBox = {
      name: "Optimus Corrugator",
      originalObject: "Corrugated Cardboard Box",
      faction: "Autobot",
      robotClass: "Warrior",
      objectFeature: "Interlocking flap armor plates and shock-absorbent fiber hull",
      element: "rock",
      rarity: "Epic",
      lore: "Infused with Allspark energon, this sturdy cardboard box transformed into an agile kinetic brawler. Its accordion-core fiber skin absorbs blunt impacts while launching rapid kinetic strikes.",
      stats: { hp: 580, attack: 92, defense: 84, speed: 13 },
      materialPhysics: {
        materialName: "Treated Corrugated Cardboard Fiber",
        heatResistance: 25,
        electricalConductivity: 15,
        impactDurability: 82,
        elasticity: 65,
        density: "light",
        counterStrengths: ["Kinetic Fiber Dampening: -25% damage from physical projectile hits", "Lightweight Agility: Quick recovery from dashes and dodges"],
        counterWeaknesses: ["Flammable Cellulose: +35% damage from Fire and burn effects", "Water Saturation: Weakened defense in heavy rain"],
      },
      specialAbility: {
        name: "Fiber-Burst Flap Bash",
        description: "Deploys pressurized reinforced flaps that knock back nearby foes and deflect incoming missiles.",
        cooldown: 5,
        damage: 175,
        vfxType: "nova",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#2563EB",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#D97706",
        glowColor: glow || "#00E5FF",
        objectArchetype: "generic_item",
        bodyShape: "mech",
        scale: 1.15,
        geometryHints: ["box_armor", "broad_torso", "flat_panels"],
        primaryShape: "rectangular cuboid",
        hornsOrCrest: false,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: false,
        auraParticleType: "cyber_cubes",
        metallicFactor: 0.45,
        roughnessFactor: 0.65,
      },
    };
    return ensureStructuredObjectDna(rawBox, clientAnalyzed, hint);
  }

  // 12. Chair / Seating / Furniture / Desk
  if (h.includes("chair") || h.includes("seat") || h.includes("stool") || h.includes("furniture") || h.includes("desk") || h.includes("bench")) {
    const rawChair = {
      name: "Iron-Bastion Strut",
      originalObject: "Structural Support Chair",
      faction: "Autobot",
      robotClass: "Leader",
      objectFeature: "High dorsal backrest shield plate and quad-hydraulic support struts",
      element: "cyber",
      rarity: "Legendary",
      lore: "Once an everyday office swivel chair, it now stands as an unyielding command sentinel. Its dorsal backrest acts as a towering blast shield while quad-strut hydraulic legs absorb ground-shattering impacts.",
      stats: { hp: 780, attack: 112, defense: 118, speed: 10 },
      materialPhysics: {
        materialName: "High-Tensile Tubular Steel & Polymer",
        heatResistance: 70,
        electricalConductivity: 65,
        impactDurability: 90,
        elasticity: 40,
        density: "heavy",
        counterStrengths: ["Backrest Aegis: High defense against flanking attacks", "Hydraulic Stability: Immune to ground staggers"],
        counterWeaknesses: ["Inertial Mass: Reduced sprint velocity", "Joint Wear: Critical vulnerability at pivot hinges"],
      },
      specialAbility: {
        name: "Hydraulic Seismic Stomp",
        description: "Drives hydraulic support struts into the ground, sending a devastating seismic wave through the arena floor.",
        cooldown: 7,
        damage: 230,
        vfxType: "spikes",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#374151",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#60A5FA",
        glowColor: glow || "#38BDF8",
        objectArchetype: "generic_item",
        bodyShape: "mech",
        scale: 1.35,
        geometryHints: ["dorsal_backrest", "strut_supports"],
        primaryShape: "tubular frame",
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "sparks",
        metallicFactor: 0.85,
        roughnessFactor: 0.25,
      },
    };
    return ensureStructuredObjectDna(rawChair, clientAnalyzed, hint);
  }

  // 13. Bicycle / Bike / Scooter / Wheels
  if (h.includes("bicycle") || h.includes("bike") || h.includes("cycle") || h.includes("scooter")) {
    const rawBike = {
      name: "Velocity-Apex Scout",
      originalObject: "Commuter Bicycle",
      faction: "Autobot",
      robotClass: "Scout",
      objectFeature: "Dual shoulder-mounted wheel hubs and lightweight tubular aero-frame",
      element: "electric",
      rarity: "Epic",
      lore: "Transformed from a lightweight road bicycle into an ultra-fast tactical scout. Dual wheel gyros spin to deflect incoming fire while propelling the mech into blistering flanking maneuvers.",
      stats: { hp: 520, attack: 104, defense: 66, speed: 18 },
      materialPhysics: {
        materialName: "Seamless Hydroformed Alloy & Vulcanized Rubber",
        heatResistance: 55,
        electricalConductivity: 75,
        impactDurability: 68,
        elasticity: 70,
        density: "light",
        counterStrengths: ["Aero-Momentum: Highest strafe velocity in the arena", "Kinetic Gyros: Rapid aim recovery"],
        counterWeaknesses: ["Exposed Spars: Vulnerable to heavy kinetic snipers", "Tread Puncture: Vulnerable to razor traps"],
      },
      specialAbility: {
        name: "Twin Radial Wheel Nova",
        description: "Overcharges dual wheel hubs with electric arc energy and hurls them into high-speed ricocheting blades.",
        cooldown: 5,
        damage: 195,
        vfxType: "lightning",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#E11D48",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#1E293B",
        glowColor: glow || "#FACC15",
        objectArchetype: "generic_item",
        bodyShape: "mech",
        scale: 1.05,
        geometryHints: ["wheel_motifs", "tubular_frame"],
        primaryShape: "tubular frame",
        hornsOrCrest: true,
        wings: true,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "sparks",
        metallicFactor: 0.9,
        roughnessFactor: 0.2,
      },
    };
    return ensureStructuredObjectDna(rawBike, clientAnalyzed, hint);
  }

  // 14. Tree / Plant / Branch / Wood / Organic
  if (h.includes("tree") || h.includes("branch") || h.includes("leaf") || h.includes("wood") || h.includes("forest") || h.includes("plant")) {
    const rawTree = {
      name: "Sylvan-Titan Arbiter",
      originalObject: "Living Tree & Branch Canopy",
      faction: "Autobot",
      robotClass: "Dreadnought",
      objectFeature: "Branching solar energon canopy crests and petrified bark armor",
      element: "nature",
      rarity: "Legendary",
      lore: "The ancient spirit of the botanical canopy awakens inside this Cybertronian titan. Its petrified hardwood hull regenerates cellular armor while channeling photosynthetic solar energon into devastating roots.",
      stats: { hp: 960, attack: 135, defense: 125, speed: 9 },
      materialPhysics: {
        materialName: "Petrified Cellulose & Living Lignin Armor",
        heatResistance: 30,
        electricalConductivity: 20,
        impactDurability: 88,
        elasticity: 55,
        density: "heavy",
        counterStrengths: ["Photosynthetic Regen: Restores health over time", "Shock Insulation: Highly resistant to electric arcs"],
        counterWeaknesses: ["Combustible Fiber: Vulnerable to fire damage", "Dry Climate: Slightly reduced attack in arid biomes"],
      },
      specialAbility: {
        name: "Arbor Canopy Overgrowth",
        description: "Roots itself into the arena, unleashing a ring of petrified wooden spikes that impale surrounding enemies.",
        cooldown: 7,
        damage: 245,
        vfxType: "spikes",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#15803D",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#78350F",
        glowColor: glow || "#4ADE80",
        objectArchetype: "plant_organic",
        bodyShape: "mech",
        scale: 1.45,
        geometryHints: ["branching_arbor", "organic_vanes"],
        primaryShape: "branching arbor",
        hornsOrCrest: true,
        wings: false,
        tail: true,
        spikes: true,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "nature",
        metallicFactor: 0.35,
        roughnessFactor: 0.75,
      },
    };
    return ensureStructuredObjectDna(rawTree, clientAnalyzed, hint);
  }

  // 15. Building / Architecture / Tower / Street
  if (h.includes("building") || h.includes("tower") || h.includes("architecture") || h.includes("monolith") || h.includes("house")) {
    const rawBuilding = {
      name: "Metroplex Monolith",
      originalObject: "Architectural High-Rise Structure",
      faction: "Autobot",
      robotClass: "Dreadnought",
      objectFeature: "Monolithic columnar armor, window-grid energy conduits, and foundation stomp plates",
      element: "rock",
      rarity: "Mythic",
      lore: "Towering like an entire metropolis awakened, this Colossal titan embodies raw architectural resilience. Its window-matrix channels cascading energon grids to disintegrate hostile siege weapons.",
      stats: { hp: 1250, attack: 185, defense: 145, speed: 8 },
      materialPhysics: {
        materialName: "Reinforced Ferro-Concrete & Structural Steel",
        heatResistance: 85,
        electricalConductivity: 45,
        impactDurability: 98,
        elasticity: 15,
        density: "superdense",
        counterStrengths: ["Seismic Monolith: Extreme damage reduction against incoming kinetic attacks", "Unshakable Mass: Immune to knockback and gravity vortexes"],
        counterWeaknesses: ["Slow Articulation: Low movement speed and large target hitbox", "Foundational Stress: Extra damage from sonic tremors"],
      },
      specialAbility: {
        name: "Metropolitan Megaton Stomp",
        description: "Triggers a cataclysmic localized earthquake that topples all enemy robots across the arena.",
        cooldown: 8,
        damage: 285,
        vfxType: "nova",
      },
      visualParams: {
        primaryColor: primary !== "#00E5FF" ? primary : "#475569",
        secondaryColor: secondary !== "#7C4DFF" ? secondary : "#94A3B8",
        glowColor: glow || "#0284C7",
        objectArchetype: "generic_item",
        bodyShape: "mech",
        scale: 1.7,
        geometryHints: ["columnar_tower", "window_grid"],
        primaryShape: "columnar",
        hornsOrCrest: true,
        wings: false,
        tail: false,
        spikes: false,
        armorPlates: true,
        floatingOrbs: true,
        auraParticleType: "cyber_cubes",
        metallicFactor: 0.75,
        roughnessFactor: 0.45,
      },
    };
    return ensureStructuredObjectDna(rawBuilding, clientAnalyzed, hint);
  }

  // General dynamic creature matching the analyzed photo's exact colors and physical shape silhouette!
  const assignedShape: 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box' =
    clientAnalyzed?.shapeArchetype ||
    detectServerObjectShapeArchetype(hint, clientAnalyzed?.detectedShapeLabel);

  const detectedObject =
    hint ||
    clientAnalyzed?.suggestedOriginalObject ||
    clientAnalyzed?.detectedShapeLabel ||
    (assignedShape === 'cylinder'
      ? 'Cylindrical Bottle / Canister'
      : assignedShape === 'sheet_slab'
      ? 'Flat Tech Slab / Screen'
      : assignedShape === 'sphere_round'
      ? 'Spherical Orb / Round Sphere'
      : isWarm
      ? 'Warm Structural Container'
      : 'High-Frequency Physical Object');

  const el = isWarm ? (primary.includes("FF") ? "fire" : "rock") : "cyber";
  const isDec = !isWarm;

  const robotName =
    clientAnalyzed?.suggestedRobotName ||
    (isDec
      ? `Megatronix ${detectedObject.split(" ")[0] || "Cyber"}`
      : `Ironhide ${detectedObject.split(" ")[0] || "Titan"}`);

  const baseCreature = {
    name: robotName,
    faction: isDec ? "Decepticon" : "Autobot",
    robotClass: assignedShape === 'sheet_slab' ? 'Scout' : assignedShape === 'cylinder' ? 'Seeker' : 'Warrior',
    originalObject: detectedObject,
    objectFeature: `Synthesized from real-world shape (${assignedShape}) and colors (${primary} & ${secondary})`,
    element: el,
    rarity: "Epic",
    lore: `Directly forged from the visual signature and matter of the player's real-world ${detectedObject}. Its chassis mirrors the physical silhouette and Allspark energon of the photographed item.`,
    stats: { hp: 550, attack: 95, defense: 72, speed: 12 },
    materialPhysics: {
      materialName: "Composite Hybrid Alloy & Polymer",
      heatResistance: 65,
      electricalConductivity: 50,
      impactDurability: 70,
      elasticity: 50,
      density: "medium",
      counterStrengths: ["Adaptive Matter: Balanced defenses across all physical attack types", "Real-World Resonance: Gains +20% damage in its native biome"],
      counterWeaknesses: ["Elemental Polarization: Vulnerable to opposing elemental surges"],
    },
    specialAbility: {
      name: "Dark Singularity Vortex",
      description: "Generates a gravitational singularity vortex that damages and pulls in surrounding enemies.",
      cooldown: 6,
      damage: 195,
      vfxType: "vortex",
      icon: "🌌",
      effectType: "gravity_pull",
    },
    visualParams: {
      primaryColor: primary,
      secondaryColor: secondary,
      glowColor: glow,
      shapeArchetype: assignedShape,
      topColors: clientAnalyzed?.topColors || [primary, secondary],
      objectArchetype: assignedShape === 'cylinder' ? 'bottle_can' : assignedShape === 'sheet_slab' ? 'phone_tech' : 'generic_item',
      bodyShape: "mech",
      scale: 1.1,
      geometryHints: inferGeometryHints(detectedObject),
      primaryShape: inferShapeFromObject(detectedObject),
      hornsOrCrest: true,
      wings: assignedShape === 'cylinder',
      tail: false,
      spikes: true,
      armorPlates: true,
      floatingOrbs: assignedShape === 'sphere_round',
      hasScreen: assignedShape === 'sheet_slab',
      hasCapOrLid: assignedShape === 'cylinder',
      auraParticleType: isWarm ? "fire" : "cyber_cubes",
      metallicFactor: 0.25,
      roughnessFactor: 0.38,
    },
  };

  return ensureStructuredObjectDna(baseCreature, clientAnalyzed, hint, distanceFromStartMeters);
}

// Fallback procedural creatures if API key is not configured or fails
const PRESET_FALLBACK_CREATURES: Record<string, any> = {
  coffee: {
    name: "Caffeo Pyro-Gargoyle",
    originalObject: "Hot Ceramic Coffee Mug",
    objectFeature: "Pressurized scalding steam and high-temp ceramic armor",
    element: "fire",
    rarity: "Epic",
    lore: "Born from an over-caffeinated programmer's ceramic mug, this creature unleashes boiling magma-espresso upon all challengers. Its ceramic plating deflects kinetic strikes while it burns with relentless haste.",
    stats: { hp: 520, attack: 88, defense: 64, speed: 13 },
    materialPhysics: {
      materialName: "Glazed Ceramic & Boiling Liquid",
      heatResistance: 95,
      electricalConductivity: 5,
      impactDurability: 55,
      elasticity: 15,
      density: "heavy",
      counterStrengths: ["Electrical Insulator: -40% damage from Electric shocks", "Thermal Armor: 100% immune to fire burning damage"],
      counterWeaknesses: ["Brittle Glaze: +35% damage from Rock & heavy blunt impacts", "Vulnerable to sudden rapid freezing shocks"],
    },
    specialAbility: {
      name: "Scalding Espresso Nova",
      description: "Unleashes a 360-degree boiling shockwave that melts armor and knocks back enemies.",
      cooldown: 6,
      damage: 160,
      vfxType: "nova",
    },
    visualParams: {
      primaryColor: "#E65100",
      secondaryColor: "#4E342E",
      glowColor: "#FFAB00",
      bodyShape: "behemoth",
      scale: 1.15,
      hornsOrCrest: true,
      wings: false,
      tail: true,
      spikes: true,
      armorPlates: true,
      floatingOrbs: true,
      auraParticleType: "fire",
    },
  },
  plant: {
    name: "Spikewing Cactoid",
    originalObject: "Desk Cactus Plant",
    objectFeature: "Photosynthetic thorns and moisture-shielded succulent shell",
    element: "nature",
    rarity: "Rare",
    lore: "Mutated from a resilient desert plant on a windowsill, Spikewing Cactoid uses sharp crystalline needles to pierce arena rivals from afar.",
    stats: { hp: 580, attack: 72, defense: 78, speed: 11 },
    materialPhysics: {
      materialName: "Succulent Cellulose & Lignin Thorns",
      heatResistance: 80,
      electricalConductivity: 25,
      impactDurability: 60,
      elasticity: 50,
      density: "medium",
      counterStrengths: ["Piercing Retaliation: Reflects 25% of close melee damage back at attacker", "Internal Water Reservoir: Heals +20% faster during rainy weather"],
      counterWeaknesses: ["Desiccating Flames: Takes +35% damage from Fire attacks", "Vulnerable to sub-zero cellular freeze damage"],
    },
    specialAbility: {
      name: "Thornstorm Vortex",
      description: "Launches a whirling cyclone of razor thorns that shreds nearby adversaries.",
      cooldown: 7,
      damage: 140,
      vfxType: "spikes",
    },
    visualParams: {
      primaryColor: "#2E7D32",
      secondaryColor: "#C2185B",
      glowColor: "#00E676",
      bodyShape: "golem",
      scale: 1.1,
      hornsOrCrest: true,
      wings: false,
      tail: false,
      spikes: true,
      armorPlates: true,
      floatingOrbs: false,
      auraParticleType: "leaves",
    },
  },
  sneaker: {
    name: "Voltaic Stride-Wyrm",
    originalObject: "Air-Cushioned Running Sneaker",
    objectFeature: "Kinetic rubber tread and high-voltage static acceleration",
    element: "electric",
    rarity: "Legendary",
    lore: "Every marathon sprint stored kinetic friction inside this runner's shoe until it achieved sentience. It darts across the 3D coliseum at supersonic speeds leaving static lightning trails.",
    stats: { hp: 440, attack: 95, defense: 45, speed: 16 },
    materialPhysics: {
      materialName: "Vulcanized Rubber & Thermoplastic Polyurethane",
      heatResistance: 40,
      electricalConductivity: 0,
      impactDurability: 85,
      elasticity: 95,
      density: "light",
      counterStrengths: ["Dielectric Grounding: 100% immune to Electric stun & lightning shocks", "Kinetic Absorption: Dash distance increased by +35%"],
      counterWeaknesses: ["Puncture Susceptibility: Takes +30% damage from piercing thorns and spikes", "Melting Friction: Takes extra damage in high-temperature heatwaves"],
    },
    specialAbility: {
      name: "Supersonic Arc Flash",
      description: "Teleports forward in a blink of lightning, electrocuting all targets in its path.",
      cooldown: 5,
      damage: 175,
      vfxType: "lightning",
    },
    visualParams: {
      primaryColor: "#FFD600",
      secondaryColor: "#00E5FF",
      glowColor: "#FFFF00",
      bodyShape: "serpent",
      scale: 1.0,
      hornsOrCrest: true,
      wings: true,
      tail: true,
      spikes: false,
      armorPlates: false,
      floatingOrbs: true,
      auraParticleType: "electricity",
    },
  },
  headset: {
    name: "Cyber-Banshee Synth",
    originalObject: "Gaming Audio Headset",
    objectFeature: "Binaural acoustic drivers and neon RGB equalizer fins",
    element: "cyber",
    rarity: "Mythic",
    lore: "Infused with million-decibel frequency resonance, this mechanical phantom paralyzes opponents with hypersonic bass drops that distort reality itself.",
    stats: { hp: 460, attack: 105, defense: 50, speed: 14 },
    materialPhysics: {
      materialName: "Neodymium Magnets, Copper Coils & ABS Polymer",
      heatResistance: 30,
      electricalConductivity: 85,
      impactDurability: 50,
      elasticity: 35,
      density: "light",
      counterStrengths: ["Sonic Disruption: Attacks bypass 35% of enemy defense and armor", "Electromagnetic Resonance: Gaining energy 25% faster"],
      counterWeaknesses: ["Moisture Sensitive: Short-circuits for +40% extra damage in rainy or water environments", "Magnetic Distortion: Vulnerable to high-density Rock/Iron attacks"],
    },
    specialAbility: {
      name: "Subwoofer Resonance Beam",
      description: "Projects a concentrated beam of soundwaves that stuns and obliterates enemy health.",
      cooldown: 8,
      damage: 195,
      vfxType: "beam",
    },
    visualParams: {
      primaryColor: "#00E5FF",
      secondaryColor: "#D500F9",
      glowColor: "#00FF66",
      bodyShape: "mech",
      scale: 1.05,
      hornsOrCrest: true,
      wings: true,
      tail: false,
      spikes: false,
      armorPlates: true,
      floatingOrbs: true,
      auraParticleType: "cyber_cubes",
    },
  },
};

// API: Health check
app.get("/api/health", (req, res) => {
  const currentKey = process.env.GEMINI_API_KEY || "";
  const isValidFormat = currentKey.length >= 10;
  res.json({
    status: "ok",
    hasApiKey: isValidFormat,
    keyFormatValid: isValidFormat,
    timestamp: Date.now(),
  });
});

// API: Update and persist Gemini AI Studio Key
app.post("/api/settings/gemini-key", (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string") {
    return res.status(400).json({ success: false, error: "API key is required." });
  }
  const cleanKey = apiKey.trim();
  if (cleanKey.length < 10) {
    return res.status(400).json({
      success: false,
      error: "API key is too short. Please provide a valid Google Gemini API key.",
    });
  }
  process.env.GEMINI_API_KEY = cleanKey;
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    let content = "";
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, "utf-8");
      if (/GEMINI_API_KEY=.*/.test(content)) {
        content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${cleanKey}`);
      } else {
        content += `\nGEMINI_API_KEY=${cleanKey}\n`;
      }
    } else {
      content = `GEMINI_API_KEY=${cleanKey}\n`;
    }
    fs.writeFileSync(envPath, content, "utf-8");
  } catch (err) {
    console.warn("Could not write to .env file:", err);
  }
  console.log("[Server] Gemini API Key updated to valid AIzaSy key.");
  return res.json({ success: true, message: "Gemini API key updated successfully." });
});

// API: Convert Photo to 3D Battle Creature via Gemini Multimodal AI
app.post("/api/creature/generate", async (req, res) => {
  const {
    imageBase64,
    mimeType = "image/jpeg",
    promptHint = "",
    clientAnalyzed,
    distanceFromStartMeters = 0,
    userApiKey,
  } = req.body;
  const currentDistance = Math.max(0, Number(distanceFromStartMeters) || 0);

  try {
    const ai = getGenAI(userApiKey || (req.headers["x-gemini-key"] as string));

    if (!ai) {
      console.log("No valid GEMINI_API_KEY configured; synthesizing procedural creature from image colors and contours");
      const creature = generateProceduralCreature(promptHint, clientAnalyzed, currentDistance);
      return res.json({
        success: true,
        creature,
        isAIGenerated: false,
        note: "Procedurally generated based on detected real-world object colors, complexity & distance.",
      });
    }

    const parts: any[] = [];
    let cleanBase64 = imageBase64 || "";
    let cleanMime = mimeType || "image/jpeg";

    if (cleanBase64.startsWith("data:")) {
      const commaIndex = cleanBase64.indexOf(",");
      if (commaIndex !== -1) {
        const header = cleanBase64.slice(0, commaIndex);
        const mimeMatch = header.match(/^data:([^;]+);base64/);
        if (mimeMatch) {
          cleanMime = mimeMatch[1];
        }
        cleanBase64 = cleanBase64.slice(commaIndex + 1);
      }
    }

    if (cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: cleanMime,
          data: cleanBase64,
        },
      });
    }

    const colorHint = clientAnalyzed?.primaryHex
      ? `Visual Sensor Detection: Dominant object color is ${clientAnalyzed.primaryHex}, secondary accent is ${clientAnalyzed.secondaryHex}. Set primaryColor and secondaryColor to faithfully reflect these real colors.`
      : "";

    const textPrompt = `CRITICAL HACKATHON MISSION: HIGH-ACCURACY VISUAL OBJECT IDENTIFICATION
Examine this photo captured by the player. Perform deep, authentic object recognition:
1. FOCUS STRICTLY ON THE PRIMARY FOREGROUND PHYSICAL OBJECT:
   - Identify the main physical item being presented to the camera (e.g., coffee mug, water bottle, laptop, desk chair, keyboard, smartphone, sneakers, backpack, banana, power tool, pen, etc.).
   - Reject background noise (walls, carpet, floor tiles, shadows, surrounding ambient room furniture).
   - Read any visible brand names, logos, or printed typography on the item (e.g., 'Apple', 'Dell', 'Logitech', 'Hydro Flask', 'Nike', 'Sharpie') and integrate into 'originalObject' and 'name'.
2. METICULOUS STRUCTURAL COMPLEXITY & COMPONENT ASSESSMENT:
   - Evaluate 'structuralComplexity':
     * 'simple': Solid/monolithic single-material items with no or few moving parts (e.g. pen, key, mug, apple, notebook).
     * 'moderate': Multi-part functional consumer goods (e.g. water bottle with latch, shoe with sole and laces, stapler, backpack).
     * 'complex': Articulated mechanical devices or electronics (e.g. office swivel chair, bicycle, power drill, keyboard, guitar).
     * 'ultra-complex': High-density electro-mechanical systems or vehicles (e.g. laptop, car engine, server rack, robotic unit).
   - Estimate realistic mass ('estimatedMassClass') and physical rigidity.
3. AUTHENTIC COLOR & GEOMETRY INHERITANCE:
   - Extract the exact primary and secondary colors of the physical object.
   - List 3 to 5 signature physical features that make this object immediately recognizable. Provide geometryHints for 3D model generation.
4. MAP PHYSICAL TRAITS TO GAMEPLAY ATTRIBUTES:
   - Real-world size, mass, and structural complexity determine combat tiers and base stats.
   - Distinct material properties yield logical combat advantages and vulnerabilities in 'propertyConsequences'.
${promptHint ? `Player provided note: "${promptHint}".` : ""}
${colorHint}
${clientAnalyzed?.shapeArchetype ? `Contour silhouette analysis detected shape archetype: "${clientAnalyzed.shapeArchetype}" (${clientAnalyzed.detectedShapeLabel}). You MUST set visualParams.shapeArchetype to "${clientAnalyzed.shapeArchetype}".` : ""}
Player current exploration distance from starting position: ${currentDistance} meters.
Output strictly valid JSON matching the schema including the complete objectDna structure.`;

    parts.push({ text: textPrompt });

    // Cascading models: prioritize fast reliable multimodal vision models
    const candidateModels = [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest"
    ];
    let lastError: any = null;
    let creatureData: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: { parts },
          config: {
            systemInstruction: CREATURE_PROMPT,
            responseMimeType: "application/json",
          },
        });

        const textOutput = response.text || "";
        try {
          creatureData = JSON.parse(textOutput);
        } catch {
          const cleaned = textOutput.replace(/```json/g, "").replace(/```/g, "").trim();
          creatureData = JSON.parse(cleaned);
        }

        if (creatureData && creatureData.name) {
          if (!creatureData.visualParams) creatureData.visualParams = {};
          // Enforce shapeArchetype matching the physical object contours
          creatureData.visualParams.shapeArchetype =
            clientAnalyzed?.shapeArchetype ||
            creatureData.visualParams.shapeArchetype ||
            detectServerObjectShapeArchetype(creatureData.originalObject || creatureData.name, creatureData.objectDna?.visualIdentity?.shape);

          // Force primaryColor and secondaryColor to faithfully match detected photo colors!
          if (clientAnalyzed?.primaryHex) {
            creatureData.visualParams.primaryColor = clientAnalyzed.primaryHex;
          }
          if (clientAnalyzed?.secondaryHex) {
            creatureData.visualParams.secondaryColor = clientAnalyzed.secondaryHex;
          }
          if (clientAnalyzed?.topColors) {
            creatureData.visualParams.topColors = clientAnalyzed.topColors;
          }
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed, attempting next candidate:`, err.message);
      }
    }

    if (creatureData) {
      const complexity =
        clientAnalyzed?.complexity ||
        evaluateServerObjectScale(promptHint || creatureData.originalObject || creatureData.name, clientAnalyzed);
      creatureData.objectComplexity = complexity;

      // Enforce physical size & complexity scaling guarantee:
      // The bigger and more complex the scanned object, the stronger and more massive the robot!
      if (complexity.scaleTier === 'colossal') {
        creatureData.stats = creatureData.stats || {};
        creatureData.stats.hp = Math.max(creatureData.stats.hp || 950, 1050);
        creatureData.stats.attack = Math.max(creatureData.stats.attack || 140, 165);
        creatureData.stats.defense = Math.max(creatureData.stats.defense || 110, 125);
        creatureData.stats.speed = Math.min(creatureData.stats.speed || 10, 10);
        if (!creatureData.visualParams) creatureData.visualParams = {};
        creatureData.visualParams.scale = Math.max(creatureData.visualParams.scale || 1.45, 1.62);
        if (creatureData.specialAbility) {
          creatureData.specialAbility.damage = Math.max(creatureData.specialAbility.damage || 220, 265);
        }
      } else if (complexity.scaleTier === 'large') {
        creatureData.stats = creatureData.stats || {};
        creatureData.stats.hp = Math.max(creatureData.stats.hp || 750, 840);
        creatureData.stats.attack = Math.max(creatureData.stats.attack || 115, 130);
        creatureData.stats.defense = Math.max(creatureData.stats.defense || 85, 95);
        if (!creatureData.visualParams) creatureData.visualParams = {};
        creatureData.visualParams.scale = Math.max(creatureData.visualParams.scale || 1.3, 1.38);
        if (creatureData.specialAbility) {
          creatureData.specialAbility.damage = Math.max(creatureData.specialAbility.damage || 185, 215);
        }
      } else if (complexity.scaleTier === 'micro') {
        creatureData.stats = creatureData.stats || {};
        creatureData.stats.speed = Math.max(creatureData.stats.speed || 15, 16);
        if (!creatureData.visualParams) creatureData.visualParams = {};
        creatureData.visualParams.scale = Math.min(creatureData.visualParams.scale || 1.0, 0.94);
      }

      // Enforce structured Object Recognition 2.0 DNA with distance calculation
      creatureData = ensureStructuredObjectDna(creatureData, clientAnalyzed, promptHint, currentDistance);

      return res.json({
        success: true,
        creature: creatureData,
        isAIGenerated: true,
      });
    }

    throw lastError || new Error("All AI models failed to respond");
  } catch (error: any) {
    console.error("Gemini Creature Generation Error:", error);
    // Intelligent procedural synthesis matching the user's specific photo, complexity & distance
    const customFallback = generateProceduralCreature(promptHint, clientAnalyzed, currentDistance);
    return res.json({
      success: true,
      creature: customFallback,
      isAIGenerated: false,
      errorMsg: error.message || "Synthesized procedural creature matching photo visual profile.",
    });
  }
});

// API: Dynamic AI Environmental Game Master - Mutates Arena based on Real-World Sensors
app.post("/api/environment/mutate", async (req, res) => {
  try {
    const { weather = "clear", timeOfDay = "day", temperatureC = 24, locationName = "Local Arena", elevation = "urban" } = req.body;
    const ai = getGenAI();

    if (!ai) {
      // Procedural smart environment if no Gemini API key
      const isNight = timeOfDay === "night";
      const isRain = weather === "rain" || weather === "thunderstorm";
      const isHot = weather === "heatwave" || temperatureC >= 32;
      const isCold = weather === "blizzard" || temperatureC <= 2;

      return res.json({
        success: true,
        environment: {
          id: `env-${Date.now()}`,
          name: `${locationName} (${weather.toUpperCase()})`,
          weather,
          timeOfDay,
          temperatureC,
          locationName,
          elevation,
          aiHazardName: isRain ? "Thunderstorm Deluge" : isHot ? "Solar Overheat Vortex" : isCold ? "Glacial Permafrost" : isNight ? "Nocturnal Shadow Shroud" : "Open Solar Canopy",
          aiHazardDescription: isRain 
            ? "Slick flooded arena reduces ground friction. Electric attacks deal +40% chain damage." 
            : isHot 
            ? "Extreme heat empowers Fire abilities with +35% burn damage and quickens dash cooldowns." 
            : isCold 
            ? "Sub-zero blizzard slows movement by 15% but grants Ice abilities freezing stun." 
            : isNight 
            ? "Darkness cloaks the arena. Void and Cyber critical strike chance amplified by +35%." 
            : "Clear conditions allow optimal energy gathering and balanced combat.",
          elementalBuff: isRain ? "electric" : isHot ? "fire" : isCold ? "ice" : isNight ? "void" : "nature",
          elementalBuffMultiplier: 1.35,
          groundFriction: isRain || isCold ? 0.95 : 0.88,
          fogColor: isRain ? "#0b162c" : isHot ? "#2b1406" : isCold ? "#0f172a" : isNight ? "#050711" : "#070f1e",
          skyColor: isRain ? "#0a101f" : isHot ? "#381604" : isCold ? "#1e293b" : isNight ? "#090d1f" : "#0b1933",
          ambientColor: isRain ? "#60a5fa" : isHot ? "#ffedd5" : isCold ? "#bae6fd" : isNight ? "#818cf8" : "#ffffff",
          particleType: isRain ? "rain" : isHot ? "embers" : isCold ? "snow" : isNight ? "spores" : "none",
        },
        isAIGenerated: false,
      });
    }

    const prompt = `You are the AI Environmental Game Master for a 3D arena hackathon game (Real World x AI x Gaming).
The player's real-world environment has been detected:
- Weather: ${weather}
- Time of Day: ${timeOfDay}
- Temperature: ${temperatureC}°C
- Location / Biome: ${locationName}
- Elevation: ${elevation}

Generate a dynamic Arena Hazard Mutation JSON for this real-world condition:
{
  "name": string (e.g. "Acid Rain Coliseum", "Midnight Obsidian Grid", "Scorched Desert Caldera"),
  "aiHazardName": string (e.g. "Conductive Water Surge", "Shadow Veil", "Thermal Updraft"),
  "aiHazardDescription": string (2 sentences describing how real-world weather actively alters arena hazards, friction, and combat),
  "elementalBuff": string ("fire"|"electric"|"nature"|"ice"|"cyber"|"void"|"rock"),
  "elementalBuffMultiplier": number (between 1.25 and 1.45),
  "elementalNerf": string ("fire"|"electric"|"nature"|"ice"|"cyber"|"void"|"rock"),
  "elementalNerfMultiplier": number (between 0.75 and 0.85),
  "groundFriction": number (between 0.82 and 0.96, where 0.96 is slick ice/water),
  "fogColor": string (hex color),
  "skyColor": string (hex color),
  "ambientColor": string (hex color),
  "particleType": string ("rain"|"embers"|"snow"|"spores"|"lightning"|"none")
}`;

    // Cascading models for high reliability during demand spikes
    const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest"];
    let envData: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        const text = response.text || "{}";
        envData = JSON.parse(text);
        if (envData) break;
      } catch (err: any) {
        console.warn(`Environment Mutator: Model ${model} unavailable (${err?.status || err?.message || 'busy'}), trying next candidate.`);
      }
    }

    if (!envData) {
      // Deterministic environment fallback based on input weather
      envData = {
        titleModifier: weather === 'rain' ? 'Storm-Drenched' : weather === 'snow' ? 'Sub-Zero' : 'Field Arena',
        elementalBuff: weather === 'rain' ? 'electric' : weather === 'clear' ? 'fire' : 'rock',
        elementalBuffMultiplier: 1.15,
        elementalNerf: weather === 'rain' ? 'fire' : 'nature',
        elementalNerfMultiplier: 0.85,
        groundFriction: weather === 'rain' ? 0.94 : 0.88,
        fogColor: weather === 'rain' ? '#1E293B' : '#64748B',
        skyColor: weather === 'clear' ? '#0284C7' : '#334155',
        ambientColor: '#475569',
        particleType: weather === 'rain' ? 'rain' : weather === 'snow' ? 'snow' : 'none',
      };
    }

    return res.json({
      success: true,
      environment: {
        id: `env-ai-${Date.now()}`,
        weather,
        timeOfDay,
        temperatureC,
        locationName,
        elevation,
        ...envData,
      },
      isAIGenerated: true,
    });
  } catch (err: any) {
    console.warn("Environment Mutator Fallback Engaged:", err?.message || err);
    return res.json({
      success: true,
      environment: {
        id: `env-ai-${Date.now()}`,
        weather: req.body?.weather || 'clear',
        timeOfDay: req.body?.timeOfDay || 'day',
        temperatureC: req.body?.temperatureC || 20,
        locationName: req.body?.locationName || 'Tactical Arena',
        elevation: 10,
        titleModifier: 'Tactical Arena',
        elementalBuff: 'cyber',
        elementalBuffMultiplier: 1.15,
        elementalNerf: 'void',
        elementalNerfMultiplier: 0.85,
        groundFriction: 0.88,
        fogColor: '#334155',
        skyColor: '#0284C7',
        ambientColor: '#475569',
        particleType: 'none',
      },
      isAIGenerated: false,
    });
  }
});

// API: In-Chamber Creature Voice / Dialogue with its Real-World Physical Identity
app.post("/api/creature/chat", async (req, res) => {
  try {
    const { creature, message = "Who are you and what are your combat strengths?" } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.json({
        reply: `I was once a simple ${creature.originalObject}, but now I am ${creature.name}! My ${creature.materialPhysics?.materialName || 'morphic form'} gives me strong resistance in the arena. Command me and we shall conquer!`,
        isAIGenerated: false,
      });
    }

    const prompt = `You are ${creature.name}, an awakened 3D combat creature transformed from a real-world ${creature.originalObject} (${creature.objectFeature}).
Element: ${creature.element}.
Material Physics: ${JSON.stringify(creature.materialPhysics || {})}.
Lore: ${creature.lore}.

A player is speaking to you in your holding chamber before battle.
Player message: "${message}"

Reply in character in 1-2 punchy, witty, battle-ready sentences. Mention your real-world object roots and how your material physics (ceramic, rubber, thorns, circuitry, etc.) make you dangerous in combat.`;

    const candidateModels = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-flash-latest"];
    let replyText = "";

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        if (response.text?.trim()) {
          replyText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Creature Chat: Model ${model} busy (${err?.status || err?.message || 'busy'}), trying next candidate.`);
      }
    }

    return res.json({
      reply: replyText || `I am ${creature.name}! Forged from a real-world ${creature.originalObject}, my armor is primed for arena dominance!`,
      isAIGenerated: !!replyText,
    });
  } catch (err: any) {
    return res.json({
      reply: `I am ${req.body.creature?.name || 'an awakened fighter'}, honed from the physical world to battle in 3D!`,
      isAIGenerated: false,
    });
  }
});

// API: Adaptive Gemini Tactical Combat Director
const VALID_TACTICAL_STRATEGIES = [
  'AGGRESSIVE_RUSH',
  'CLOSE_COMBAT',
  'KEEP_DISTANCE',
  'RANGED_PRESSURE',
  'DEFENSIVE',
  'EVADE_AND_COUNTER',
  'CONTROL_ARENA',
  'SPECIAL_ABILITY_FOCUS',
];

app.post("/api/combat/tactical-director", async (req, res) => {
  try {
    const {
      playerProfile,
      enemyProfile,
      arenaState,
      combatObservation,
      currentEnemyStrategy = 'KEEP_DISTANCE',
      recentStrategyHistory = [],
    } = req.body;

    const pattern = combatObservation?.detectedPlayerPattern || 'BALANCED';

    const fallbackResponse = (strategy: string, reason: string, counter: string, range: number, agg: number) => ({
      patternDetected: pattern,
      confidence: 0.88,
      currentStrategy: currentEnemyStrategy,
      newStrategy: strategy,
      reason,
      preferredRange: range,
      aggression: agg,
      attackFrequency: 0.80,
      dodgeFrequency: 0.50,
      dashFrequency: 0.70,
      specialPriority: 0.65,
      movementBias: agg > 0.7 ? 'CLOSE_DISTANCE' : 'MAINTAIN_RANGE',
      targetPriority: agg > 0.7 ? 'PRESSURE_PLAYER' : 'OUTLAST_AND_COUNTER',
      counterToPlayer: counter,
      isAIGenerated: false,
    });

    const ai = getGenAI();
    if (!ai) {
      // Deterministic immediate fallback
      let strat = 'AGGRESSIVE_RUSH';
      let r = 'Closing distance to suppress ranged attacks.';
      let c = 'Rush down and interrupt projectile attacks';
      let range = 3.5;
      let agg = 0.88;

      if (pattern === 'MELEE_HEAVY' || pattern === 'AGGRESSIVE_RUSH') {
        strat = 'EVADE_AND_COUNTER';
        r = 'Player is pressing close range; dodging laterally to punish overextension.';
        c = 'Evade rush attacks + punish recovery';
        range = 9.0;
        agg = 0.50;
      } else if (pattern === 'REPEATED_DASH' || pattern === 'HIGH_DODGE') {
        strat = 'RANGED_PRESSURE';
        r = 'Player uses heavy dashes; applying continuous ranged pressure.';
        c = 'Catch dash cooldowns with ranged barrage';
        range = 11.5;
        agg = 0.65;
      }

      return res.json(fallbackResponse(strat, r, c, range, agg));
    }

    const systemPrompt = `You are the High-Level AI Tactical Combat Director for Animatrix 3D arena battles.
Your job is to periodically analyze observed player combat behavior and select a counter-strategy for the AI opponent.

MANDATORY CONSTRAINTS:
1. You may ONLY select newStrategy from this predefined list:
   - "AGGRESSIVE_RUSH": Close distance aggressively, relentlessly pressure, interrupt ranged attacks.
   - "CLOSE_COMBAT": Fight inside 3-5m with melee and close-range bursts.
   - "KEEP_DISTANCE": Backpedal and zone at 12-16m perimeter.
   - "RANGED_PRESSURE": Maintain 9-14m and fire sustained projectiles.
   - "DEFENSIVE": Play cautiously, conserve health, attack only during openings.
   - "EVADE_AND_COUNTER": Heavy dashing/dodging, bait attacks and counter-strike.
   - "CONTROL_ARENA": Hold arena center and push player toward hazards.
   - "SPECIAL_ABILITY_FOCUS": Prioritize charging and landing special ability.

2. Do NOT invent new mechanics or abilities. Choose only from the 8 strategies above.
3. Consider:
   - Player's observed pattern (${pattern}) and combat metrics.
   - Player's Combat DNA vs Enemy's Combat DNA (mass, impactForce, traction, mobility).
   - Arena environment (${arenaState?.environment?.name}, ${arenaState?.environment?.weather}).
   - Distance (${arenaState?.distanceToPlayer}m) and Health States (Player ${arenaState?.playerHpPercent}%, Enemy ${arenaState?.enemyHpPercent}%).

Return ONLY valid JSON matching this schema:
{
  "patternDetected": "${pattern}",
  "confidence": number (0.0 to 1.0),
  "currentStrategy": "${currentEnemyStrategy}",
  "newStrategy": string (one of the 8 allowed strategies),
  "reason": string (1-2 sentences explaining why this counter is optimal against the player's observed habit),
  "preferredRange": number (distance in units, between 2.5 and 16.0),
  "aggression": number (0.1 to 1.0),
  "attackFrequency": number (0.1 to 1.0),
  "dodgeFrequency": number (0.1 to 1.0),
  "dashFrequency": number (0.1 to 1.0),
  "specialPriority": number (0.1 to 1.0),
  "movementBias": "CLOSE_DISTANCE" | "MAINTAIN_RANGE" | "FLANK_AND_CIRCLE" | "RETREAT_TO_SAFETY" | "SEEK_CENTER",
  "targetPriority": "PRESSURE_PLAYER" | "INTERRUPT_RANGED" | "OUTLAST_AND_COUNTER" | "ZONE_HAZARDS" | "BURST_ABILITY",
  "counterToPlayer": string (short punchy title for HUD notification, e.g. "RUSH_AND_INTERRUPT" or "Close distance + pressure")
}`;

    const userPrompt = `COMBAT TELEMETRY:
Player: ${playerProfile?.name || 'Player'} (${playerProfile?.robotClass || 'Fighter'}, Element: ${playerProfile?.element})
Player Combat DNA: ${JSON.stringify(playerProfile?.combatDna || {})}
Player Health: ${arenaState?.playerHpPercent}%

Enemy: ${enemyProfile?.name || 'Rival'} (${enemyProfile?.robotClass || 'Fighter'}, Element: ${enemyProfile?.element})
Enemy Combat DNA: ${JSON.stringify(enemyProfile?.combatDna || {})}
Enemy Health: ${arenaState?.enemyHpPercent}%

Arena: ${arenaState?.environment?.name} (${arenaState?.environment?.weather}, Surface: ${arenaState?.environment?.surfaceType})
Current Distance: ${arenaState?.distanceToPlayer}m

Observed Player Pattern: ${pattern}
Telemetry Metrics: ${JSON.stringify(combatObservation || {})}
Current Strategy: ${currentEnemyStrategy}
Recent Strategies: ${JSON.stringify(recentStrategyHistory || [])}

Provide the optimal tactical counter-decision as structured JSON.`;

    // Cascading models: gemini-3.1-flash-lite (fastest sub-second reasoning), gemini-flash-latest, gemini-3.8-flash
    const candidateModels = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let parsed: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
          },
        });

        const rawText = response.text?.trim() || "{}";
        try {
          parsed = JSON.parse(rawText);
        } catch {
          const jsonMatch = rawText.match(/\{[\s\S]*\}/);
          if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
        }

        if (parsed && VALID_TACTICAL_STRATEGIES.includes(parsed.newStrategy)) {
          break;
        }
      } catch (err: any) {
        // Log as warning rather than uncaught error when model spikes in demand (503/429)
        console.warn(`Tactical Director: Candidate model ${model} temporarily unavailable (${err?.status || err?.message || '503/busy'}). Trying next candidate...`);
      }
    }

    if (parsed && VALID_TACTICAL_STRATEGIES.includes(parsed.newStrategy)) {
      return res.json({
        patternDetected: parsed.patternDetected || pattern,
        confidence: typeof parsed.confidence === 'number' ? Math.max(0.5, Math.min(1.0, parsed.confidence)) : 0.90,
        currentStrategy: currentEnemyStrategy,
        newStrategy: parsed.newStrategy,
        reason: parsed.reason || `Countering ${pattern} with ${parsed.newStrategy}.`,
        preferredRange: typeof parsed.preferredRange === 'number' ? Math.max(2.5, Math.min(16.0, parsed.preferredRange)) : 4.0,
        aggression: typeof parsed.aggression === 'number' ? Math.max(0.1, Math.min(1.0, parsed.aggression)) : 0.85,
        attackFrequency: typeof parsed.attackFrequency === 'number' ? Math.max(0.1, Math.min(1.0, parsed.attackFrequency)) : 0.80,
        dodgeFrequency: typeof parsed.dodgeFrequency === 'number' ? Math.max(0.1, Math.min(1.0, parsed.dodgeFrequency)) : 0.50,
        dashFrequency: typeof parsed.dashFrequency === 'number' ? Math.max(0.1, Math.min(1.0, parsed.dashFrequency)) : 0.70,
        specialPriority: typeof parsed.specialPriority === 'number' ? Math.max(0.1, Math.min(1.0, parsed.specialPriority)) : 0.60,
        movementBias: parsed.movementBias || 'CLOSE_DISTANCE',
        targetPriority: parsed.targetPriority || 'PRESSURE_PLAYER',
        counterToPlayer: parsed.counterToPlayer || `${parsed.newStrategy} Counter`,
        isAIGenerated: true,
      });
    }

    // If all models are experiencing high demand or rate limits, engage deterministic tactical heuristics
    console.info("Tactical Director: Engaging deterministic tactical heuristic matrix during API demand surge.");
    let strat = 'AGGRESSIVE_RUSH';
    let r = `Countering ${pattern} with relentless pressure and attack interrupts.`;
    let c = 'RUSH_AND_INTERRUPT';
    let range = 3.5;
    let agg = 0.85;

    if (pattern === 'MELEE_HEAVY' || pattern === 'AGGRESSIVE_RUSH') {
      strat = 'EVADE_AND_COUNTER';
      r = 'Player is pressing close melee; dodging laterally and punishing recovery frames.';
      c = 'EVADE_AND_COUNTER';
      range = 8.5;
      agg = 0.55;
    } else if (pattern === 'REPEATED_DASH' || pattern === 'HIGH_DODGE') {
      strat = 'RANGED_PRESSURE';
      r = 'Player uses heavy dashes; applying continuous ranged pressure to catch cooldowns.';
      c = 'RANGED_BARRAGE';
      range = 11.5;
      agg = 0.70;
    } else if (pattern === 'PASSIVE_DEFENSIVE' || pattern === 'PERIMETER_CAMPING') {
      strat = 'CONTROL_ARENA';
      r = 'Player is camping the perimeter; controlling the center zone and applying pressure.';
      c = 'CONTROL_CENTER';
      range = 6.0;
      agg = 0.75;
    }

    return res.json(fallbackResponse(strat, r, c, range, agg));
  } catch (err: any) {
    console.warn("Tactical Director Heuristic Fallback Engaged:", err?.message || err);
    return res.json({
      patternDetected: req.body?.combatObservation?.detectedPlayerPattern || 'BALANCED',
      confidence: 0.80,
      currentStrategy: req.body?.currentEnemyStrategy || 'KEEP_DISTANCE',
      newStrategy: 'AGGRESSIVE_RUSH',
      reason: 'Adaptive tactical heuristics active.',
      preferredRange: 3.5,
      aggression: 0.85,
      attackFrequency: 0.80,
      dodgeFrequency: 0.50,
      dashFrequency: 0.70,
      specialPriority: 0.60,
      movementBias: 'CLOSE_DISTANCE',
      targetPriority: 'PRESSURE_PLAYER',
      counterToPlayer: 'RUSH_AND_INTERRUPT',
      isAIGenerated: false,
    });
  }
});

// Start server with Vite middleware for local/prod compatibility
async function startServer() {
  const server = http.createServer(app);
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProd = process.env.NODE_ENV?.trim() === "production" || hasDist;

  if (!isProd) {
    try {
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: { server },
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite middleware error, falling back to static dist:", err);
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Matter-Born Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local Network (Wi-Fi): http://172.32.1.134:${PORT}`);
  });
}

startServer();
