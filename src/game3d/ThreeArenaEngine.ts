import * as THREE from 'three';
import { 
  BattleCreature, 
  ActiveFighter, 
  AttackProjectile, 
  DamageFloater, 
  ArenaPickup,
  Arena3DMatchStats,
  RealWorldEnvironment,
  CreatureElement,
  CombatDNA,
  DerivedMechanic
} from '../types/creature';
import { Creature3DBuilder, Creature3DModel } from './Creature3DBuilder';
import { RIVAL_OBJECT_CREATURES } from '../data/creaturePresets';
import { detectRealWorldEnvironment } from '../data/environmentPresets';
import { deriveCombatDna } from '../utils/combatDnaDerivation';
import { sound } from '../utils/audio';
import { CombatObserver } from '../engine/CombatObserver';
import { AdaptiveCombatDirector } from '../engine/AdaptiveCombatDirector';
import { 
  TacticalPolicy, 
  TacticalAdaptationEvent, 
  CombatObservationMetrics,
  DetectedPlayerPattern 
} from '../types/tacticalDirector';

export interface ArenaHUDState {
  playerHp: number;
  playerMaxHp: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  playerLevel: number;
  playerKills: number;
  abilityCooldownRemaining: number;
  abilityCooldownTotal: number;
  dashCooldownRemaining: number;
  dashCooldownTotal: number;
  aliveCount: number;
  totalCombatants: number;
  survivalSeconds: number;
  dangerRadius: number;
  maxArenaRadius: number;
  radarFighters: Array<{
    id: string;
    x: number;
    z: number;
    isPlayer: boolean;
    isDead: boolean;
    rotation?: number;
    currentHp?: number;
    maxHp?: number;
    name?: string;
    faction?: string;
  }>;
  radarPickups?: Array<{
    id: string;
    x: number;
    z: number;
    type: string;
  }>;
  playerRotation?: number;
  recentCombatLog: string[];
  // Real-World Hackathon Additions
  currentEnvironment: RealWorldEnvironment;
  kineticCharge: number;
  materialAdvantageNotice?: string;
  lastVoiceCommand?: string;
  // Robot Ability Status Effects
  playerShieldHp?: number;
  playerIsStunned?: boolean;
  playerIsBerserk?: boolean;
  playerIsStealthed?: boolean;
  playerIsSilenced?: boolean;
  playerDefenseBuffActive?: boolean;
  combatDna?: CombatDNA;
  activeDerivedMechanics?: DerivedMechanic[];
  // Adaptive Gemini Combat Director
  tacticalPolicy?: TacticalPolicy;
  recentAdaptationEvent?: TacticalAdaptationEvent | null;
  observationMetrics?: CombatObservationMetrics;
  tacticalAdaptationHistory?: TacticalAdaptationEvent[];
}

export class ThreeArenaEngine {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private animationFrameId: number | null = null;

  // Adaptive Gemini Combat Director
  public combatObserver = new CombatObserver(20);
  public tacticalDirector = new AdaptiveCombatDirector(this.combatObserver);
  public currentTacticalPolicy: TacticalPolicy;
  public recentAdaptationEvent: TacticalAdaptationEvent | null = null;
  public tacticalAdaptationHistory: TacticalAdaptationEvent[] = [];

  // Real-World Environmental System
  public currentEnvironment: RealWorldEnvironment = detectRealWorldEnvironment();
  private ambientLight!: THREE.AmbientLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private weatherParticles: THREE.Points | null = null;
  private weatherVelocities: Float32Array | null = null;
  private lightningFlashCooldown: number = 0;

  // Real-World Sensors: Kinetic Motion & Voice Mechanics
  public kineticCharge: number = 0; // 0 to 100%
  public voiceCommandsIssued: number = 0;
  public kineticSurgesTriggered: number = 0;
  public materialAdvantageHits: number = 0;
  public materialAdvantageNotice: string = '';
  public lastVoiceCommand: string = '';
  private playerVelocity = { x: 0, z: 0 };

  // Arena Geometry
  public readonly arenaRadius = 100;
  public dangerZoneRadius = 100;
  private dangerZoneMesh!: THREE.Mesh;
  private arenaFloorMesh!: THREE.Mesh;

  // Fighters & 3D Models
  public playerFighter!: ActiveFighter;
  public fighters: ActiveFighter[] = [];
  private fighterModels: Map<string, Creature3DModel> = new Map();
  private fighterHpBars: Map<string, THREE.Group> = new Map();

  // Combat Entities
  private projectiles: AttackProjectile[] = [];
  private projectileMeshes: Map<string, THREE.Mesh> = new Map();
  private pickups: ArenaPickup[] = [];
  private pickupMeshes: Map<string, THREE.Mesh> = new Map();
  public damageFloaters: DamageFloater[] = [];

  // Match State
  public isRunning = false;
  public isPaused = false;
  private startTime = 0;
  private matchDuration = 0;
  private combatLogs: string[] = [];

  // Input Vector (from Joystick or Keyboard)
  public inputVector = { x: 0, z: 0 };
  public isAttackPressed = false;
  public isAbilityPressed = false;
  public isDashPressed = false;
  public isJumpPressed = false;

  // Callbacks
  private onHUDUpdateCallback?: (state: ArenaHUDState) => void;
  private onMatchEndCallback?: (stats: Arena3DMatchStats) => void;

