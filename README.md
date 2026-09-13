# 🤖 Matter-Born (Animatrix 3D): Object Creature Arena

> **Real-World x AI x Transformers**: Snap any real-world physical object to transform it into a customized, battle-ready 3D Cybertronian battle mech (Autobot or Decepticon) and battle in dynamic 3D arenas powered by Google Gemini Generative AI and Three.js.

[![API Documentation](https://img.shields.io/badge/API-Documentation-2BE29E?style=for-the-badge&logo=fastapi&logoColor=black)](API_README.md)
[![Direct APK Download](https://img.shields.io/badge/Download-Matter--Born%20APK-00E5FF?style=for-the-badge&logo=android&logoColor=black)](https://github.com/abhaysharma000/Matter-Born/raw/main/Matter-Born.apk)

📖 **Full REST API Documentation**: [Read the complete API Reference (API_README.md)](API_README.md)
📲 **Direct Android APK Download**: [Download Matter-Born.apk](https://github.com/abhaysharma000/Matter-Born/raw/main/Matter-Born.apk)
🇮🇳 **Hinglish Game Guide**: [Simple Game Guide in Hinglish (README_HINGLISH.md)](README_HINGLISH.md)

---

## 🌟 Executive Overview & Core Concept

**Animatrix 3D** bridges the physical world and 3D arena gaming. By capturing or uploading photos of everyday objects—such as a coffee mug, athletic sneaker, laptop, car engine, houseplant, or water bottle—the system analyzes the object's physical mass, structural complexity, dominant color palette, and material properties. 

Using **Google Gemini Multimodal AI** combined with client-side computer vision heuristics, the object is instantly transmuted into a unique **3D Transformer Robot Mech**. The resulting warrior features custom-tuned combat attributes, signature weapon modules, material-driven defensive perks, and articulated 3D geometry rendered in real-time WebGL.

---

## 🚀 Key Technologies & Stack

### 1. Frontend & Client Architecture
- **React 19 & TypeScript 5.8**: Strict type safety, modular component architecture, and responsive state management.
- **Vite 6**: Ultra-fast build tool and development server with integrated SPA middleware.
- **Tailwind CSS v4**: Modern CSS styling utilizing the **Lite Creamy Green** design aesthetic (`#EDF5EE` canvas, `#F4F9F4` containers, `#143823` deep forest typography, and fresh emerald accents).
- **Motion (`motion/react`)**: Smooth modal transitions, camera HUD reveals, and stateful interface animations.
- **Lucide React**: Vector iconography for HUD meters, weapon telemetry, and navigation controls.
- **Canvas Confetti**: Celebration visual effects for tournament victories and mission completions.

### 2. 3D Graphics & Kinematics Engine
- **Three.js (`three` & `@types/three`)**:
  - Custom procedural 3D robot generator (`Creature3DBuilder.ts`) constructing multi-part mechs using chamfered geometries, metallic PBR shaders, Energon core glow emissives, and faction crests.
  - **Articulated Bipedal Kinematics**: Multi-joint hierarchy featuring hips, hydraulic knee joint pivots, and articulated ankle footplates ensuring robots stand and walk firmly on platform floors with realistic weight shifting and zero floor clipping.
  - **Arena Engine (`ThreeArenaEngine.ts`)**: Real-time 3D battle arena featuring dynamic shadows, projectile physics, particle emitters (plasma sparks, smoke, laser trails), combat floating damage indicators, aerial leap evasion, and radar minimap integration.

### 3. Artificial Intelligence & Multimodal Vision
- **Google GenAI SDK (`@google/genai`)**:
  - Server-side integration with cascading fallback models: `gemini-3.1-flash-lite`, `gemini-flash-latest`, and `gemini-3.8-flash`.
  - **Structured JSON Output Schema**: Strict enforcement of Transformer factions (`Autobot` vs `Decepticon`), robot classes (`Leader`, `Scout`, `Seeker`, `Dreadnought`, `Warrior`, `Infiltrator`), combat stats, material resistances, and special ability profiles.
  - **Real-World Environmental Mutation**: Detects real-world weather, time of day, and temperature to dynamically mutate arena hazards, lighting, friction, and elemental damage buffs.
  - **In-Chamber Dialogue**: In-character conversational chat allowing players to converse with their awakened mechs about their real-world origins and material traits.

### 4. Audio & Sound Design
- **Web Audio API (`audio.ts`)**: Custom procedural sound synthesizer generating real-time audio without external audio asset dependencies:
  - High-frequency laser blasts and railgun discharge.
  - Low-pass explosive impacts and critical strike booms.
  - Hydraulic footstep stomps, dash whooshes, and pneumatic mechanical actuation sounds.
  - Local storage audio persistence with master mute controls.

### 5. Backend Server & Build System
- **Node.js & Express 4**: RESTful API service handling high-resolution base64 camera image uploads (`25MB` payload limit) and proxying requests securely to Gemini APIs.
- **`tsx` & `esbuild`**: Direct TypeScript execution in development and high-performance CommonJS bundling (`dist/server.cjs`) for production container deployment.

---

## 📐 Mathematical Scaling: Physical Mass & Complexity Formula

A foundational principle of Animatrix 3D is that **the real-world size, physical mass, and mechanical complexity of the scanned object directly govern its power, scale, and combat role**:

| Scale Tier | Real-World Object Examples | Robot Class | Visual 3D Scale | HP Pool | Attack Power | Combat Archetype |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **S-Tier Colossal** | Cars, trucks, motorcycles, engines, generators, industrial machines | **Dreadnought / Titan** | `1.50x – 1.75x` | `1050 – 1350` | `165 – 210` | Devastating kinetic power, heavy armor mitigation, slower dash |
| **A-Tier Heavy** | Laptops, desktop PCs, monitors, power tools, vacuum cleaners, guitars | **Leader / Heavy Assault** | `1.30x – 1.45x` | `840 – 950` | `125 – 150` | High-tech rail-cannons, quantum targeting, balanced mobility |
| **B-Tier Medium** | Shoes, sneakers, backpacks, jackets, water bottles, houseplants | **Warrior / Seeker** | `1.15x – 1.28x` | `550 – 720` | `90 – 115` | Versatile all-rounder, balanced elemental affinities, tactical speed |
| **D-Tier Micro** | Smartphones, keys, coins, pens, earbuds, watches, pocket tools | **Scout / Infiltrator** | `0.88x – 1.00x` | `400 – 520` | `68 – 90` | Ultra-agile kinetic ninja, rapid attack cooldowns, high dodge speed |

---

## 🔬 Computer Vision & Image Processing Pipeline

When a user snaps a photo with their camera or uploads an image file:
1. **HTML5 Canvas Downsampling**: Converts the image to a standardized resolution for low-latency analysis.
2. **K-Means Color Clustering & Quantization**: Computes dominant primary color, secondary accent color, and high-contrast Energon glow hues.
3. **Edge Density & Complexity Analysis**: Runs a Sobel-inspired edge gradient kernel across the image to evaluate structural component density (e.g. smooth simple bottles vs complex multi-part engine bays).
4. **Color Entropy Calculation**: Assesses multi-material variation across the object surface.
5. **Dual-Layer Fallback Strategy**:
   - If a valid `GEMINI_API_KEY` is present, the image and extracted metrics are submitted to Gemini Vision for complete character generation, lore, and physics analysis.
   - If offline or unkeyed, an intelligent local procedural generator analyzes the extracted visual parameters to synthesize a high-tier Transformer mech matching the photo's exact colors and archetype.

---

## 🎮 Game Architecture & Features

```
animatrix-3d/
├── server.ts                           # Express API + Gemini Multimodal Endpoints + Vite Middleware
├── src/
│   ├── App.tsx                         # Main platform state machine & navigation controller
│   ├── types/                          # TypeScript definitions (creature, platform, combat, arena)
│   ├── game3d/
│   │   ├── ThreeArenaEngine.ts         # 3D combat loop, projectile physics, arena hazards, camera
│   │   └── Creature3DBuilder.ts        # Procedural 3D robot builder, PBR shaders, articulated kinematics
│   ├── components/
│   │   ├── arena3d/                    # 3D HUD, virtual joystick, radar minimap, chat modal, match results
│   │   ├── morph/                      # Camera viewfinder, photo uploader, preset picker, reveal chamber
│   │   └── platform/                   # Lobby stage, game catalog, armory shop, clan wars, quests, profile
│   ├── utils/
│   │   ├── imageAnalysis.ts            # Client-side computer vision & physical mass heuristics
│   │   ├── audio.ts                    # Web Audio API real-time procedural sound generator
│   │   └── constants.ts                # Element affinities, damage tables, and configurations
│   └── data/
│       ├── creaturePresets.ts          # Default Transformer mechs & everyday object presets
│       ├── environmentPresets.ts       # Weather, biome, and lighting presets
│       └── platformData.ts             # Initial user progression, armory inventory, clan rankings
```

### Key Modules:
- **Interactive 3D Lobby Stage (`LobbyPetStage.tsx`)**:
  - Displays the active robot on a pedestal with real-time floor alignment.
  - Interactive **Walking on Platform** vs **Standby Guard** stance toggle showcasing walking locomotion.
  - Interactive attack trigger upon clicking the robot.
- **Object Transformation Chamber (`CreatureMorphModal.tsx`)**:
  - Integrated WebRTC live camera viewfinder with snapshot capture.
  - Drag-and-drop file upload zone.
  - Instant preset picker (Espresso Mug, Nike Sneaker, Water Bottle, Cactus, Gaming Headset, Laptop).
  - 3D holographic turntable preview of the morphed robot.
- **3D Combat Arena (`ThreeArenaEngine.ts` & `Arena3DHUD.tsx`)**:
  - Third-person perspective dynamic tracking camera with portrait/landscape auto-framing.
  - Responsive on-screen virtual joystick and touch action buttons (Primary Fire, Dash/Dodge, Special Ability, Aerial Jump).
  - Full keyboard & mouse support (`WASD` movement, `Space` jump, `Shift` dash, `E` special ability, `Left Click` attack).
  - Real-time radar minimap displaying player, opponents, and projectile pings.

---

## 🛠️ Installation & Local Development

### Prerequisites
- **Node.js** 20+ installed
- **npm** or **bun** package manager
- *(Optional)* A Google Gemini API Key (obtain from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone <repo-url>
cd animatrix-3d

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (refer to `.env.example`):
```env
# Optional: Provide your Gemini API Key to enable live multimodal AI generation
GEMINI_API_KEY=your_gemini_api_key_here
```
> *Note: If no API key is provided, the application seamlessly runs using its intelligent offline procedural synthesis engine.*

### 3. Launch Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

### 4. Build for Production
```bash
# Compiles frontend assets and bundles server.ts with esbuild
npm run build

# Start production server
npm run start
```

### 5. Run Type Checking
```bash
npm run lint
```

---

## 🎨 Visual Identity & Theme Guidelines

The application strictly adheres to the **Lite Creamy Green** aesthetic:
- **Canvas / Background**: `#EDF5EE` (soothing soft mint mist)
- **Cards & Surfaces**: `#F4F9F4` and `#E8F2EA` with crisp `#CFE2D3` borders
- **Typography**: Deep `#143823` forest green headers and `#4D6957` secondary text
- **Accents & Energon Energy**: Emerald `#16A34A` and Teal `#0D9488`
- **Floor Surfaces**: Pure mathematical ground alignment ensuring 3D characters stand squarely on top of the terrain with zero clipping or visual sinking.

---

## 📜 License
This project is built and maintained for Google AI Studio Build. Distributed under the MIT License.
