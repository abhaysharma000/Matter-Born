# ⚡ Matter-Born REST API Documentation

Comprehensive API reference and integration guide for the **Matter-Born** backend engine. Powers multimodal real-world object recognition, Cybertronian robot transmutation, real-time multiplayer lobbies, pilot presence radar, in-chamber AI dialogue, and sub-second tactical combat decisions.

---

## 📑 Table of Contents

1. [Architecture & Base URLs](#-architecture--base-urls)
2. [Authentication & Headers](#-authentication--headers)
3. [AI & Multimodal Transmutation Endpoints](#-ai--multimodal-transmutation-endpoints)
   - [POST /api/creature/generate](#1-post-apicreaturegenerate)
   - [POST /api/creature/chat](#2-post-apicreaturechat)
   - [POST /api/environment/mutate](#3-post-apienvironmentmutate)
   - [POST /api/combat/tactical-director](#4-post-apicombattactical-director)
4. [Multiplayer & Social System Endpoints](#-multiplayer--social-system-endpoints)
   - [POST /api/multiplayer/presence/heartbeat](#5-post-apimultiplayerpresenceheartbeat)
   - [GET /api/multiplayer/presence/active](#6-get-apimultiplayerpresenceactive)
   - [GET /api/multiplayer/pilot/search](#7-get-apimultiplayerpilotsearch)
   - [POST /api/multiplayer/friend-request/send](#8-post-apimultiplayerfriend-requestsend)
   - [GET /api/multiplayer/inbox/:pilotId](#9-get-apimultiplayerinboxpilotid)
   - [POST /api/multiplayer/friend-request/respond](#10-post-apimultiplayerfriend-requestrespond)
   - [POST /api/multiplayer/battle-invite/send](#11-post-apimultiplayerbattle-invitesend)
   - [POST /api/multiplayer/battle-invite/respond](#12-post-apimultiplayerbattle-inviterespond)
5. [Real-Time Match & Room Synchronization](#-real-time-match--room-synchronization)
   - [POST /api/multiplayer/rooms/create](#13-post-apimultiplayerroomscreate)
   - [POST /api/multiplayer/rooms/join](#14-post-apimultiplayerroomsjoin)
   - [GET /api/multiplayer/rooms/:code](#15-get-apimultiplayerroomscode)
   - [POST /api/multiplayer/rooms/:code/start](#16-post-apimultiplayerroomsstart)
   - [POST /api/multiplayer/rooms/:code/packet](#17-post-apimultiplayerroomspacket)
   - [POST /api/multiplayer/rooms/:code/damage](#18-post-apimultiplayerroomsdamage)
   - [GET /api/multiplayer/rooms/:code/sync](#19-get-apimultiplayerroomssync)
6. [Core & Diagnostics Endpoints](#-core--diagnostics-endpoints)
   - [GET /api/health](#20-get-apihealth)
   - [GET /api/ip-location](#21-get-apiip-location)
7. [AI Model Cascading & Offline Fallbacks](#-ai-model-cascading--offline-fallbacks)
8. [Client & Mobile Connectivity Guide](#-client--mobile-connectivity-guide)

---

## 🌐 Architecture & Base URLs

The server is built with **Node.js, Express, and TypeScript** (`tsx` runtime / `dist/server.cjs` bundle).

| Environment | Base URL | Notes |
| :--- | :--- | :--- |
| **Local Web Browser** | `http://localhost:3000` | Running via `npm run dev` or `tsx server.ts` |
| **Android Connected Device (ADB)** | `http://localhost:3000` | Bridged via `adb reverse tcp:3000 tcp:3000` |
| **Local Area Network (Wi-Fi/LAN)** | `http://<YOUR_LAN_IP>:3000` | e.g. `http://192.168.1.100:3000` |
| **Production Container** | `https://<YOUR_DEPLOYED_DOMAIN>` | Production cloud container |

---

## 🔒 Authentication & Headers

- **Content-Type**: `application/json` (Required for all `POST` endpoints).
- **Payload Limit**: Configured for up to `25MB` to support high-resolution base64 camera photo captures.
- **CORS**: Enabled by default (`*`) with support for preflight `OPTIONS` requests across LAN and mobile WebView environments.
- **Gemini API Key**:
  - Optional on server via `.env`: `GEMINI_API_KEY=AIzaSy...`
  - Optional on client via localStorage: `'USER_GEMINI_KEY'`
  - If no key is provided, the engine **automatically falls back** to the smart local computer vision contour and centroid color analysis engine with 100% functional continuity.

---

## 🧠 AI & Multimodal Transmutation Endpoints

### 1. `POST /api/creature/generate`
Analyzes a camera photograph or image file to detect the real-world physical object, extract its exact color palette, classify its physical 3D silhouette archetype (`cylinder`, `sheet_slab`, `sphere_round`, `cuboid_box`), and transmute it into a battle-ready 3D Cybertronian Transformer robot.

#### Request Body
```json
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...",
  "mimeType": "image/jpeg",
  "promptHint": "Water Bottle",
  "distanceFromStartMeters": 420,
  "clientAnalyzed": {
    "primaryHex": "#1E3A8A",
    "secondaryHex": "#93C5FD",
    "glowHex": "#00E5FF",
    "shapeArchetype": "cylinder",
    "detectedShapeLabel": "Cylindrical Bottle / Canister",
    "topColors": ["#1E3A8A", "#93C5FD", "#0F172A", "#E2E8F0", "#38BDF8"]
  }
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "isAIGenerated": true,
  "creature": {
    "id": "creature-1789273412000",
    "name": "Hydro-Vortex Vanguard",
    "originalObject": "Insulated Stainless Steel Water Bottle",
    "faction": "Autobot",
    "robotClass": "Seeker",
    "element": "cyber",
    "rarity": "Epic",
    "lore": "Infused with Allspark Energon, this vacuum-insulated bottle transformed into a high-pressure hydrodynamic aerial warrior.",
    "stats": {
      "hp": 680,
      "attack": 118,
      "defense": 92,
      "speed": 13
    },
    "materialPhysics": {
      "materialName": "Double-Wall Insulated Steel & High-Density Polymer",
      "heatResistance": 88,
      "electricalConductivity": 30,
      "impactDurability": 84,
      "elasticity": 20,
      "density": "medium",
      "counterStrengths": ["Thermal Guard: 50% resistance to fire attacks"],
      "counterWeaknesses": ["Cryo Fracture: Vulnerable to extreme ice stun"]
    },
    "visualParams": {
      "primaryColor": "#1E3A8A",
      "secondaryColor": "#93C5FD",
      "glowColor": "#00E5FF",
      "shapeArchetype": "cylinder",
      "bodyScale": 1.15,
      "metallicFactor": 0.22,
      "roughnessFactor": 0.36,
      "topColors": ["#1E3A8A", "#93C5FD", "#0F172A", "#E2E8F0", "#38BDF8"]
    }
  }
}
```

#### Example `curl`
```bash
curl -X POST http://localhost:3000/api/creature/generate \
  -H "Content-Type: application/json" \
  -d '{"promptHint":"Desk Mug","distanceFromStartMeters":150}'
```

---

### 2. `POST /api/creature/chat`
Conversational dialogue endpoint allowing players to converse with their created mech in the holding chamber. The robot replies in-character, referencing its real-world roots and material composition.

#### Request Body
```json
{
  "creature": {
    "name": "Hydro-Vortex Vanguard",
    "originalObject": "Stainless Steel Water Bottle",
    "element": "cyber",
    "lore": "Infused with Allspark Energon...",
    "materialPhysics": {
      "materialName": "Insulated Steel"
    }
  },
  "message": "What is your main combat advantage?"
}
```

#### Response (`200 OK`)
```json
{
  "reply": "My double-wall steel hull deflects kinetic rounds with ease! Born from a pressurized vessel, my twin hydro-railguns can pierce any Decepticon armor!",
  "isAIGenerated": true
}
```

---

### 3. `POST /api/environment/mutate`
Dynamic AI Environmental Game Master. Analyzes player GPS, local weather, temperature, and elevation to dynamically mutate arena hazards, ground friction, and elemental damage affinities.

#### Request Body
```json
{
  "weather": "rain",
  "timeOfDay": "night",
  "temperatureC": 18,
  "locationName": "Neo-Tokyo District 3",
  "elevation": "urban"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "isAIGenerated": true,
  "environment": {
    "id": "env-1789273412000",
    "name": "Hydro-Neon Deluge Grid",
    "weather": "rain",
    "timeOfDay": "night",
    "temperatureC": 18,
    "locationName": "Neo-Tokyo District 3",
    "aiHazardName": "Submerged Circuit Surge",
    "aiHazardDescription": "Slick rainwater floods the lower arena tiles. Electric attacks chain to nearby targets with +35% damage.",
    "elementalBuff": "electric",
    "elementalBuffMultiplier": 1.35,
    "groundFriction": 0.94,
    "fogColor": "#0b162c",
    "skyColor": "#0a101f",
    "ambientColor": "#60a5fa",
    "particleType": "rain"
  }
}
```

---

### 4. `POST /api/combat/tactical-director`
Sub-second AI tactical counter-decision engine. Ingests live match telemetry, observed player patterns, and distance to compute intelligent counter-actions (dash frequency, aggression, preferred range, lateral flanks).

#### Request Body
```json
{
  "playerProfile": { "name": "Abhay", "element": "fire", "robotClass": "Warrior" },
  "enemyProfile": { "name": "Megatronix", "element": "cyber", "robotClass": "Dreadnought" },
  "arenaState": { "playerHpPercent": 75, "enemyHpPercent": 60, "distanceToPlayer": 4.2 },
  "combatObservation": {
    "detectedPlayerPattern": "MELEE_HEAVY",
    "playerRecentDashes": 3
  },
  "currentEnemyStrategy": "KEEP_DISTANCE"
}
```

#### Response (`200 OK`)
```json
{
  "patternDetected": "MELEE_HEAVY",
  "confidence": 0.92,
  "currentStrategy": "KEEP_DISTANCE",
  "newStrategy": "EVADE_AND_COUNTER",
  "reason": "Player is aggressively closing range; initiating lateral dodge and punishing recovery frames.",
  "preferredRange": 8.5,
  "aggression": 0.65,
  "attackFrequency": 0.85,
  "dodgeFrequency": 0.60,
  "dashFrequency": 0.75,
  "movementBias": "FLANK_AND_CIRCLE",
  "targetPriority": "INTERRUPT_RANGED",
  "counterToPlayer": "LATERAL_EVADE_PUNISH",
  "isAIGenerated": true
}
```

---

## 👥 Multiplayer & Social System Endpoints

### 5. `POST /api/multiplayer/presence/heartbeat`
Emits pilot telemetry to the global presence radar. Keeps the pilot marked as online and broadcasts GPS location and active battle mech.

#### Request Body
```json
{
  "pilot": {
    "id": "pilot-user-101",
    "callsign": "Vanguard-Prime",
    "status": "online",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "activeRobot": {
      "name": "Hydro-Flask Seeker",
      "powerRating": 950
    }
  }
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "activePilotsCount": 4
}
```

---

### 6. `GET /api/multiplayer/presence/active`
Retrieves all pilots who sent a heartbeat within the last 45 seconds. Automatically excludes stale pilots.

#### Response (`200 OK`)
```json
{
  "success": true,
  "count": 2,
  "pilots": [
    {
      "id": "pilot-user-101",
      "callsign": "Vanguard-Prime",
      "status": "online",
      "lastSeen": 1789273410000,
      "latitude": 28.6139,
      "longitude": 77.2090
    }
  ]
}
```

---

### 7. `GET /api/multiplayer/pilot/search`
Search for pilots across the network by callsign query or exact ID.

#### Query Parameters
- `q`: Search string (e.g. `?q=Vanguard`)

#### Response (`200 OK`)
```json
{
  "success": true,
  "results": [
    {
      "id": "pilot-user-101",
      "callsign": "Vanguard-Prime",
      "status": "online"
    }
  ]
}
```

---

### 8. `POST /api/multiplayer/friend-request/send`
Sends a friend request to a rival pilot.

#### Request Body
```json
{
  "senderPilotId": "pilot-user-101",
  "senderCallsign": "Vanguard-Prime",
  "targetPilotId": "pilot-user-202"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Friend request sent to pilot-user-202"
}
```

---

### 9. `GET /api/multiplayer/inbox/:pilotId`
Fetches pending friend requests and incoming 1v1 PvP battle invitations for a specific pilot.

#### Response (`200 OK`)
```json
{
  "success": true,
  "friendRequests": [
    {
      "id": "req-1789273400",
      "fromPilotId": "pilot-user-101",
      "fromCallsign": "Vanguard-Prime",
      "status": "pending",
      "timestamp": 1789273400000
    }
  ],
  "battleInvites": [
    {
      "id": "inv-1789273415",
      "fromPilotId": "pilot-user-101",
      "fromCallsign": "Vanguard-Prime",
      "roomCode": "MB-8821",
      "status": "pending",
      "timestamp": 1789273415000
    }
  ]
}
```

---

### 10. `POST /api/multiplayer/friend-request/respond`
Accepts or declines a pending friend request.

#### Request Body
```json
{
  "requestId": "req-1789273400",
  "pilotId": "pilot-user-202",
  "action": "accept"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "action": "accept"
}
```

---

### 11. `POST /api/multiplayer/battle-invite/send`
Sends an instant 1v1 duel invite to an online friend, automatically provisioning an ad-hoc room.

#### Request Body
```json
{
  "fromPilotId": "pilot-user-101",
  "fromCallsign": "Vanguard-Prime",
  "targetPilotId": "pilot-user-202",
  "roomCode": "MB-8821"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "invite": {
    "id": "inv-1789273415",
    "roomCode": "MB-8821",
    "status": "pending"
  }
}
```

---

### 12. `POST /api/multiplayer/battle-invite/respond`
Responds to an incoming battle invitation (`accept` or `decline`).

#### Request Body
```json
{
  "inviteId": "inv-1789273415",
  "pilotId": "pilot-user-202",
  "action": "accept"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "action": "accept",
  "roomCode": "MB-8821"
}
```

---

## ⚔️ Real-Time Match & Room Synchronization

### 13. `POST /api/multiplayer/rooms/create`
Creates a dedicated combat room.

#### Request Body
```json
{
  "code": "MB-7749",
  "name": "Cybertron Colosseum",
  "hostId": "pilot-user-101",
  "mode": "ranked",
  "maxPlayers": 4,
  "status": "waiting",
  "botsEnabled": false,
  "players": [
    {
      "id": "pilot-user-101",
      "callsign": "Vanguard-Prime",
      "isHost": true
    }
  ]
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "room": { "code": "MB-7749", "status": "waiting", "players": [...] }
}
```

---

### 14. `POST /api/multiplayer/rooms/join`
Joins an existing room by its 6-character code.

#### Request Body
```json
{
  "code": "MB-7749",
  "member": {
    "id": "pilot-user-202",
    "callsign": "Shadow-Recon",
    "isHost": false
  }
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "room": { "code": "MB-7749", "status": "waiting", "players": [...] }
}
```

---

### 15. `GET /api/multiplayer/rooms/:code`
Fetches room state, connected pilots, and match readiness.

#### Response (`200 OK`)
```json
{
  "success": true,
  "room": {
    "code": "MB-7749",
    "status": "waiting",
    "players": [...]
  }
}
```

---

### 16. `POST /api/multiplayer/rooms/:code/start`
Host trigger to initiate 3-2-1 match countdown and transition room state to `in-match`.

#### Response (`200 OK`)
```json
{
  "success": true,
  "room": {
    "code": "MB-7749",
    "status": "in-match"
  }
}
```

---

### 17. `POST /api/multiplayer/rooms/:code/packet`
Broadcasts high-frequency real-time player telemetry: 3D position `(x, y, z)`, rotation `(pitch, yaw)`, velocity, and active animation states (`walking`, `running`, `slashing`, `firing`, `dashing`).

#### Request Body
```json
{
  "senderId": "pilot-user-101",
  "timestamp": 1789273415120,
  "position": { "x": 1.45, "y": 0.0, "z": -3.20 },
  "rotationY": 1.57,
  "animation": "firing",
  "hpPercent": 88
}
```

#### Response (`200 OK`)
```json
{ "success": true }
```

---

### 18. `POST /api/multiplayer/rooms/:code/damage`
Reports a validated hit event, damage amount, and knockout resolution.

#### Request Body
```json
{
  "attackerId": "pilot-user-101",
  "targetId": "pilot-user-202",
  "damage": 64,
  "attackType": "railgun_burst",
  "isCritical": true
}
```

#### Response (`200 OK`)
```json
{ "success": true }
```

---

### 19. `GET /api/multiplayer/rooms/:code/sync`
High-speed sync endpoint polled by clients (every 50-80ms) to receive all rival packets, damage events, and match updates without echo of their own packets.

#### Query Parameters
- `client`: The calling pilot's ID (e.g. `?client=pilot-user-101`)

#### Response (`200 OK`)
```json
{
  "success": true,
  "packets": [
    {
      "senderId": "pilot-user-202",
      "position": { "x": -2.1, "y": 0.0, "z": 4.5 },
      "rotationY": 3.14,
      "animation": "dashing",
      "hpPercent": 72
    }
  ],
  "damageEvents": []
}
```

---

## 🛠️ Core & Diagnostics Endpoints

### 20. `GET /api/health`
Returns server operational status and current Unix timestamp.

#### Response (`200 OK`)
```json
{
  "status": "ok",
  "timestamp": 1789273415000
}
```

---

### 21. `GET /api/ip-location`
Fallback geolocation endpoint for desktop browsers or hardware without onboard GPS. Uses public geolocation resolution to infer latitude, longitude, city, and region.

#### Response (`200 OK`)
```json
{
  "success": true,
  "latitude": 28.6139,
  "longitude": 77.2090,
  "city": "New Delhi",
  "region": "Delhi",
  "country": "India"
}
```

---

## 🔄 AI Model Cascading & Offline Fallbacks

To ensure 100% uptime during high-concurrency hackathon judging or offline demo scenarios, the server implements an automated cascading fallback pipeline:

```
                  [Captured Object Photo]
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [Server Gemini Endpoint]         [Client Direct Gemini]
    Models in order of priority:     Fallback to free AI Studio Key
    1. gemini-2.5-flash             1. gemini-2.5-flash
    2. gemini-2.0-flash             2. gemini-2.0-flash
    3. gemini-1.5-flash             3. gemini-1.5-flash
    4. gemini-2.5-flash-lite        4. gemini-flash-latest
    5. gemini-flash-latest                    │
            │                                 │ (if offline or 429)
            └───────────────┬─────────────────┘
                            ▼
      [Intelligent Local CV & Procedural Engine]
      - Sobel Edge Gradient & Bounding Contour
      - Center Gaussian-weighted true RGB centroids
      - Aspect ratio & circularity shape classification
      - PBR Metallic/Roughness calibrated 3D synthesis
```

---

## 📱 Client & Mobile Connectivity Guide

### 1. Reverse Port Forwarding for Connected Phones
When testing directly on a physical USB-connected Android phone:
```bash
adb reverse tcp:3000 tcp:3000
```
This routes all requests from `http://localhost:3000` inside the phone's Android WebView directly to the local dev server.

### 2. Direct 1-Click APK Download
To distribute or install the latest compiled APK on any Android phone:
```text
https://github.com/abhaysharma000/Matter-Born/raw/main/Matter-Born.apk
```
This link can be pasted directly into bios, messaging channels, or websites.