  constructor() {
    this.currentTacticalPolicy = this.tacticalDirector.getCurrentPolicy();
    this.tacticalDirector.setOnAdaptation((event) => {
      this.handleTacticalAdaptation(event);
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#e0f2fe'); // Bright daylight sky
    this.scene.fog = new THREE.FogExp2('#e0f2fe', 0.005); // Gentle light atmospheric haze

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
    this.camera.position.set(0, 24, 30);
    this.camera.lookAt(0, 0, 0);

    this.setupLighting();
    this.setupArenaWorld();
  }

  private handleTacticalAdaptation(event: TacticalAdaptationEvent) {
    this.recentAdaptationEvent = event;
    this.tacticalAdaptationHistory.unshift(event);
    if (this.tacticalAdaptationHistory.length > 8) {
      this.tacticalAdaptationHistory.pop();
    }
    this.combatLogs.push(`🧠 AI ADAPTATION: Detected ${event.patternDetected} → Counter: ${event.newStrategy}`);
    
    try {
      sound.playBonus();
    } catch {
      // ignore
    }

    const primaryEnemy = this.fighters.find((f) => !f.isPlayer && !f.isDead);
    if (primaryEnemy) {
      this.damageFloaters.push({
        id: `adapt-fx-${Date.now()}`,
        text: `⚡ AI COUNTER: ${event.newStrategy.replace(/_/g, ' ')}`,
        x: primaryEnemy.x,
        y: primaryEnemy.y + 4.6,
        z: primaryEnemy.z,
        color: '#F59E0B',
        isCrit: true,
        opacity: 1.0,
      });
    }
  }

  private setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.25); // Bright clean ambient illumination
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.6); // High-noon sunlight
    this.sunLight.position.set(35, 60, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -95;
    this.sunLight.shadow.camera.right = 95;
    this.sunLight.shadow.camera.top = 95;
    this.sunLight.shadow.camera.bottom = -95;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7); // Light sky-blue fill light
    this.rimLight.position.set(-25, 20, -25);
    this.scene.add(this.rimLight);
  }

  // Real-World Environmental Synchronization
  public applyEnvironment(env: RealWorldEnvironment) {
    this.currentEnvironment = env;
    if (this.scene) {
      this.scene.background = new THREE.Color(env.skyColor || '#e0f2fe');
      this.scene.fog = new THREE.FogExp2(env.fogColor || '#f0f9ff', 0.007);
    }
    if (this.ambientLight) {
      this.ambientLight.color.set(env.ambientColor || '#ffffff');
      this.ambientLight.intensity = env.timeOfDay === 'night' ? 1.05 : env.timeOfDay === 'sunset' ? 1.2 : 1.35;
    }
    if (this.sunLight) {
      if (env.weather === 'heatwave') {
        this.sunLight.color.set('#fff4cc');
        this.sunLight.intensity = 1.9;
      } else if (env.weather === 'thunderstorm') {
        this.sunLight.color.set('#dbeafe');
        this.sunLight.intensity = 1.4;
      } else if (env.weather === 'blizzard') {
        this.sunLight.color.set('#f0f9ff');
        this.sunLight.intensity = 1.6;
      } else {
        this.sunLight.color.set('#ffffff');
        this.sunLight.intensity = 1.6;
      }
    }
    if (this.arenaFloorMesh) {
      const mat = this.arenaFloorMesh.material as THREE.MeshStandardMaterial;
      if (mat) {
        if (env.weather === 'thunderstorm' || env.weather === 'rain') {
          mat.color.set('#cbd5e1'); // Reflective light silvery-slate wet puddle floor
          mat.roughness = 0.15;
          mat.metalness = 0.6;
        } else if (env.weather === 'heatwave') {
          mat.color.set('#fef3c7'); // Bright sunlit golden dune arena
          mat.roughness = 0.45;
          mat.metalness = 0.15;
        } else if (env.weather === 'blizzard') {
          mat.color.set('#f8fafc'); // Pure glacier snow-white arena
          mat.roughness = 0.2;
          mat.metalness = 0.35;
        } else {
          mat.color.set('#f1f5f9'); // Clean light titanium-ceramic floor
          mat.roughness = 0.35;
          mat.metalness = 0.25;
        }
      }
    }

    this.setupWeatherParticles(env.particleType);
    this.combatLogs.push(`🌐 Real-World Atmosphere: [${env.name}] active! Hazard: ${env.aiHazardName}`);
  }

  private setupWeatherParticles(type: RealWorldEnvironment['particleType']) {
    if (this.weatherParticles) {
      this.scene.remove(this.weatherParticles);
      this.weatherParticles.geometry.dispose();
      (this.weatherParticles.material as THREE.Material).dispose();
      this.weatherParticles = null;
    }
    if (type === 'none') return;

    const count = type === 'rain' ? 800 : type === 'snow' ? 500 : 350;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.weatherVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.arenaRadius * 2.2;
      positions[i * 3 + 1] = Math.random() * 35;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.arenaRadius * 2.2;

      if (type === 'rain') {
        this.weatherVelocities[i * 3] = -2;
        this.weatherVelocities[i * 3 + 1] = -45 - Math.random() * 20; // fast downpour
        this.weatherVelocities[i * 3 + 2] = 0;
      } else if (type === 'snow') {
        this.weatherVelocities[i * 3] = (Math.random() - 0.5) * 3;
        this.weatherVelocities[i * 3 + 1] = -6 - Math.random() * 4;
        this.weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 3;
      } else if (type === 'embers') {
        this.weatherVelocities[i * 3] = (Math.random() - 0.5) * 4;
        this.weatherVelocities[i * 3 + 1] = 6 + Math.random() * 6; // rise upwards!
        this.weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 4;
      } else { // spores
        this.weatherVelocities[i * 3] = Math.sin(i) * 1.5;
        this.weatherVelocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
        this.weatherVelocities[i * 3 + 2] = Math.cos(i) * 1.5;
      }
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const color = type === 'rain' ? '#60a5fa' : type === 'embers' ? '#ff6600' : type === 'snow' ? '#ffffff' : '#c084fc';
    const size = type === 'rain' ? 0.35 : type === 'embers' ? 0.65 : type === 'snow' ? 0.5 : 0.7;

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size,
      transparent: true,
      opacity: type === 'rain' ? 0.75 : 0.85,
      blending: THREE.AdditiveBlending,
    });

    this.weatherParticles = new THREE.Points(geometry, material);
    this.scene.add(this.weatherParticles);
  }

  // Real-World Sensor Motion: Add Kinetic Energy from Device Shake/Tilt
  public addKineticEnergy(amount: number) {
    if (this.playerFighter && !this.playerFighter.isDead) {
      const prev = this.kineticCharge;
      this.kineticCharge = Math.min(100, this.kineticCharge + amount);
      if (prev < 100 && this.kineticCharge >= 100) {
        sound.playBonus();
        this.combatLogs.push('⚡ KINETIC OVERLOAD 100%! Next dash or attack unleashes a shockwave surge!');
      }
    }
  }

  // Real-World Voice Interaction: Command Creature Directly
  public issueVoiceCommand(commandText: string) {
    if (!this.playerFighter || this.playerFighter.isDead) return;
    const lower = commandText.toLowerCase();
    this.lastVoiceCommand = commandText;
    this.voiceCommandsIssued++;

    if (lower.includes('ability') || lower.includes('special') || lower.includes('ultimate') || lower.includes('burst') || lower.includes('nova')) {
      if (this.playerFighter.abilityCooldown <= 0) {
        this.executeSpecialAbility(this.playerFighter);
        this.playerFighter.abilityCooldown = this.playerFighter.creature.specialAbility.cooldown;
        this.combatLogs.push(`🎙️ Voice Command Executed: [${commandText}] -> Ability Fired!`);
      } else {
        this.combatLogs.push(`🎙️ Voice Command: Ability cooling down (${Math.ceil(this.playerFighter.abilityCooldown)}s)`);
      }
    } else if (lower.includes('dash') || lower.includes('dodge') || lower.includes('run') || lower.includes('evade') || lower.includes('jump')) {
      if (this.playerFighter.dashCooldown <= 0) {
        this.executeDash(this.playerFighter);
        this.playerFighter.dashCooldown = 3.5;
        this.combatLogs.push(`🎙️ Voice Command Executed: [${commandText}] -> Dash Evaded!`);
      }
    } else if (lower.includes('attack') || lower.includes('strike') || lower.includes('fire') || lower.includes('shoot') || lower.includes('hit')) {
      this.executeAttack(this.playerFighter);
      this.combatLogs.push(`🎙️ Voice Command Executed: [${commandText}] -> Creature Attacking!`);
    } else {
      this.combatLogs.push(`🎙️ Voice Detected: "${commandText}" (Creature acknowledged)`);
    }
  }

  private setupArenaWorld() {
    // 1. Futuristic Grand Platform (Radius 100 - Nearly 3x area for epic mobile 3D combat)
    const floorGeo = new THREE.CylinderGeometry(this.arenaRadius, this.arenaRadius + 4, 6, 64);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc, // High-durability titanium-ceramic composite (Slate 50)
      roughness: 0.32,
      metalness: 0.22,
    });
    this.arenaFloorMesh = new THREE.Mesh(floorGeo, floorMat);
    this.arenaFloorMesh.position.y = -3;
    this.arenaFloorMesh.receiveShadow = true;
    this.scene.add(this.arenaFloorMesh);

    // Floating Colosseum Under-Chassis Keel (Gives the arena an epic floating citadel silhouette)
    const subKeelGeo = new THREE.CylinderGeometry(this.arenaRadius + 4, this.arenaRadius * 0.42, 18, 48);
    const subKeelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Dark titanium alloy underbelly
      roughness: 0.45,
      metalness: 0.8,
    });
    const subKeel = new THREE.Mesh(subKeelGeo, subKeelMat);
    subKeel.position.y = -15;
    this.scene.add(subKeel);

    // Antigravity Core Repulsor Thruster Ring underneath
    const repulsorGeo = new THREE.TorusGeometry(this.arenaRadius * 0.42, 2.2, 16, 64);
    repulsorGeo.rotateX(Math.PI / 2);
    const repulsorMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85,
    });
    const repulsor = new THREE.Mesh(repulsorGeo, repulsorMat);
    repulsor.position.y = -24;
    this.scene.add(repulsor);

    // High-resolution tactical grid helper across the platform
    const gridHelper = new THREE.GridHelper(this.arenaRadius * 2, 60, 0x0284c7, 0x94a3b8);
    gridHelper.position.y = 0.02;
    this.scene.add(gridHelper);

    // Concentric Tactical Sector Markings:
    // Outer Sector Ring (r = 75)
    const outerRingGeo = new THREE.RingGeometry(74.4, 75.6, 64);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.y = 0.04;
    this.scene.add(outerRing);

    // Mid Skirmish Ring (r = 45)
    const midRingGeo = new THREE.RingGeometry(44.4, 45.6, 64);
    midRingGeo.rotateX(-Math.PI / 2);
    const midRingMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    });
    const midRing = new THREE.Mesh(midRingGeo, midRingMat);
    midRing.position.y = 0.045;
    this.scene.add(midRing);

    // Core Champion Colosseum Ring (r = 16)
    const centerRingGeo = new THREE.RingGeometry(14, 16.5, 48);
    centerRingGeo.rotateX(-Math.PI / 2);
    const centerRingMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const centerRing = new THREE.Mesh(centerRingGeo, centerRingMat);
    centerRing.position.y = 0.05;
    this.scene.add(centerRing);

    // Inner Core Emblem Ring
    const innerRingGeo = new THREE.RingGeometry(4, 5.5, 36);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.position.y = 0.055;
    this.scene.add(innerRing);

    // 2. BEAUTIFUL ARENA BOUNDARY ARCHITECTURE
    // A. Outer Platform Lip & Curb (Dark Carbon Armor Ring with Bevel)
    const curbGeo = new THREE.RingGeometry(this.arenaRadius - 1.2, this.arenaRadius + 4, 96);
    curbGeo.rotateX(-Math.PI / 2);
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate-900 protective curb
      roughness: 0.25,
      metalness: 0.7,
      side: THREE.DoubleSide,
    });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.y = 0.06;
    this.scene.add(curb);

    // B. Continuous Glowing Neon Perimeter Trail (Electric Cyan Edge Strip)
    const neonStripGeo = new THREE.RingGeometry(this.arenaRadius - 2.0, this.arenaRadius - 0.6, 96);
    neonStripGeo.rotateX(-Math.PI / 2);
    const neonStripMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff, // Intense vivid cyan neon
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const neonStrip = new THREE.Mesh(neonStripGeo, neonStripMat);
    neonStrip.position.y = 0.07;
    this.scene.add(neonStrip);

    // C. Glowing Plasma Forcefield Curtain (Translucent Ion Barrier)
    const shieldGeo = new THREE.CylinderGeometry(this.arenaRadius, this.arenaRadius, 18, 64, 1, true);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff, // Cyber Cyan Forcefield
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
    });
    this.dangerZoneMesh = new THREE.Mesh(shieldGeo, shieldMat);
    this.dangerZoneMesh.position.y = 9;
    this.scene.add(this.dangerZoneMesh);

    // D. Hexagonal Warning Energetic Grid on the Barrier
    const shieldGridGeo = new THREE.CylinderGeometry(this.arenaRadius + 0.1, this.arenaRadius + 0.1, 18, 48, 2, true);
    const shieldGridMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
      depthWrite: false,
    });
    const shieldGrid = new THREE.Mesh(shieldGridGeo, shieldGridMat);
    shieldGrid.position.y = 9;
    this.scene.add(shieldGrid);

    // E. Top Containment Ring Halo
    const haloGeo = new THREE.TorusGeometry(this.arenaRadius, 0.45, 12, 96);
    haloGeo.rotateX(Math.PI / 2);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f5ff,
      transparent: true,
      opacity: 0.85,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.position.y = 18;
    this.scene.add(halo);

    // 3. 16 Perimeter Sentinel Emitter Pylons with Laser Power Arcs
    const pylonCount = 16;
    const pylonPositions: THREE.Vector3[] = [];

    for (let i = 0; i < pylonCount; i++) {
      const angle = (i * Math.PI * 2) / pylonCount;
      const x = Math.cos(angle) * (this.arenaRadius - 2.8);
      const z = Math.sin(angle) * (this.arenaRadius - 2.8);
      pylonPositions.push(new THREE.Vector3(x, 14, z));

      // Pylon Base Pedestal
      const baseGeo = new THREE.CylinderGeometry(2.4, 3.2, 2.5, 8);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.7,
        roughness: 0.3,
      });
      const baseMesh = new THREE.Mesh(baseGeo, baseMat);
      baseMesh.position.set(x, 1.25, z);
      baseMesh.castShadow = true;
      this.scene.add(baseMesh);

      // Main Monolith Pillar Body (Tapered sci-fi tower)
      const pillarGeo = new THREE.BoxGeometry(2.0, 11, 2.0);
      const pillarMat = new THREE.MeshStandardMaterial({
        color: 0xf1f5f9, // Crisp clean titanium white
        roughness: 0.2,
        metalness: 0.35,
      });
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(x, 7.5, z);
      pillar.castShadow = true;
      this.scene.add(pillar);

      // Glowing Vertical Energon Core Conduit
      const conduitGeo = new THREE.BoxGeometry(0.4, 9.5, 2.1);
      const conduitMat = new THREE.MeshBasicMaterial({
        color: 0x00f5ff, // Ultra-cyan glowing conduit
      });
      const conduit = new THREE.Mesh(conduitGeo, conduitMat);
      conduit.position.set(x, 7.5, z);
      this.scene.add(conduit);

      // Floating Energon Apex Crystal
      const crystalGeo = new THREE.OctahedronGeometry(1.35, 0);
      const crystalMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(x, 14, z);
      this.scene.add(crystal);

      // Orbiting Energon Halo Ring
      const orbitRingGeo = new THREE.TorusGeometry(2.0, 0.12, 8, 24);
      orbitRingGeo.rotateX(Math.PI / 2);
      const orbitRingMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
      });
      const orbitRing = new THREE.Mesh(orbitRingGeo, orbitRingMat);
      orbitRing.position.set(x, 14, z);
      this.scene.add(orbitRing);
    }

    // High-Energy Plasma Laser Beams connecting adjacent Pylons
    for (let i = 0; i < pylonCount; i++) {
      const p1 = pylonPositions[i];
      const p2 = pylonPositions[(i + 1) % pylonCount];

      const beamCurve = new THREE.LineCurve3(p1, p2);
      const beamGeo = new THREE.TubeGeometry(beamCurve, 1, 0.14, 6, false);
      const beamMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.7,
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      this.scene.add(beamMesh);
    }
  }

  public initRenderer(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(width, height);
    // Optimized pixel ratio capped at 1.5 for ultra-smooth 60fps on high-DPI and mobile displays
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    const aspect = width / height;
    this.camera.aspect = aspect;
    if (aspect < 1.0) {
      this.camera.fov = 62;
    } else {
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();

    window.addEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (!this.container || !this.renderer) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
    this.camera.aspect = aspect;
    if (aspect < 1.0) {
      this.camera.fov = 62;
    } else {
      this.camera.fov = 50;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public setCallbacks(
    onHUDUpdate: (state: ArenaHUDState) => void,
    onMatchEnd: (stats: Arena3DMatchStats) => void
  ) {
    this.onHUDUpdateCallback = onHUDUpdate;
    this.onMatchEndCallback = onMatchEnd;
  }

  // Force an immediate tactical re-evaluation / simulated demo adaptation
  public forceTacticalAdaptation(forcedPattern?: DetectedPlayerPattern) {
    if (!this.playerFighter || this.playerFighter.isDead) return;
    const primaryEnemy = this.fighters.find((f) => !f.isPlayer && !f.isDead) || null;
    this.tacticalDirector.forceAdaptation(
      this.playerFighter,
      primaryEnemy,
      this.currentEnvironment,
      forcedPattern
    );
    this.currentTacticalPolicy = this.tacticalDirector.getCurrentPolicy();
  }

  // Start a new 3D Battle Arena Match
  public startMatch(playerCreature: BattleCreature, opponentCount = 6) {
    this.cleanupCombatEntities();

    this.startTime = performance.now();
    this.matchDuration = 0;
    this.dangerZoneRadius = this.arenaRadius;
    this.combatLogs = [`Match commenced! You spawned as ${playerCreature.name}.`];

    // Reset Adaptive Gemini Tactical Director
    this.combatObserver.reset();
    this.tacticalDirector.reset('KEEP_DISTANCE');
    this.currentTacticalPolicy = this.tacticalDirector.getCurrentPolicy();
    this.recentAdaptationEvent = null;
    this.tacticalAdaptationHistory = [];

    // 1. Initialize Player Fighter (Boosted HP pool for sustained battle endurance)
    const playerBaseHp = Math.round(playerCreature.stats.hp * 1.5);
    const playerCombatDna = playerCreature.combatDna || deriveCombatDna(playerCreature);
    playerCreature.combatDna = playerCombatDna;

    this.playerFighter = {
      id: 'player',
      creature: playerCreature,
      combatDna: playerCombatDna,
      isPlayer: true,
      x: 0,
      y: 0,
      z: 20,
      rotation: Math.PI,
      currentHp: playerBaseHp,
      maxHp: playerBaseHp,
      currentEnergy: 100,
      maxEnergy: 100,
      level: 1,
      kills: 0,
      attackCooldown: 0,
      abilityCooldown: 0,
      dashCooldown: 0,
      isDashing: false,
      isAttacking: false,
      isCastingAbility: false,
      isHit: false,
      isDead: false,
      invulnerabilityTimer: 0,
      timeSinceLastDamage: 0,
    };

    this.fighters = [this.playerFighter];
    this.buildFighter3DModel(this.playerFighter);

    // 2. Spawn AI Opponents across the wide platform
    const availableRivals = [...RIVAL_OBJECT_CREATURES];
    for (let i = 0; i < opponentCount; i++) {
      const template = availableRivals[i % availableRivals.length];
      const rivalCombatDna = template.combatDna || deriveCombatDna(template);
      const rivalCreature: BattleCreature = {
        ...template,
        id: `opponent-${i}-${Date.now()}`,
        name: `${template.name} ${['Alpha', 'Prime', 'Mk.II', 'Viper', 'Omega'][i % 5]}`,
        combatDna: rivalCombatDna,
      };

      const angle = (i * Math.PI * 2) / opponentCount + (Math.random() - 0.5) * 0.4;
      const dist = 32 + Math.random() * 45;
      const opponentFighter: ActiveFighter = {
        id: `fighter-ai-${i}`,
        creature: rivalCreature,
        combatDna: rivalCombatDna,
        isPlayer: false,
        x: Math.cos(angle) * dist,
        y: 0,
        z: Math.sin(angle) * dist,
        rotation: angle + Math.PI,
        currentHp: rivalCreature.stats.hp,
        maxHp: rivalCreature.stats.hp,
        currentEnergy: 100,
        maxEnergy: 100,
        level: 1,
        kills: 0,
        attackCooldown: 1.0 + Math.random() * 1.5,
        abilityCooldown: 2.5 + Math.random() * 4,
        dashCooldown: 0,
        isDashing: false,
        isAttacking: false,
        isCastingAbility: false,
        isHit: false,
        isDead: false,
        invulnerabilityTimer: 0,
        timeSinceLastDamage: 0,
      };

      this.fighters.push(opponentFighter);
      this.buildFighter3DModel(opponentFighter);
    }

    // 3. Spawn Pickups (Health orbs & Power crystals across the arena)
    this.spawnArenaPickups(14);

    this.isRunning = true;
    this.isPaused = false;
    sound.playGameStart();

    // Start render loop
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.tick();
  }

  private buildFighter3DModel(fighter: ActiveFighter) {
    const model = Creature3DBuilder.buildCreature(fighter.creature);
    model.root.position.set(fighter.x, fighter.y, fighter.z);
    model.root.rotation.y = fighter.rotation;
    this.scene.add(model.root);
    this.fighterModels.set(fighter.id, model);

    // Floating Overhead 3D Health Bar
    const hpGroup = new THREE.Group();
    const bgBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.DoubleSide })
    );
    const fillBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 0.22),
      new THREE.MeshBasicMaterial({
        color: fighter.isPlayer ? 0x00e676 : 0xff1744,
        side: THREE.DoubleSide,
      })
    );
    fillBar.position.z = 0.01;
    hpGroup.add(bgBar);
    hpGroup.add(fillBar);
    const fighterScale = fighter.creature.visualParams?.scale || 1.1;
    hpGroup.position.set(fighter.x, fighter.y + 4.5 * fighterScale, fighter.z);
    this.scene.add(hpGroup);
    this.fighterHpBars.set(fighter.id, hpGroup);
  }

  private spawnArenaPickups(count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * (this.arenaRadius - 18);
      const isHealth = Math.random() > 0.45;

      const pickup: ArenaPickup = {
        id: `pickup-${i}-${Date.now()}`,
        type: isHealth ? 'health' : 'power_crystal',
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        value: isHealth ? 180 : 60,
        color: isHealth ? '#00E676' : '#FFD600',
      };

      const geo = isHealth ? new THREE.SphereGeometry(0.5, 8, 8) : new THREE.OctahedronGeometry(0.6, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(pickup.color),
        wireframe: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pickup.x, 0.8, pickup.z);
      this.scene.add(mesh);

      this.pickups.push(pickup);
      this.projectileMeshes.set(pickup.id, mesh);
    }
  }

  // Primary Loop Tick
  private tick = () => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const dt = 0.016; // 60fps fixed step
      this.updateSimulation(dt);
    }

    if (this.renderer && this.container) {
      this.renderer.render(this.scene, this.camera);
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  // Main Physics & Combat Simulation
  private updateSimulation(dt: number) {
    const time = performance.now() * 0.001;
    this.matchDuration += dt;

    // 0. Update Real-World Weather Particles & Storm Lightning
    if (this.weatherParticles && this.weatherVelocities) {
      const positions = (this.weatherParticles.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        positions[i * 3] += this.weatherVelocities[i * 3] * dt;
        positions[i * 3 + 1] += this.weatherVelocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += this.weatherVelocities[i * 3 + 2] * dt;

        if (positions[i * 3 + 1] < 0.2) {
          positions[i * 3 + 1] = 28 + Math.random() * 5;
          positions[i * 3] = (Math.random() - 0.5) * this.arenaRadius * 2;
          positions[i * 3 + 2] = (Math.random() - 0.5) * this.arenaRadius * 2;
        } else if (positions[i * 3 + 1] > 32) {
          positions[i * 3 + 1] = 0.5;
        }
      }
      this.weatherParticles.geometry.attributes.position.needsUpdate = true;
    }

    if (this.currentEnvironment.weather === 'thunderstorm') {
      this.lightningFlashCooldown -= dt;
      if (this.lightningFlashCooldown <= 0) {
        if (Math.random() < 0.05) {
          this.sunLight.intensity = 3.2;
          setTimeout(() => {
            if (this.sunLight) this.sunLight.intensity = 0.6;
          }, 70);
          this.lightningFlashCooldown = 2.0 + Math.random() * 3.5;
        }
      }
    }

    // 1. Containment Barrier Energy Resonator (Subtle breathing energy pulse)
    if (this.dangerZoneMesh) {
      const shieldMat = this.dangerZoneMesh.material as THREE.MeshBasicMaterial;
      if (shieldMat) {
        shieldMat.opacity = 0.16 + Math.sin(time * 2.0) * 0.03;
      }
    }

    // 2. Update Player Movement & Actions with Controlled Mech Pacing
    if (!this.playerFighter.isDead) {
      // Check if player is stunned
      if (this.playerFighter.stunDuration && this.playerFighter.stunDuration > 0) {
        this.playerVelocity.x = 0;
        this.playerVelocity.z = 0;
      } else {
        // Balanced mech movement speed modulated by real-world Combat DNA
        const isBerserk = !!(this.playerFighter.berserkDuration && this.playerFighter.berserkDuration > 0);
        const dna = this.playerFighter.combatDna || this.playerFighter.creature.combatDna;

        // Mobility scalar: low for colossal metal titan (0.80x), high for lightweight running shoe (1.20x)
        const mobilityMod = 0.80 + (dna?.mobility ?? 0.5) * 0.40;
        const baseSpeed = this.playerFighter.creature.stats.speed * 0.65 * (isBerserk ? 1.45 : 1.0) * mobilityMod;
        const speed = baseSpeed * (this.playerFighter.isDashing ? 1.65 : 1.0);
        const targetMoveX = this.inputVector.x * speed;
        const targetMoveZ = this.inputVector.z * speed;

        // Traction & ground grip: rubber/sneakers have high traction (0.85-0.95) with sharp responsiveness; heavy iron has higher inertia
        const baseTraction = dna?.traction ?? 0.5;
        const isSlick = this.currentEnvironment.groundFriction >= 0.92;
        const effectiveTraction = isSlick ? baseTraction * 1.15 : baseTraction;
        const friction = 0.45 * Math.max(0.35, 1.25 - effectiveTraction * 0.60);

        this.playerVelocity.x = this.playerVelocity.x * friction + targetMoveX * (1 - friction);
        this.playerVelocity.z = this.playerVelocity.z * friction + targetMoveZ * (1 - friction);

        this.playerFighter.x += this.playerVelocity.x * dt;
        this.playerFighter.z += this.playerVelocity.z * dt;

        // Knockback physics decay
        if (this.playerFighter.knockbackVx || this.playerFighter.knockbackVz) {
          this.playerFighter.x += (this.playerFighter.knockbackVx || 0) * dt;
          this.playerFighter.z += (this.playerFighter.knockbackVz || 0) * dt;
          this.playerFighter.knockbackVx = (this.playerFighter.knockbackVx || 0) * Math.max(0, 1 - 10 * dt);
          this.playerFighter.knockbackVz = (this.playerFighter.knockbackVz || 0) * Math.max(0, 1 - 10 * dt);
        }

        // Vertical jump & gravity physics
        if (this.playerFighter.y > 0 || (this.playerFighter.jumpVelocityY && this.playerFighter.jumpVelocityY !== 0)) {
          const gravity = 34;
          this.playerFighter.jumpVelocityY = (this.playerFighter.jumpVelocityY || 0) - gravity * dt;
          this.playerFighter.y = Math.max(0, this.playerFighter.y + this.playerFighter.jumpVelocityY * dt);
          if (this.playerFighter.y <= 0) {
            this.playerFighter.y = 0;
            this.playerFighter.jumpVelocityY = 0;
            this.playerFighter.isJumping = false;
          }
        }

        // Kinetic charge slowly accumulates while running
        if (Math.abs(this.inputVector.x) > 0.1 || Math.abs(this.inputVector.z) > 0.1) {
          this.addKineticEnergy(dt * 4.5);
        }

        // Rotate player to facing direction
        if (Math.abs(this.inputVector.x) > 0.05 || Math.abs(this.inputVector.z) > 0.05) {
          this.playerFighter.rotation = Math.atan2(this.inputVector.x, this.inputVector.z);
        }

        // Smooth Elastic Boundary Containment: securely keeps player inside the beautiful perimeter
        const distFromCenter = Math.sqrt(this.playerFighter.x ** 2 + this.playerFighter.z ** 2);
        const maxBoundaryDist = this.arenaRadius - 2.8;
        if (distFromCenter > maxBoundaryDist) {
          const factor = maxBoundaryDist / distFromCenter;
          this.playerFighter.x *= factor;
          this.playerFighter.z *= factor;
        }

        // Actions: Attack - crisp 0.28s cooldown for rapid fluid combos (0.18s in Berserk)
        if (this.isAttackPressed && this.playerFighter.attackCooldown <= 0) {
          this.executeAttack(this.playerFighter);
          this.playerFighter.attackCooldown = isBerserk ? 0.18 : 0.28;
        }

        // Actions: Special Ability (locked if silenced)
        if (this.isAbilityPressed && this.playerFighter.abilityCooldown <= 0) {
          if (this.playerFighter.silenceDuration && this.playerFighter.silenceDuration > 0) {
            this.damageFloaters.push({
              id: `floater-silenced-${Date.now()}`,
              text: 'SYSTEM SILENCED!',
              x: this.playerFighter.x,
              y: 3.5,
              z: this.playerFighter.z,
              color: '#EF4444',
              isCrit: false,
              opacity: 1.0,
            });
          } else {
            this.executeSpecialAbility(this.playerFighter);
            this.playerFighter.abilityCooldown = this.playerFighter.creature.specialAbility.cooldown;
          }
        }

        // Actions: Evade Dash - modulated by Combat DNA acceleration
        if (this.isDashPressed && this.playerFighter.dashCooldown <= 0) {
          this.executeDash(this.playerFighter);
          const accel = dna?.acceleration ?? 0.5;
          const dashCooldownTime = 1.8 * (1.25 - accel * 0.50);
          this.playerFighter.dashCooldown = dashCooldownTime;
        }

        // Actions: Jump with Space or onJump
        if (this.isJumpPressed && this.playerFighter.y <= 0.05) {
          this.executeJump(this.playerFighter);
        }
      }
    }

    // Adaptive Gemini Tactical Director Observation & Update
    if (!this.playerFighter.isDead) {
      const primaryEnemy = this.fighters.find((f) => !f.isPlayer && !f.isDead) || null;
      this.combatObserver.samplePosition(
        { x: this.playerFighter.x, z: this.playerFighter.z },
        primaryEnemy ? { x: primaryEnemy.x, z: primaryEnemy.z } : null
      );
      if (primaryEnemy) {
        this.tacticalDirector.update(this.playerFighter, primaryEnemy, this.currentEnvironment);
        this.currentTacticalPolicy = this.tacticalDirector.getCurrentPolicy();
      }
    }

    // 3. Update AI Opponents
    this.fighters.forEach((fighter) => {
      if (fighter.isPlayer || fighter.isDead) return;
      this.updateAIBehavior(fighter, dt);
    });

    // 4. Update Cooldowns, Invulnerability & Status Effect Timers
    this.fighters.forEach((f) => {
      if (f.attackCooldown > 0) f.attackCooldown = Math.max(0, f.attackCooldown - dt);
      if (f.abilityCooldown > 0) f.abilityCooldown = Math.max(0, f.abilityCooldown - dt);
      if (f.dashCooldown > 0) f.dashCooldown = Math.max(0, f.dashCooldown - dt);

      // Invulnerability i-frame cooldown
      if (f.invulnerabilityTimer && f.invulnerabilityTimer > 0) {
        f.invulnerabilityTimer = Math.max(0, f.invulnerabilityTimer - dt);
      }

      // Passive Nanotech Auto-Repair for Player: steadily recovers health when not recently damaged
      if (f.isPlayer && !f.isDead) {
        f.timeSinceLastDamage = (f.timeSinceLastDamage || 0) + dt;
        if (f.timeSinceLastDamage > 2.5 && f.currentHp < f.maxHp) {
          const regenRate = f.combatDna?.regenerationRate ?? 0.25;
          const regenMultiplier = 0.70 + regenRate * 1.20;
          f.currentHp = Math.min(f.maxHp, f.currentHp + (f.maxHp * 0.04 * regenMultiplier) * dt);
        }
      }

      // Status Timers
      if (f.shieldDuration && f.shieldDuration > 0) {
        f.shieldDuration -= dt;
        if (f.shieldDuration <= 0) f.shieldHp = 0;
      }
      if (f.stunDuration && f.stunDuration > 0) {
        f.stunDuration -= dt;
        f.isStunned = f.stunDuration > 0;
      }
      if (f.silenceDuration && f.silenceDuration > 0) {
        f.silenceDuration -= dt;
        f.isSilenced = f.silenceDuration > 0;
      }
      if (f.berserkDuration && f.berserkDuration > 0) {
        f.berserkDuration -= dt;
        f.isBerserk = f.berserkDuration > 0;
      }
      if (f.stealthDuration && f.stealthDuration > 0) {
        f.stealthDuration -= dt;
        f.isStealthed = f.stealthDuration > 0;
      }
      if (f.defenseBuffDuration && f.defenseBuffDuration > 0) {
        f.defenseBuffDuration -= dt;
      }
    });

    // 5. Update Projectiles
    this.updateProjectiles(dt);

    // 6. Check Pickup Collisions
    this.checkPickups();

    // 7. Update 3D Visual Models & Overhead HP Bars
    this.fighters.forEach((fighter) => {
      const model = this.fighterModels.get(fighter.id);
      const hpBar = this.fighterHpBars.get(fighter.id);

      if (model) {
        model.root.position.set(fighter.x, fighter.y, fighter.z);
        model.root.rotation.y = fighter.rotation;

        // Visual i-frame shimmer when invulnerable
        if (fighter.invulnerabilityTimer && fighter.invulnerabilityTimer > 0) {
          model.root.visible = Math.floor(time * 24) % 2 === 0;
        } else {
          model.root.visible = true;
        }

        const isMoving = fighter.isPlayer
          ? Math.abs(this.inputVector.x) > 0.05 || Math.abs(this.inputVector.z) > 0.05
          : !fighter.isDead;

        model.updateAnimation(time, isMoving, fighter.isAttacking, fighter.isHit);

        if (fighter.isDead) {
          model.root.rotation.x = Math.PI / 2;
          model.root.position.y = -0.5;
        }
      }

      if (hpBar) {
        const fighterScale = fighter.creature.visualParams?.scale || 1.1;
        hpBar.position.set(fighter.x, fighter.y + 4.5 * fighterScale, fighter.z);
        hpBar.quaternion.copy(this.camera.quaternion);

        const hpRatio = Math.max(0, fighter.currentHp / fighter.maxHp);
        const fillMesh = hpBar.children[1] as THREE.Mesh;
        if (fillMesh) {
          fillMesh.scale.x = hpRatio;
          fillMesh.position.x = -(1 - hpRatio) * 1.15;
        }

        hpBar.visible = !fighter.isDead;
      }
    });

    // 8. Snappy Third-Person Camera Follow (0.14 lerp for tight tracking)
    if (!this.playerFighter.isDead) {
      const isPortrait = this.camera.aspect < 1.0;
      const targetCamX = this.playerFighter.x;
      const targetCamZ = this.playerFighter.z + (isPortrait ? 22 : 18);
      const targetCamY = isPortrait ? 21 : 17;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.14;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.14;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.14;
      this.camera.lookAt(this.playerFighter.x, 2.0, this.playerFighter.z);
    }

    // 9. Floating Damage Text Decay
    this.damageFloaters.forEach((floater) => {
      floater.y += dt * 1.8;
      floater.opacity = Math.max(0, floater.opacity - dt * 1.2);
    });
    this.damageFloaters = this.damageFloaters.filter((f) => f.opacity > 0);

    // 10. Check Victory / Defeat
    this.checkMatchConditions();

    // 11. Emit HUD State with Real-World Environmental Sync
    if (this.onHUDUpdateCallback) {
      const aliveCount = this.fighters.filter((f) => !f.isDead).length;
      this.onHUDUpdateCallback({
        playerHp: Math.round(this.playerFighter.currentHp),
        playerMaxHp: this.playerFighter.maxHp,
        playerEnergy: Math.round(this.playerFighter.currentEnergy),
        playerMaxEnergy: this.playerFighter.maxEnergy,
        playerLevel: this.playerFighter.level,
        playerKills: this.playerFighter.kills,
        abilityCooldownRemaining: Math.ceil(this.playerFighter.abilityCooldown),
        abilityCooldownTotal: this.playerFighter.creature.specialAbility.cooldown,
        dashCooldownRemaining: Math.ceil(this.playerFighter.dashCooldown),
        dashCooldownTotal: 1.8,
        aliveCount,
        totalCombatants: this.fighters.length,
        survivalSeconds: Math.floor(this.matchDuration),
        dangerRadius: Math.round(this.dangerZoneRadius),
        maxArenaRadius: this.arenaRadius,
        radarFighters: this.fighters.map((f) => ({
          id: f.id,
          x: f.x,
          z: f.z,
          isPlayer: f.isPlayer,
          isDead: f.isDead,
          rotation: f.rotation,
          currentHp: Math.round(f.currentHp),
          maxHp: f.maxHp,
          name: f.creature.name,
          faction: f.creature.faction,
        })),
        radarPickups: this.pickups.map((p) => ({
          id: p.id,
          x: p.x,
          z: p.z,
          type: p.type,
        })),
        playerRotation: this.playerFighter.rotation,
        recentCombatLog: this.combatLogs.slice(-3),
        currentEnvironment: this.currentEnvironment,
        kineticCharge: Math.round(this.kineticCharge),
        materialAdvantageNotice: this.materialAdvantageNotice,
        lastVoiceCommand: this.lastVoiceCommand,
        playerShieldHp: this.playerFighter.shieldHp || 0,
        playerIsStunned: !!(this.playerFighter.stunDuration && this.playerFighter.stunDuration > 0),
        playerIsBerserk: !!(this.playerFighter.berserkDuration && this.playerFighter.berserkDuration > 0),
        playerIsStealthed: !!(this.playerFighter.stealthDuration && this.playerFighter.stealthDuration > 0),
        playerIsSilenced: !!(this.playerFighter.silenceDuration && this.playerFighter.silenceDuration > 0),
        playerDefenseBuffActive: !!(this.playerFighter.defenseBuffDuration && this.playerFighter.defenseBuffDuration > 0),
        combatDna: this.playerFighter.combatDna,
        activeDerivedMechanics: this.playerFighter.combatDna?.derivedMechanics,
        // Adaptive Gemini Combat Director
        tacticalPolicy: this.currentTacticalPolicy,
        recentAdaptationEvent: this.recentAdaptationEvent,
        observationMetrics: this.combatObserver.getMetrics(),
        tacticalAdaptationHistory: this.tacticalAdaptationHistory,
      });
    }
  }

  // AI Logic for Opponent Fighters
  private updateAIBehavior(fighter: ActiveFighter, dt: number) {
    // Knockback physics decay for AI fighters
    if (fighter.knockbackVx || fighter.knockbackVz) {
      fighter.x += (fighter.knockbackVx || 0) * dt;
      fighter.z += (fighter.knockbackVz || 0) * dt;
      fighter.knockbackVx = (fighter.knockbackVx || 0) * Math.max(0, 1 - 10 * dt);
      fighter.knockbackVz = (fighter.knockbackVz || 0) * Math.max(0, 1 - 10 * dt);
    }

    // If stunned, AI cannot move or act
    if (fighter.stunDuration && fighter.stunDuration > 0) return;

    // Find closest target (could be player or another AI!), prioritize non-stealthed
    let closestTarget: ActiveFighter | null = null;
    let minDist = 999;

    this.fighters.forEach((other) => {
      if (other.id === fighter.id || other.isDead) return;
      // Stealth check: only target stealthed if within 3.5 units detection radius
      if (other.isStealthed) {
        const d = Math.hypot(other.x - fighter.x, other.z - fighter.z);
        if (d > 3.5) return;
      }
      const d = Math.hypot(other.x - fighter.x, other.z - fighter.z);
      if (d < minDist) {
        minDist = d;
        closestTarget = other;
      }
    });

    if (closestTarget) {
      const target = closestTarget as ActiveFighter;
      const angleToTarget = Math.atan2(target.x - fighter.x, target.z - fighter.z);
      fighter.rotation = angleToTarget;

      const isBerserk = !!(fighter.berserkDuration && fighter.berserkDuration > 0);
      const dna = fighter.combatDna || fighter.creature.combatDna;
      const mobilityMod = 0.80 + (dna?.mobility ?? 0.5) * 0.40;
      let speed = fighter.creature.stats.speed * 0.45 * (isBerserk ? 1.4 : 1.0) * mobilityMod;

      const policy = this.currentTacticalPolicy;
      const isTargetingPlayer = target.isPlayer;

      // When targeting player, apply Tactical Policy parameters
      const preferredRange = (isTargetingPlayer && policy) ? policy.preferredRange : 3.5;
      const cadenceMod = (isTargetingPlayer && policy) ? policy.attackCadenceMultiplier : 1.0;
      const dashChance = (isTargetingPlayer && policy) ? policy.dodgeDashProbability : 0.25;

      if (isTargetingPlayer && policy) {
        if (policy.strategy === 'AGGRESSIVE_RUSH') {
          speed *= 1.25; // 25% speed sprint
        } else if (policy.strategy === 'DEFENSIVE') {
          speed *= 0.90;
        }
      }

      // Movement behavior:
      // A. Critical HP retreat (unless Berserk or AGGRESSIVE_RUSH)
      if (fighter.currentHp < fighter.maxHp * 0.20 && minDist < 10 && !isBerserk && (!policy || policy.strategy !== 'AGGRESSIVE_RUSH')) {
        fighter.x -= Math.sin(angleToTarget) * speed * dt;
        fighter.z -= Math.cos(angleToTarget) * speed * dt;
      } 
      // B. Close distance if beyond preferred range
      else if (minDist > preferredRange + 1.2) {
        fighter.x += Math.sin(angleToTarget) * speed * dt;
        fighter.z += Math.cos(angleToTarget) * speed * dt;

        // AGGRESSIVE_RUSH: rapid dash forward to close gap!
        if (isTargetingPlayer && policy?.strategy === 'AGGRESSIVE_RUSH' && minDist > 6.0 && fighter.dashCooldown <= 0 && Math.random() < dashChance * dt * 2.5) {
          fighter.x += Math.sin(angleToTarget) * 4.2;
          fighter.z += Math.cos(angleToTarget) * 4.2;
          fighter.dashCooldown = 2.4;
          this.damageFloaters.push({
            id: `rush-dash-${Date.now()}`,
            text: '⚡ RUSH DASH',
            x: fighter.x,
            y: 3.6,
            z: fighter.z,
            color: '#F59E0B',
            isCrit: false,
            opacity: 1.0,
          });
        }
      } 
      // C. Backpedal / retreat if inside preferred range (for KEEP_DISTANCE, EVADE_AND_COUNTER, RANGED_PRESSURE)
      else if (minDist < preferredRange - 1.2) {
        fighter.x -= Math.sin(angleToTarget) * speed * dt;
        fighter.z -= Math.cos(angleToTarget) * speed * dt;

        // Evasive tactical jump/dash away when player pushes close
        if (isTargetingPlayer && (policy?.strategy === 'KEEP_DISTANCE' || policy?.strategy === 'EVADE_AND_COUNTER') && minDist < 5.0 && fighter.dashCooldown <= 0 && Math.random() < dashChance * dt * 3.0) {
          const flankAngle = angleToTarget + (Math.random() > 0.5 ? Math.PI * 0.55 : -Math.PI * 0.55);
          fighter.x += Math.sin(flankAngle) * 4.0;
          fighter.z += Math.cos(flankAngle) * 4.0;
          fighter.dashCooldown = 2.4;
          this.damageFloaters.push({
            id: `evade-dash-${Date.now()}`,
            text: '💨 TACTICAL EVADE',
            x: fighter.x,
            y: 3.6,
            z: fighter.z,
            color: '#38BDF8',
            isCrit: false,
            opacity: 1.0,
          });
        }
      } 
      // D. In the preferred range band: strafe / circle
      else {
        const strafeFactor = (isTargetingPlayer && policy) ? policy.strafeTendency : 0.40;
        if (strafeFactor > 0.3) {
          const strafeAngle = angleToTarget + Math.PI * 0.5;
          fighter.x += Math.sin(strafeAngle) * speed * 0.65 * dt;
          fighter.z += Math.cos(strafeAngle) * speed * 0.65 * dt;
        }
      }

      // Attack if in range
      const attackRangeThreshold = (isTargetingPlayer && (policy?.strategy === 'RANGED_PRESSURE' || policy?.strategy === 'KEEP_DISTANCE')) ? 14 : 10;
      if (minDist < attackRangeThreshold && fighter.attackCooldown <= 0) {
        this.executeAttack(fighter);
        fighter.attackCooldown = (1.3 + Math.random() * 0.7) * cadenceMod * (isBerserk ? 0.75 : 1.0);
      }

      // Special Ability when ready (cannot cast if silenced)
      const isSilenced = !!(fighter.silenceDuration && fighter.silenceDuration > 0);
      const specialRange = (isTargetingPlayer && policy?.strategy === 'SPECIAL_ABILITY_FOCUS') ? 14 : 12;
      if (minDist < specialRange && fighter.abilityCooldown <= 0 && !isSilenced) {
        this.executeSpecialAbility(fighter);
        const abilityCdFactor = (isTargetingPlayer && policy?.strategy === 'SPECIAL_ABILITY_FOCUS') ? 0.75 : 1.0;
        fighter.abilityCooldown = (fighter.creature.specialAbility.cooldown + Math.random() * 2.5) * abilityCdFactor;
      }
    }

    // Constrain inside Arena Barrier (Smooth energy repulsion)
    const distFromCenter = Math.hypot(fighter.x, fighter.z);
    if (distFromCenter > this.arenaRadius - 3.5) {
      // Smoothly steer back toward center
      const toCenterAngle = Math.atan2(-fighter.x, -fighter.z);
      fighter.x += Math.sin(toCenterAngle) * 6 * dt;
      fighter.z += Math.cos(toCenterAngle) * 6 * dt;
    }
  }

  // Attack Execution: Primary Projectile or Claw Strike
  public executeAttack(fighter: ActiveFighter) {
    fighter.isAttacking = true;
    setTimeout(() => {
      fighter.isAttacking = false;
    }, 180);

    const speed = 28;
    const vx = Math.sin(fighter.rotation) * speed;
    const vz = Math.cos(fighter.rotation) * speed;

    const baseMult = fighter.isPlayer ? 0.90 : 0.40;
    const proj: AttackProjectile = {
      id: `proj-${Date.now()}-${Math.random()}`,
      ownerId: fighter.id,
      x: fighter.x + Math.sin(fighter.rotation) * 1.5,
      y: fighter.y + 1.8,
      z: fighter.z + Math.cos(fighter.rotation) * 1.5,
      vx,
      vz,
      damage: Math.max(12, Math.round(fighter.creature.stats.attack * baseMult)),
      color: fighter.creature.visualParams.glowColor,
      radius: 0.45,
      element: fighter.creature.element,
      lifetime: 1.2,
    };

    const geo = new THREE.SphereGeometry(proj.radius, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(proj.color) });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(proj.x, proj.y, proj.z);
    this.scene.add(mesh);

    this.projectiles.push(proj);
    this.projectileMeshes.set(proj.id, mesh);

    if (fighter.isPlayer) {
      sound.playClick();
      const primaryEnemy = this.fighters.find((f) => !f.isPlayer && !f.isDead);
      const dist = primaryEnemy ? Math.hypot(fighter.x - primaryEnemy.x, fighter.z - primaryEnemy.z) : 12;
      this.combatObserver.recordPlayerAttack(dist, false);
    }
  }

  // Special Ability Execution
  public executeSpecialAbility(fighter: ActiveFighter) {
    fighter.isCastingAbility = true;
    setTimeout(() => {
      fighter.isCastingAbility = false;
    }, 400);

    const ability = fighter.creature.specialAbility;
    const baseDamage = ability.damage;
    const effectType = ability.effectType || 'damage_burst';
    const abilityColor = fighter.creature.visualParams.glowColor;

    // Trigger ability casting sound and record observer
    if (fighter.isPlayer) {
      sound.playBonus();
      this.combatObserver.recordPlayerSpecialAbility();
    }

    switch (effectType) {
      case 'buff_shield': {
        // Optimus Prime: Matrix Bastion Shield
        // 1. Heal caster
        fighter.currentHp = Math.min(fighter.maxHp, fighter.currentHp + 75);
        // 2. Grant Energy Shield
        fighter.shieldHp = 140;
        fighter.shieldDuration = 6.0;
        this.damageFloaters.push({
          id: `floater-shield-${Date.now()}`,
          text: 'MATRIX BASTION (+140 SHIELD)',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#38BDF8',
          isCrit: true,
          opacity: 1.0,
        });
        this.damageFloaters.push({
          id: `floater-heal-${Date.now()}`,
          text: '+75 HP HEAL',
          x: fighter.x,
          y: 3.5,
          z: fighter.z,
          color: '#4ADE80',
          isCrit: false,
          opacity: 1.0,
        });

        // 3. Expanding golden/cyan matrix geometric blast
        const radius = 9.5;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            this.damageFighter(target, Math.round(baseDamage * 0.9), fighter.creature.name, true, fighter.creature.element);
            // Knockback
            const angle = Math.atan2(target.x - fighter.x, target.z - fighter.z);
            target.x += Math.sin(angle) * 3.5;
            target.z += Math.cos(angle) * 3.5;
          }
        });

        const ringGeo = new THREE.RingGeometry(0.8, 1.8, 32);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMesh = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        ringMesh.position.set(fighter.x, 0.4, fighter.z);
        this.scene.add(ringMesh);

        let scale = 1;
        const expand = setInterval(() => {
          scale += 0.8;
          ringMesh.scale.set(scale, scale, scale);
          if (scale > 9) {
            clearInterval(expand);
            this.scene.remove(ringMesh);
          }
        }, 20);
        break;
      }

      case 'stun_chain': {
        // Bumblebee: Stinger Warp Chain
        // Warp caster forward 5.5 units
        fighter.x += Math.sin(fighter.rotation) * 5.5;
        fighter.z += Math.cos(fighter.rotation) * 5.5;

        // Discharge 4 chained electric orbs in a rapid burst
        for (let i = 0; i < 4; i++) {
          const spread = (i - 1.5) * 0.35;
          const angle = fighter.rotation + spread;
          const speed = 36;

          const proj: AttackProjectile = {
            id: `chain-proj-${Date.now()}-${i}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(angle) * 1.5,
            y: 1.4,
            z: fighter.z + Math.cos(angle) * 1.5,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            damage: Math.round(baseDamage * 0.35),
            color: '#FACC15',
            radius: 0.7,
            element: 'electric',
            lifetime: 1.4,
            vfxType: 'beam',
          };

          const geo = new THREE.SphereGeometry(proj.radius, 8, 8);
          const mat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }

        // Stun nearby enemies in front
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= 7.0) {
            target.stunDuration = 2.0;
            target.isStunned = true;
            this.damageFloaters.push({
              id: `floater-stun-${Date.now()}-${Math.random()}`,
              text: '⚡ STUNNED (2.0s)',
              x: target.x,
              y: 4.2,
              z: target.z,
              color: '#FACC15',
              isCrit: true,
              opacity: 1.0,
            });
          }
        });
        break;
      }

      case 'gravity_pull': {
        // Megatron: Dark Singularity Cannon
        // Launches a gravitational vortex singularity orb that pulls enemies
        const angle = fighter.rotation;
        const speed = 14;

        const proj: AttackProjectile = {
          id: `singularity-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(angle) * 2.2,
          y: 1.6,
          z: fighter.z + Math.cos(angle) * 2.2,
          vx: Math.sin(angle) * speed,
          vz: Math.cos(angle) * speed,
          damage: baseDamage,
          color: '#A855F7',
          radius: 1.4,
          element: 'fire',
          lifetime: 2.6,
          vfxType: 'vortex',
          isSingularity: true,
        };

        const geo = new THREE.SphereGeometry(proj.radius, 16, 16);
        const mat = new THREE.MeshBasicMaterial({ color: 0x9333ea, wireframe: false });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-grav-${Date.now()}`,
          text: '🌌 SINGULARITY FIRED',
          x: fighter.x,
          y: 4.0,
          z: fighter.z,
          color: '#C084FC',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'homing_barrage': {
        // Starscream: Supersonic Airstrike
        // Fires 7 homing micro-missiles
        const enemies = this.fighters.filter((f) => f.id !== fighter.id && !f.isDead);
        const missileCount = 7;

        for (let i = 0; i < missileCount; i++) {
          const spread = (i - 3) * 0.28;
          const angle = fighter.rotation + spread;
          const speed = 28;
          const targetEnemy = enemies[i % Math.max(1, enemies.length)];

          const proj: AttackProjectile = {
            id: `airstrike-${Date.now()}-${i}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(angle) * 1.5,
            y: 2.2,
            z: fighter.z + Math.cos(angle) * 1.5,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            damage: Math.round(baseDamage / 4.5),
            color: '#EF4444',
            radius: 0.6,
            element: 'electric',
            lifetime: 2.2,
            vfxType: 'missiles',
            isHoming: true,
            homingTargetId: targetEnemy ? targetEnemy.id : undefined,
          };

          const geo = new THREE.ConeGeometry(0.3, 0.9, 6);
          geo.rotateX(Math.PI / 2);
          const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        break;
      }

      case 'weapon_disrupt': {
        // Soundwave: Hypersonic Disruptor Wave
        // Emits 3 expanding concentric sonic rings, knocks back enemies and silences them for 4.0s
        const radius = 11.5;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            this.damageFighter(target, baseDamage, fighter.creature.name, true, 'electric');
            // Silence weapons
            target.silenceDuration = 4.0;
            target.isSilenced = true;
            // Knockback
            const angle = Math.atan2(target.x - fighter.x, target.z - fighter.z);
            target.x += Math.sin(angle) * 7.5;
            target.z += Math.cos(angle) * 7.5;

            this.damageFloaters.push({
              id: `floater-silenced-${Date.now()}-${Math.random()}`,
              text: '📡 SYSTEM SILENCED (4.0s)',
              x: target.x,
              y: 4.4,
              z: target.z,
              color: '#38BDF8',
              isCrit: true,
              opacity: 1.0,
            });
          }
        });

        // 3 concentric expanding sonic rings
        for (let ringIdx = 0; ringIdx < 3; ringIdx++) {
          setTimeout(() => {
            const ringGeo = new THREE.RingGeometry(0.5, 1.4, 32);
            ringGeo.rotateX(-Math.PI / 2);
            const ringMesh = new THREE.Mesh(
              ringGeo,
              new THREE.MeshBasicMaterial({ color: 0x0ea5e9, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })
            );
            ringMesh.position.set(fighter.x, 0.4, fighter.z);
            this.scene.add(ringMesh);

            let s = 1;
            const iv = setInterval(() => {
              s += 1.0;
              ringMesh.scale.set(s, s, s);
              if (s > 11) {
                clearInterval(iv);
                this.scene.remove(ringMesh);
              }
            }, 20);
          }, ringIdx * 120);
        }
        break;
      }

      case 'artillery_cluster': {
        // Ironhide: Bastion Mortar Battery
        // 1. Grants caster Reactive Plating (-50% incoming damage)
        fighter.defenseBuffDuration = 6.0;
        fighter.defenseBuffPercent = 50;
        this.damageFloaters.push({
          id: `floater-def-${Date.now()}`,
          text: 'REACTIVE ARMOR (-50% DMG)',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#F59E0B',
          isCrit: true,
          opacity: 1.0,
        });

        // 2. Launch 3 ballistic mortar shells in a cluster
        for (let i = 0; i < 3; i++) {
          const spread = (i - 1) * 0.22;
          const angle = fighter.rotation + spread;
          const speed = 22;

          const proj: AttackProjectile = {
            id: `mortar-${Date.now()}-${i}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(angle) * 1.6,
            y: 1.5,
            z: fighter.z + Math.cos(angle) * 1.6,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            vy: 16,
            damage: Math.round(baseDamage * 0.65),
            color: '#F97316',
            radius: 1.1,
            element: 'fire',
            lifetime: 2.0,
            vfxType: 'missiles',
            isMortar: true,
          };

          const geo = new THREE.SphereGeometry(proj.radius, 8, 8);
          const mat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        break;
      }

      case 'piercing_beam': {
        // Data-Blaster: Tactical Hyper-Railgun
        // Discharges hyper-velocity piercing laser beam that passes through all enemies
        const angle = fighter.rotation;
        const speed = 65;

        const proj: AttackProjectile = {
          id: `railgun-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(angle) * 2.0,
          y: 1.5,
          z: fighter.z + Math.cos(angle) * 2.0,
          vx: Math.sin(angle) * speed,
          vz: Math.cos(angle) * speed,
          damage: baseDamage,
          color: '#06B6D4',
          radius: 1.3,
          element: 'electric',
          lifetime: 0.9,
          vfxType: 'beam',
          isPiercing: true,
        };

        const geo = new THREE.CylinderGeometry(0.6, 0.6, 6, 8);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(proj.x, proj.y, proj.z);
        mesh.rotation.y = angle;
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-rail-${Date.now()}`,
          text: '🎯 RAILGUN DISCHARGE',
          x: fighter.x,
          y: 4.2,
          z: fighter.z,
          color: '#22D3EE',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'berserk_frenzy': {
        // Grimlock: Molten Magma Berserk
        // 1. Enter Berserk Rage
        fighter.berserkDuration = 6.0;
        fighter.isBerserk = true;
        this.damageFloaters.push({
          id: `floater-berserk-${Date.now()}`,
          text: '🔥 DINOBOT BERSERK RAGE!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#EF4444',
          isCrit: true,
          opacity: 1.0,
        });

        // 2. Spew fan of 8 molten fireballs forward
        for (let i = 0; i < 8; i++) {
          const spread = (i - 3.5) * 0.16;
          const angle = fighter.rotation + spread;
          const speed = 25 + Math.random() * 8;

          const proj: AttackProjectile = {
            id: `magma-${Date.now()}-${i}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(angle) * 1.8,
            y: 1.3,
            z: fighter.z + Math.cos(angle) * 1.8,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            damage: Math.round(baseDamage / 3.5),
            color: '#EA580C',
            radius: 0.8,
            element: 'fire',
            lifetime: 1.3,
            vfxType: 'nova',
          };

          const geo = new THREE.SphereGeometry(proj.radius, 6, 6);
          const mat = new THREE.MeshBasicMaterial({ color: 0xea580c });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        break;
      }

      case 'armor_shred': {
        // Shockwave: Cyclops Dark Particle Ray
        // Discharges a heavy beam that shreds target defense
        const angle = fighter.rotation;
        const speed = 40;

        const proj: AttackProjectile = {
          id: `cyclops-ray-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(angle) * 2.0,
          y: 1.5,
          z: fighter.z + Math.cos(angle) * 2.0,
          vx: Math.sin(angle) * speed,
          vz: Math.cos(angle) * speed,
          damage: baseDamage,
          color: '#8B5CF6',
          radius: 1.2,
          element: 'electric',
          lifetime: 1.5,
          vfxType: 'beam',
        };

        const geo = new THREE.SphereGeometry(proj.radius, 10, 10);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8b5cf6 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        // Armor shred target directly in front
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= 9.0) {
            target.creature.stats.defense = Math.max(10, target.creature.stats.defense - 25);
            this.damageFloaters.push({
              id: `floater-shred-${Date.now()}`,
              text: '🛡️ ARMOR SHREDDED (-25 DEF)',
              x: target.x,
              y: 4.2,
              z: target.z,
              color: '#A855F7',
              isCrit: true,
              opacity: 1.0,
            });
          }
        });
        break;
      }

      case 'ram_emp': {
        // Barricade: Interceptor Ram Surge
        // Turbo charges forward 16 units, crushes enemies and EMP stuns them
        const chargeDist = 16;
        const angle = fighter.rotation;
        const startX = fighter.x;
        const startZ = fighter.z;
        fighter.x += Math.sin(angle) * chargeDist;
        fighter.z += Math.cos(angle) * chargeDist;

        // Damage enemies caught in line
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - (startX + fighter.x) / 2, target.z - (startZ + fighter.z) / 2);
          if (d <= 8.5) {
            this.damageFighter(target, baseDamage, fighter.creature.name, true, 'electric');
            target.stunDuration = 1.6;
            target.isStunned = true;
            this.damageFloaters.push({
              id: `floater-ram-${Date.now()}-${Math.random()}`,
              text: '🚨 INTERCEPTOR RAM (+EMP STUN)',
              x: target.x,
              y: 4.4,
              z: target.z,
              color: '#3B82F6',
              isCrit: true,
              opacity: 1.0,
            });
          }
        });
        break;
      }

      case 'vortex_lift': {
        // Windblade: Turbine Storm Cyclone
        // Summons an aero-twister cyclone that travels forward and lifts enemies into the air
        const angle = fighter.rotation;
        const speed = 12;

        const proj: AttackProjectile = {
          id: `cyclone-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(angle) * 2.2,
          y: 1.5,
          z: fighter.z + Math.cos(angle) * 2.2,
          vx: Math.sin(angle) * speed,
          vz: Math.cos(angle) * speed,
          damage: baseDamage,
          color: '#E0E7FF',
          radius: 2.2,
          element: 'electric',
          lifetime: 3.2,
          vfxType: 'vortex',
          isCyclone: true,
        };

        const geo = new THREE.CylinderGeometry(2.2, 0.4, 4.0, 16, 1, true);
        const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-cyclone-${Date.now()}`,
          text: '🌪️ AERO-CYCLONE DEPLOYED',
          x: fighter.x,
          y: 4.2,
          z: fighter.z,
          color: '#7DD3FC',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'siege_crush': {
        // Brawl: Twin Heavy Siege Cannonade
        // Fires twin massive artillery rounds that create crater shockwaves
        for (let i = 0; i < 2; i++) {
          const sideOffset = (i === 0 ? -1 : 1) * 0.7;
          const angle = fighter.rotation;
          const speed = 32;

          const proj: AttackProjectile = {
            id: `siege-${Date.now()}-${i}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(angle) * 1.8 + Math.cos(angle) * sideOffset,
            y: 1.4,
            z: fighter.z + Math.cos(angle) * 1.8 - Math.sin(angle) * sideOffset,
            vx: Math.sin(angle) * speed,
            vz: Math.cos(angle) * speed,
            damage: Math.round(baseDamage * 0.6),
            color: '#84CC16',
            radius: 1.0,
            element: 'rock',
            lifetime: 1.6,
            vfxType: 'missiles',
          };

          const geo = new THREE.SphereGeometry(proj.radius, 10, 10);
          const mat = new THREE.MeshBasicMaterial({ color: 0x84cc16 });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        break;
      }

      case 'stealth_crit': {
        // Mirage: Holographic Decoy Ambush
        // Enter stealth cloak (2.5x critical damage on next attack)
        fighter.stealthDuration = 4.5;
        fighter.isStealthed = true;

        this.damageFloaters.push({
          id: `floater-stealth-${Date.now()}`,
          text: '🕶️ HOLO-CLOAKED (2.5x CRIT READY)',
          x: fighter.x,
          y: 4.2,
          z: fighter.z,
          color: '#06B6D4',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      default: {
        // Fallback: 360 AoE Nova blast
        const radius = 10;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            const dmg = Math.round(baseDamage * (1 - d / radius * 0.4));
            this.damageFighter(target, dmg, fighter.creature.name, true);
          }
        });

        const ringGeo = new THREE.RingGeometry(0.5, 1.2, 24);
        ringGeo.rotateX(-Math.PI / 2);
        const ringMesh = new THREE.Mesh(
          ringGeo,
          new THREE.MeshBasicMaterial({ color: new THREE.Color(abilityColor), side: THREE.DoubleSide })
        );
        ringMesh.position.set(fighter.x, 0.4, fighter.z);
        this.scene.add(ringMesh);

        let scale = 1;
        const expand = setInterval(() => {
          scale += 1.2;
          ringMesh.scale.set(scale, scale, scale);
          if (scale > 9) {
            clearInterval(expand);
            this.scene.remove(ringMesh);
          }
        }, 20);
        break;
      }
    }

    this.combatLogs.push(`⚡ ${fighter.creature.name} activated [${ability.name}]!`);
    if (fighter.isPlayer) sound.playPlayerEliminated();
  }

  // Dash Evade with Kinetic Surge Overload
  public executeDash(fighter: ActiveFighter) {
    fighter.isDashing = true;
    if (fighter.isPlayer) {
      this.combatObserver.recordPlayerDash();
    }
    let dashSpeed = 45;

    // Check Real-World Kinetic Sensor Overload
    if (fighter.isPlayer && this.kineticCharge >= 100) {
      this.kineticCharge = 0;
      this.kineticSurgesTriggered++;
      dashSpeed = 65; // Supercharged kinetic velocity!

      // Trigger expanding Kinetic Shockwave Ring
      const ringGeo = new THREE.RingGeometry(0.5, 2.5, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(fighter.x, 0.2, fighter.z);
      this.scene.add(ringMesh);

      let scale = 1;
      const expand = setInterval(() => {
        scale += 0.8;
        ringMesh.scale.set(scale, scale, scale);
        if (scale > 10) {
          clearInterval(expand);
          this.scene.remove(ringMesh);
        }
      }, 20);

      // Knock back and damage nearby enemies
      this.fighters.forEach((other) => {
        if (other.id !== fighter.id && !other.isDead) {
          const d = Math.hypot(other.x - fighter.x, other.z - fighter.z);
          if (d < 10) {
            this.damageFighter(other, 95, `${fighter.creature.name} [Kinetic Surge]`, true, 'electric');
            this.applyKnockback(other, fighter.x, fighter.z, 6.0);
          }
        }
      });

      this.combatLogs.push(`⚡ ${fighter.creature.name} discharged 100% REAL-WORLD KINETIC SURGE!`);
      sound.playBonus();
    } else {
      sound.playBonus();
    }

    const dna = fighter.combatDna || fighter.creature.combatDna;
    const mobilityMod = 0.85 + (dna?.mobility ?? 0.5) * 0.35;
    const tractionMod = 0.90 + (dna?.traction ?? 0.5) * 0.25;
    const dashDistanceMultiplier = mobilityMod * tractionMod;

    fighter.x += Math.sin(fighter.rotation) * dashSpeed * 0.12 * dashDistanceMultiplier;
    fighter.z += Math.cos(fighter.rotation) * dashSpeed * 0.12 * dashDistanceMultiplier;
  }

  // Causal Knockback Engine: derived from Real-World Mass & Knockback Resistance
  public applyKnockback(target: ActiveFighter, fromX: number, fromZ: number, rawForce: number) {
    if (target.isDead) return;
    const targetDna = target.combatDna || target.creature.combatDna;
    const knockbackResist = targetDna?.knockbackResistance ?? 0.5;
    // A heavy metal robot (knockbackResistance = 0.95) receives minimal displacement (~0.2x)
    // A lightweight sneaker/cloth robot (knockbackResistance = 0.25) flies back significantly (~1.1x)
    const effectiveMultiplier = Math.max(0.12, 1.40 - knockbackResist * 1.25);
    const effectiveForce = rawForce * effectiveMultiplier;

    const angle = Math.atan2(target.x - fromX, target.z - fromZ);
    const impulseX = Math.sin(angle) * effectiveForce;
    const impulseZ = Math.cos(angle) * effectiveForce;

    // Apply immediate displacement and residual impulse velocity
    target.x += impulseX * 0.7;
    target.z += impulseZ * 0.7;
    target.knockbackVx = (target.knockbackVx || 0) + impulseX * 6.0;
    target.knockbackVz = (target.knockbackVz || 0) + impulseZ * 6.0;

    // Arena boundary clamp
    const dist = Math.hypot(target.x, target.z);
    const maxBoundary = this.arenaRadius - 2.8;
    if (dist > maxBoundary) {
      target.x = (target.x / dist) * maxBoundary;
      target.z = (target.z / dist) * maxBoundary;
    }
  }

  // Jump execution with arcade vertical velocity
  public executeJump(fighter: ActiveFighter) {
    if (fighter.y > 0.1 || fighter.isDead) return;
    fighter.isJumping = true;
    fighter.jumpVelocityY = 13.5;
    if (fighter.isPlayer) {
      this.combatObserver.recordPlayerJump();
    }
    try {
      sound.playJump();
    } catch {}
  }

  // Damage Fighter & Check Kills with Real-World Material Physics & Environmental Synergy
  public damageFighter(
    fighter: ActiveFighter, 
    amount: number, 
    sourceName: string, 
    isCrit = false,
    attackElement?: CreatureElement
  ) {
    if (fighter.isDead) return;

    // Invulnerability i-frames check: completely shields against rapid consecutive hits
    if (fighter.invulnerabilityTimer && fighter.invulnerabilityTimer > 0) return;

    let modifiedAmount = amount;

    // Player health protection: incoming damage reduced and defensive poise active during attacks
    if (fighter.isPlayer) {
      this.combatObserver.recordDamageTaken(amount);
      modifiedAmount *= 0.45; // 55% base incoming damage mitigation
      if (fighter.isAttacking) {
        // Offensive poise / armor bonus: attack without losing health rapidly
        modifiedAmount *= 0.70;
      }
      fighter.timeSinceLastDamage = 0;
      fighter.invulnerabilityTimer = 0.50; // 0.50s of invulnerability i-frames
    } else {
      fighter.invulnerabilityTimer = 0.20; // 0.20s i-frames for AI opponents
    }

    // 1. Environmental Synergy Buff / Nerf
    if (attackElement) {
      if (attackElement === this.currentEnvironment.elementalBuff) {
        modifiedAmount *= this.currentEnvironment.elementalBuffMultiplier;
      } else if (attackElement === this.currentEnvironment.elementalNerf) {
        modifiedAmount *= (this.currentEnvironment.elementalNerfMultiplier || 0.8);
      }
    }

    // 2. Real-World Material Physics (Ceramic, Rubber, Thorns, Battery, ABS Plastic)
    const mat = fighter.creature.materialPhysics;
    if (mat && attackElement) {
      if (attackElement === 'electric') {
        if (mat.electricalConductivity <= 10) {
          // Dielectric Insulator (Rubber, Ceramic, Dry Glass)
          modifiedAmount *= 0.45;
          this.materialAdvantageHits++;
          this.materialAdvantageNotice = `${fighter.creature.name}'s ${mat.materialName} insulated against electric shock!`;
          this.damageFloaters.push({
            id: `floater-mat-${Date.now()}-${Math.random()}`,
            text: 'INSULATED (-55%)',
            x: fighter.x,
            y: 4.2,
            z: fighter.z,
            color: '#38BDF8',
            isCrit: true,
            opacity: 1.0,
          });
        } else if (mat.electricalConductivity >= 75 || this.currentEnvironment.weather === 'thunderstorm') {
          // High Conductivity Metal or Wet Environment
          modifiedAmount *= 1.35;
          this.materialAdvantageHits++;
          this.materialAdvantageNotice = `${fighter.creature.name}'s ${mat.materialName} conducted excess shock damage!`;
          this.damageFloaters.push({
            id: `floater-mat-${Date.now()}-${Math.random()}`,
            text: 'CONDUCTED (+35%)',
            x: fighter.x,
            y: 4.2,
            z: fighter.z,
            color: '#FACC15',
            isCrit: true,
            opacity: 1.0,
          });
        }
      } else if (attackElement === 'fire') {
        if (mat.heatResistance >= 85) {
          // Heat-proof Glazed Ceramic / Stone
          modifiedAmount *= 0.5;
          this.materialAdvantageHits++;
          this.materialAdvantageNotice = `${fighter.creature.name}'s ${mat.materialName} dissipated the thermal blast!`;
          this.damageFloaters.push({
            id: `floater-mat-${Date.now()}-${Math.random()}`,
            text: 'THERMAL SHIELD (-50%)',
            x: fighter.x,
            y: 4.2,
            z: fighter.z,
            color: '#FB923C',
            isCrit: true,
            opacity: 1.0,
          });
        } else if (mat.heatResistance <= 40) {
          // Flammable polymer/rubber/organic
          modifiedAmount *= 1.3;
          this.damageFloaters.push({
            id: `floater-mat-${Date.now()}-${Math.random()}`,
            text: 'HEAT COMBUST (+30%)',
            x: fighter.x,
            y: 4.2,
            z: fighter.z,
            color: '#EF4444',
            isCrit: true,
            opacity: 1.0,
          });
        }
      } else if (attackElement === 'rock') {
        if (mat.impactDurability <= 55) {
          // Brittle crystalline or ceramic fracture
          modifiedAmount *= 1.35;
          this.damageFloaters.push({
            id: `floater-mat-${Date.now()}-${Math.random()}`,
            text: 'BRITTLE FRACTURE (+35%)',
            x: fighter.x,
            y: 4.2,
            z: fighter.z,
            color: '#E879F9',
            isCrit: true,
            opacity: 1.0,
          });
        }
      }
    }

    // 3. Real-World Combat DNA Armor Absorption
    const targetDna = fighter.combatDna || fighter.creature.combatDna;
    if (targetDna) {
      const armorAbsorb = targetDna.armorAbsorption ?? 0.5;
      // High armor absorption (heavy cast iron/steel) reduces incoming kinetic force by up to 25%
      modifiedAmount *= (1.10 - armorAbsorb * 0.25);
    }

    // 4. Defense mitigation with Buffs & Energy Shield Absorption
    if (fighter.defenseBuffDuration && fighter.defenseBuffDuration > 0) {
      modifiedAmount *= (1 - (fighter.defenseBuffPercent || 50) / 100);
    }

    const def = fighter.creature.stats.defense;
    let mitigated = Math.max(5, Math.round(modifiedAmount * (100 / (100 + def))));

    // Energy Shield Absorption
    if (fighter.shieldHp && fighter.shieldHp > 0) {
      const absorbed = Math.min(fighter.shieldHp, mitigated);
      fighter.shieldHp -= absorbed;
      mitigated -= absorbed;
      this.damageFloaters.push({
        id: `floater-shield-${Date.now()}-${Math.random()}`,
        text: `SHIELD (-${absorbed})`,
        x: fighter.x,
        y: 4.8,
        z: fighter.z,
        color: '#38BDF8',
        isCrit: false,
        opacity: 1.0,
      });
      if (fighter.shieldHp <= 0) {
        fighter.shieldDuration = 0;
      }
    }

    if (mitigated > 0) {
      fighter.currentHp = Math.max(0, fighter.currentHp - mitigated);
    }
    fighter.isHit = true;

    // Floater
    this.damageFloaters.push({
      id: `floater-${Date.now()}-${Math.random()}`,
      text: `-${mitigated}${isCrit ? ' CRIT!' : ''}`,
      x: fighter.x + (Math.random() - 0.5),
      y: fighter.y + 3.8,
      z: fighter.z + (Math.random() - 0.5),
      color: isCrit ? '#FFEA00' : fighter.isPlayer ? '#FF1744' : '#00E5FF',
      isCrit,
      opacity: 1.0,
    });

    if (fighter.currentHp <= 0) {
      this.handleFighterElimination(fighter, sourceName);
    }
  }

  private handleFighterElimination(victim: ActiveFighter, killerName: string) {
    victim.isDead = true;
    victim.currentHp = 0;

    // Award kill to killer
    const killer = this.fighters.find((f) => f.creature.name === killerName);
    if (killer) {
      killer.kills += 1;
      killer.level += 1;
      killer.currentHp = Math.min(killer.maxHp, killer.currentHp + 100); // Heal on kill
    }

    this.combatLogs.push(`⚔️ ${victim.creature.name} was eliminated by ${killerName}!`);

    if (victim.isPlayer) {
      sound.playGameOver();
    } else {
      sound.playKill();
    }
  }

  // Update Projectiles Movement & Hitboxes with Elemental Passing & Ability Physics
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing guidance logic
      if (p.isHoming && p.homingTargetId) {
        const target = this.fighters.find((f) => f.id === p.homingTargetId && !f.isDead);
        if (target) {
          const desiredAngle = Math.atan2(target.x - p.x, target.z - p.z);
          const currentSpeed = Math.hypot(p.vx, p.vz) || 28;
          // Smoothly steer velocity
          p.vx = p.vx * 0.85 + Math.sin(desiredAngle) * currentSpeed * 0.15;
          p.vz = p.vz * 0.85 + Math.cos(desiredAngle) * currentSpeed * 0.15;
        }
      }

      // Ballistic mortar gravity
      if (p.isMortar && p.vy !== undefined) {
        p.vy -= 28 * dt;
        p.y += p.vy * dt;
      }

      // Gravitational Singularity Vortex Pull
      if (p.isSingularity) {
        this.fighters.forEach((f) => {
          if (f.id === p.ownerId || f.isDead) return;
          const dist = Math.hypot(f.x - p.x, f.z - p.z);
          if (dist < 11.0 && dist > 0.4) {
            const pullSpeed = (11.0 - dist) * 2.8 * dt;
            const pullAngle = Math.atan2(p.x - f.x, p.z - f.z);
            f.x += Math.sin(pullAngle) * pullSpeed;
            f.z += Math.cos(pullAngle) * pullSpeed;
          }
        });
      }

      // Aero-Cyclone Vortex Lift
      if (p.isCyclone) {
        this.fighters.forEach((f) => {
          if (f.id === p.ownerId || f.isDead) return;
          const dist = Math.hypot(f.x - p.x, f.z - p.z);
          if (dist < 3.8) {
            f.rotation += 9 * dt;
            f.y = Math.min(3.2, f.y + 4.5 * dt);
            this.damageFighter(f, 35 * dt, 'Aero-Cyclone', false, 'electric');
          } else if (f.y > 0) {
            f.y = Math.max(0, f.y - 7 * dt);
          }
        });
      }

      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.lifetime -= dt;

      const mesh = this.projectileMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, p.y, p.z);
        if (p.isCyclone) {
          mesh.rotation.y += 12 * dt;
        }
      }

      // Check hits against fighters
      let hit = false;
      for (const fighter of this.fighters) {
        if (fighter.id === p.ownerId || fighter.isDead) continue;
        const d = Math.hypot(fighter.x - p.x, fighter.z - p.z);
        const dy = Math.abs((fighter.y + 1.8) - p.y);

        // Aerial leap evasion: if fighter jumped high over a low projectile, it misses!
        if (fighter.y > 1.2 && p.y <= 2.0) {
          if (fighter.isPlayer && d < 2.0 && !fighter.isDead) {
            this.damageFloaters.push({
              id: `dodge-${Date.now()}-${Math.random()}`,
              text: 'AERIAL LEAP DODGE!',
              x: fighter.x,
              y: fighter.y + 2.8,
              z: fighter.z,
              color: '#38BDF8',
              isCrit: true,
              opacity: 1.0,
            });
          }
          continue;
        }

        if (d < 1.5 + p.radius && dy < 2.2) {
          // Check if owner was in stealth: deal 2.5x crit!
          const ownerFighter = this.fighters.find((f) => f.id === p.ownerId);
          const isStealthCrit = !!(ownerFighter && ownerFighter.isStealthed);
          if (isStealthCrit && ownerFighter) {
            ownerFighter.isStealthed = false;
            ownerFighter.stealthDuration = 0;
          }

          const finalDamage = isStealthCrit ? Math.round(p.damage * 2.5) : p.damage;

          if (p.ownerId === 'player') {
            const isMelee = Math.hypot(this.playerFighter.x - fighter.x, this.playerFighter.z - fighter.z) <= 5.5;
            this.combatObserver.recordPlayerHitLanded(finalDamage, isMelee ? 'melee' : 'ranged');
          }

          this.damageFighter(
            fighter, 
            finalDamage, 
            p.ownerId === 'player' ? this.playerFighter.creature.name : 'Rival', 
            isStealthCrit || p.vfxType !== undefined,
            p.element
          );

          // Real-World Combat DNA Knockback Impact
          const attackerImpact = ownerFighter?.combatDna?.impactForce ?? 0.5;
          const rawForce = 1.8 * (0.75 + attackerImpact * 0.85);
          this.applyKnockback(fighter, p.x - p.vx * 0.05, p.z - p.vz * 0.05, rawForce);

          if (!p.isPiercing && !p.isCyclone) {
            hit = true;
            break;
          }
        }
      }

      // Mortar ground impact
      if (p.isMortar && p.y <= 0.2) {
        hit = true;
        // Explode AoE on ground impact
        this.fighters.forEach((target) => {
          if (target.id === p.ownerId || target.isDead) return;
          const d = Math.hypot(target.x - p.x, target.z - p.z);
          if (d <= 5.5) {
            this.damageFighter(target, p.damage, 'Mortar Battery', true, 'fire');
            this.applyKnockback(target, p.x, p.z, 3.2);
          }
        });
      }

      // Remove expired or hit projectiles
      if (hit || p.lifetime <= 0) {
        if (mesh) this.scene.remove(mesh);
        this.projectileMeshes.delete(p.id);
        this.projectiles.splice(i, 1);
      }
    }
  }

  // Pickups
  private checkPickups() {
    this.pickups.forEach((pickup, i) => {
      const d = Math.hypot(this.playerFighter.x - pickup.x, this.playerFighter.z - pickup.z);
      if (d < 2.0 && !this.playerFighter.isDead) {
        if (pickup.type === 'health') {
          this.playerFighter.currentHp = Math.min(this.playerFighter.maxHp, this.playerFighter.currentHp + pickup.value);
          sound.playBonus();
        } else {
          this.playerFighter.kills += 1; // XP bonus
          this.playerFighter.level += 1;
          sound.playLevelUp();
        }

        const mesh = this.projectileMeshes.get(pickup.id);
        if (mesh) this.scene.remove(mesh);
        this.pickups.splice(i, 1);
      }
    });
  }

  // Check Match End (Victory / Defeat)
  private checkMatchConditions() {
    const aliveFighters = this.fighters.filter((f) => !f.isDead);

    // If player died: Defeat
    if (this.playerFighter.isDead && this.isRunning) {
      this.isRunning = false;
      const rank = aliveFighters.length + 1;
      const stats: Arena3DMatchStats = {
        creatureName: this.playerFighter.creature.name,
        originalObject: this.playerFighter.creature.originalObject,
        rank,
        totalCombatants: this.fighters.length,
        kills: this.playerFighter.kills,
        damageDealt: this.playerFighter.kills * 240 + Math.round(this.matchDuration * 15),
        survivalTimeSeconds: Math.round(this.matchDuration),
        isVictory: false,
        earnedXp: Math.round(this.matchDuration * 8 + this.playerFighter.kills * 60),
        earnedCoins: Math.round(this.matchDuration * 5 + this.playerFighter.kills * 40),
        environmentUsed: this.currentEnvironment.name,
        materialAdvantageHits: this.materialAdvantageHits,
        voiceCommandsIssued: this.voiceCommandsIssued,
        kineticSurgesTriggered: this.kineticSurgesTriggered,
      };
      if (this.onMatchEndCallback) this.onMatchEndCallback(stats);
      return;
    }

    // If player is the last one standing: Victory!
    if (aliveFighters.length === 1 && aliveFighters[0].isPlayer && this.isRunning) {
      this.isRunning = false;
      sound.playVictory();
      const stats: Arena3DMatchStats = {
        creatureName: this.playerFighter.creature.name,
        originalObject: this.playerFighter.creature.originalObject,
        rank: 1,
        totalCombatants: this.fighters.length,
        kills: this.playerFighter.kills,
        damageDealt: this.playerFighter.kills * 320 + Math.round(this.matchDuration * 25),
        survivalTimeSeconds: Math.round(this.matchDuration),
        isVictory: true,
        earnedXp: 500 + this.playerFighter.kills * 100,
        earnedCoins: 350 + this.playerFighter.kills * 75,
        environmentUsed: this.currentEnvironment.name,
        materialAdvantageHits: this.materialAdvantageHits,
        voiceCommandsIssued: this.voiceCommandsIssued,
        kineticSurgesTriggered: this.kineticSurgesTriggered,
      };
      if (this.onMatchEndCallback) this.onMatchEndCallback(stats);
    }
  }

  private cleanupCombatEntities() {
    this.fighters.forEach((f) => {
      const model = this.fighterModels.get(f.id);
      if (model) {
        this.scene.remove(model.root);
        model.dispose();
      }
      const hpBar = this.fighterHpBars.get(f.id);
      if (hpBar) this.scene.remove(hpBar);
    });
    this.fighterModels.clear();
    this.fighterHpBars.clear();

    this.projectiles.forEach((p) => {
      const mesh = this.projectileMeshes.get(p.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.projectiles = [];
    this.projectileMeshes.clear();

    this.pickups.forEach((pickup) => {
      const mesh = this.projectileMeshes.get(pickup.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.pickups = [];
  }

  public destroy() {
    this.isRunning = false;
    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', this.handleResize);
    this.cleanupCombatEntities();
    if (this.renderer && this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer?.dispose();
  }
}
