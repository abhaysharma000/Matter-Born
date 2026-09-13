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
  DerivedMechanic,
  WeaponSkillType
} from '../types/creature';
import { Creature3DBuilder, Creature3DModel } from './Creature3DBuilder';
import { getCreatureWeaponType, createWeaponProjectileMesh, WEAPON_SKILL_METAS } from './weaponSkillConfig';
import { RIVAL_OBJECT_CREATURES, STARTER_TEMPLATE_ROBOT } from '../data/creaturePresets';
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
import { ForgeCombatBonuses, ForgeUpgradesState } from '../types/forge';
import { getForgeUpgrades, getForgeCombatBonuses } from '../utils/forgeManager';
import { createGrassCanvasTexture, buildArenaFlora, ArenaFloraSystem, ArenaTree, ArenaBush } from './ArenaFlora';
import { multiplayerManager, getOrCreatePlayerId } from '../utils/multiplayerManager';
import { CombatSyncPacket, DamageSyncEvent, RoomMember, FriendProfile } from '../types/multiplayer';

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
  playerWeaponType?: WeaponSkillType;
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
  friendCombatantsCount?: number;
  friendNames?: string[];
  // Adaptive Gemini Combat Director
  tacticalPolicy?: TacticalPolicy;
  recentAdaptationEvent?: TacticalAdaptationEvent | null;
  observationMetrics?: CombatObservationMetrics;
  tacticalAdaptationHistory?: TacticalAdaptationEvent[];
  // Permanent Forge Upgrades Combat System
  forgeBonuses?: ForgeCombatBonuses;
  // Natural Biome & Tactical Foliage
  isHidingInBush?: boolean;
  radarBushes?: Array<{
    x: number;
    z: number;
    radius: number;
  }>;
  radarTrees?: Array<{
    x: number;
    z: number;
  }>;
  gameMode?: 'easy' | 'moderate' | 'hard';
}

export class ThreeArenaEngine {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private animationFrameId: number | null = null;

  // Natural Biome & Tactical Cover System
  public floraSystem: ArenaFloraSystem | null = null;
  public isPlayerHidingInBush: boolean = false;
  private wasPlayerHidingInBush: boolean = false;

  // Permanent Forge Upgrades Combat State
  private activeForgeUpgrades: ForgeUpgradesState = getForgeUpgrades();
  public forgeBonuses: ForgeCombatBonuses = getForgeCombatBonuses(this.activeForgeUpgrades);

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
  private aiThoughtTimer: number = 0;

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
  private projectileMeshes: Map<string, THREE.Object3D> = new Map();
  private pickups: ArenaPickup[] = [];
  private pickupMeshes: Map<string, THREE.Mesh> = new Map();
  public damageFloaters: DamageFloater[] = [];

  // Match State
  public isRunning = false;
  public isPaused = false;
  public gameMode: 'easy' | 'moderate' | 'hard' = 'easy';
  private startTime = 0;
  private matchDuration = 0;
  private combatLogs: string[] = [];
  private isDestroyed = false;
  private friendCombatantsCount = 0;
  private friendNames: string[] = [];

  // Input Vector (from Joystick or Keyboard)
  public inputVector = { x: 0, z: 0 };
  public isAttackPressed = false;
  public isAbilityPressed = false;
  public isDashPressed = false;
  public isJumpPressed = false;
  private lastAbilityWasPressed = false;
  private lastAbilityWarningTime = 0;

  // 360° Free Camera Look (Mouse / Touch Look Joystick)
  public cameraYaw: number = 0;
  public cameraPitch: number = 0.52;

  // Multiplayer Room Combat Synchronization
  public isMultiplayer: boolean = false;
  public multiplayerRoomCode: string | null = null;
  private localPlayerId: string = '';
  private lastCombatPacketSendTime: number = 0;
  private remoteFighterTargets: Map<string, { x: number; y: number; z: number; rot: number }> = new Map();

  public rotateCamera(deltaYaw: number, deltaPitch: number) {
    this.cameraYaw += deltaYaw;
    while (this.cameraYaw > Math.PI) this.cameraYaw -= Math.PI * 2;
    while (this.cameraYaw < -Math.PI) this.cameraYaw += Math.PI * 2;
    this.cameraPitch = Math.max(0.12, Math.min(1.20, this.cameraPitch + deltaPitch));
  }

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
          mat.color.set('#8ab898'); // Deep reflective rain-drenched grass
          mat.roughness = 0.45;
          mat.metalness = 0.2;
        } else if (env.weather === 'heatwave') {
          mat.color.set('#fde68a'); // Sun-scorched golden savanna turf
          mat.roughness = 0.88;
          mat.metalness = 0.05;
        } else if (env.weather === 'blizzard') {
          mat.color.set('#e2e8f0'); // Frosted snow-dusted meadow
          mat.roughness = 0.6;
          mat.metalness = 0.15;
        } else {
          mat.color.set('#ffffff'); // Pure natural lush emerald grass
          mat.roughness = 0.82;
          mat.metalness = 0.08;
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
        this.playerFighter.abilityCooldown = this.playerFighter.creature.specialAbility.cooldown * this.forgeBonuses.specialCdFactor;
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
    // 1. Lush Emerald Natural Battlefield (Radius 100 with procedural grass texture)
    const floorGeo = new THREE.CylinderGeometry(this.arenaRadius, this.arenaRadius + 4, 6, 64);
    const grassTexture = createGrassCanvasTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassTexture,
      roughness: 0.82,
      metalness: 0.08,
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

    // 4. LUSH NATURE BIOME: 4,200 3D Grass Tufts, 12 Tactical Cover Trees, 16 Hiding Bushes
    this.floraSystem = buildArenaFlora(this.arenaRadius);
    this.scene.add(this.floraSystem.floraGroup);
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

  // Forge Upgrades Management
  public setForgeUpgrades(upgrades: ForgeUpgradesState) {
    this.activeForgeUpgrades = upgrades;
    this.forgeBonuses = getForgeCombatBonuses(upgrades);
  }

  public refreshForgeUpgrades() {
    this.activeForgeUpgrades = getForgeUpgrades();
    this.forgeBonuses = getForgeCombatBonuses(this.activeForgeUpgrades);
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

  // Start a new 3D Battle Arena Match (Friends + AI-Integrated NPCs + 1 Player)
  public startMatch(
    playerCreature: BattleCreature, 
    opponentCount = 10, 
    mode: string = 'easy',
    friendFighters: FriendProfile[] = []
  ) {
    const mappedMode: 'easy' | 'moderate' | 'hard' =
      mode === 'hard' || mode === 'royale'
        ? 'hard'
        : mode === 'moderate' || mode === 'rush'
        ? 'moderate'
        : 'easy';
    this.gameMode = mappedMode;
    this.cleanupCombatEntities();
    this.refreshForgeUpgrades();
    this.friendCombatantsCount = friendFighters.length;
    this.friendNames = friendFighters.map(f => f.name);

    // 1. Initialize Player Fighter safely
    const fallbackTemplate = STARTER_TEMPLATE_ROBOT;
    const safePlayerCreature: BattleCreature = {
      ...fallbackTemplate,
      ...(playerCreature || {}),
      name: playerCreature?.name || fallbackTemplate.name,
      stats: {
        ...fallbackTemplate.stats,
        ...(playerCreature?.stats || {}),
      },
      visualParams: {
        ...fallbackTemplate.visualParams,
        ...(playerCreature?.visualParams || {}),
      },
      specialAbility: playerCreature?.specialAbility || fallbackTemplate.specialAbility,
    };
    playerCreature = safePlayerCreature;

    this.startTime = performance.now();
    this.matchDuration = 0;
    this.dangerZoneRadius = this.arenaRadius;
    this.cameraYaw = 0;
    this.cameraPitch = 0.52;
    const squadLog = friendFighters.length > 0
      ? ` 👥 Friend Arena Active: ${friendFighters.map(f => f.name).join(' & ')} spawned in combat positions!`
      : ` 10 AI Agents Active.`;
    this.combatLogs = [`Match commenced [Difficulty: ${mappedMode.toUpperCase()}]! You spawned as ${playerCreature.name}.${squadLog}`];

    // Reset Adaptive Gemini Tactical Director
    this.combatObserver.reset();
    this.tacticalDirector.reset('KEEP_DISTANCE');
    this.currentTacticalPolicy = this.tacticalDirector.getCurrentPolicy();
    this.recentAdaptationEvent = null;
    this.tacticalAdaptationHistory = [];

    const effectiveHp = (playerCreature.stats?.hp || 1000) + (this.forgeBonuses.healthAdd || 0);
    const playerBaseHp = Math.round(effectiveHp * 1.5);
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

    // 2. Spawn 10 Dedicated Combat Entities (Friends take the first NPC slots, remaining are AI-Integrated NPCs)
    const AI_ROLES = [
      { tag: 'AI #1', role: 'Flanker', archetype: 'Tactical Flanker' },
      { tag: 'AI #2', role: 'Bush Stalker', archetype: 'Stealth Ambush Hunter' },
      { tag: 'AI #3', role: 'Titan Colossus', archetype: 'Heavy Juggernaut' },
      { tag: 'AI #4', role: 'Sniper Scout', archetype: 'Ballistic Marksman' },
      { tag: 'AI #5', role: 'Particle Cyclops', archetype: 'Energy Disruptor' },
      { tag: 'AI #6', role: 'Bio-Scavenger', archetype: 'Orb Harvester & Healer' },
      { tag: 'AI #7', role: 'Apex Berserker', archetype: 'Overdrive Rusher' },
      { tag: 'AI #8', role: 'Vortex Controller', archetype: 'Singularity Saboteur' },
      { tag: 'AI #9', role: 'Aero Dasher', archetype: 'Aerial Evader' },
      { tag: 'AI #10', role: 'Chronos Prime', archetype: 'Adaptive Counter-AI' },
    ];

    const availableRivals = [...RIVAL_OBJECT_CREATURES];
    for (let i = 0; i < opponentCount; i++) {
      let rivalCreature: BattleCreature;
      let rivalCombatDna: CombatDNA;
      let fighterId = `fighter-ai-${i}`;
      let startingLevel = 1;

      // If friends are invited to Friend Arena, spawn them in the position of the first NPCs
      if (i < friendFighters.length) {
        const friend = friendFighters[i];
        fighterId = `fighter-friend-${friend.id}`;
        startingLevel = friend.level || 1;
        const template = availableRivals[i % availableRivals.length];
        const baseDna = template.combatDna || deriveCombatDna(template);

        rivalCreature = {
          ...template,
          id: `friend-${friend.id}-${Date.now()}`,
          name: `⭐ [Friend] ${friend.name}`,
          visualParams: {
            ...template.visualParams,
            primaryColor: friend.faction === 'Autobot' ? '#3b82f6' : '#ef4444',
          },
          stats: {
            ...template.stats,
            hp: Math.round(template.stats.hp * (1 + (startingLevel - 1) * 0.1)),
            attack: Math.round(template.stats.attack * (1 + (startingLevel - 1) * 0.08)),
            defense: Math.round(template.stats.defense * (1 + (startingLevel - 1) * 0.08)),
          },
          combatDna: {
            ...baseDna,
          },
        };
        rivalCombatDna = rivalCreature.combatDna;
      } else {
        const template = availableRivals[i % availableRivals.length];
        rivalCombatDna = template.combatDna || deriveCombatDna(template);
        const aiRole = AI_ROLES[i % AI_ROLES.length];
        rivalCreature = {
          ...template,
          id: `opponent-${i}-${Date.now()}`,
          name: `🤖 [${aiRole.tag}] ${template.name}`,
          combatDna: rivalCombatDna,
        };
      }

      const angle = (i * Math.PI * 2) / opponentCount + (Math.random() - 0.5) * 0.4;
      const dist = 30 + Math.random() * 46;
      const opponentFighter: ActiveFighter = {
        id: fighterId,
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
        level: startingLevel,
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

  // Enable Real-Time Multiplayer Room Combat Synchronization
  public enableMultiplayer(roomCode: string, players?: RoomMember[]) {
    this.isMultiplayer = true;
    this.multiplayerRoomCode = roomCode;
    this.localPlayerId = getOrCreatePlayerId();

    this.combatLogs.push(`🌐 MULTIPLAYER LINK ACTIVE: Room [${roomCode}] synchronized!`);

    // Spawn remote human players if provided
    if (Array.isArray(players)) {
      players.forEach((p, idx) => {
        if (p.id !== this.localPlayerId && !this.fighters.some((f) => f.id === p.id)) {
          this.spawnRemoteHumanFighter(p, idx);
        }
      });
    }

    // Subscribe to 20 FPS combat sync loop
    multiplayerManager.startCombatSync(
      roomCode,
      (packet: CombatSyncPacket) => {
        this.handleIncomingCombatPacket(packet);
      },
      (damage: DamageSyncEvent) => {
        this.handleIncomingDamageEvent(damage);
      }
    );
  }

  private spawnRemoteHumanFighter(player: { id: string; name: string; creature?: BattleCreature }, index: number = 0) {
    const raw = player.creature;
    const fallbackTemplate = RIVAL_OBJECT_CREATURES[index % RIVAL_OBJECT_CREATURES.length] || STARTER_TEMPLATE_ROBOT;
    const creature: BattleCreature = {
      ...fallbackTemplate,
      ...(raw || {}),
      name: `👥 [FRIEND] ${player.name || raw?.name || 'Teammate'}`,
      stats: {
        ...fallbackTemplate.stats,
        ...(raw?.stats || {}),
      },
      visualParams: {
        ...fallbackTemplate.visualParams,
        ...(raw?.visualParams || {}),
      },
      specialAbility: raw?.specialAbility || fallbackTemplate.specialAbility,
    };
    const angle = (index * Math.PI * 2) / 4 + Math.PI / 4;
    const dist = 18 + index * 4;

    const remoteFighter: ActiveFighter = {
      id: player.id,
      creature,
      combatDna: creature.combatDna || deriveCombatDna(creature),
      isPlayer: false,
      x: Math.cos(angle) * dist,
      y: 0,
      z: Math.sin(angle) * dist,
      rotation: angle + Math.PI,
      currentHp: creature.stats?.hp || 1000,
      maxHp: creature.stats?.hp || 1000,
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

    this.fighters.push(remoteFighter);
    try {
      this.buildFighter3DModel(remoteFighter);
    } catch (err) {
      console.warn('Failed to build 3D model for remote fighter:', err);
    }
    this.remoteFighterTargets.set(player.id, {
      x: remoteFighter.x,
      y: remoteFighter.y,
      z: remoteFighter.z,
      rot: remoteFighter.rotation,
    });
  }

  private handleIncomingCombatPacket(packet: CombatSyncPacket) {
    if (packet.senderId === this.localPlayerId) return;

    let remoteFighter = this.fighters.find((f) => f.id === packet.senderId);
    if (!remoteFighter) {
      this.spawnRemoteHumanFighter({
        id: packet.senderId,
        name: packet.senderName || `Teammate`,
        creature: packet.creature,
      });
      remoteFighter = this.fighters.find((f) => f.id === packet.senderId);
    }

    if (remoteFighter && !remoteFighter.isDead) {
      this.remoteFighterTargets.set(packet.senderId, {
        x: packet.x,
        y: packet.y,
        z: packet.z,
        rot: packet.rotation,
      });

      if (packet.currentHp !== undefined) remoteFighter.currentHp = packet.currentHp;
      if (packet.maxHp !== undefined) remoteFighter.maxHp = packet.maxHp;

      if (packet.isAttacking && !remoteFighter.isAttacking) {
        this.executeAttack(remoteFighter);
      }
      if (packet.isDashing && !remoteFighter.isDashing) {
        this.executeDash(remoteFighter);
      }
      if (packet.attackType === 'special' && !remoteFighter.isCastingAbility) {
        this.executeSpecialAbility(remoteFighter);
      }

      remoteFighter.isAttacking = !!packet.isAttacking;
      remoteFighter.isDashing = !!packet.isDashing;
      remoteFighter.isCastingAbility = packet.attackType === 'special';
    }
  }

  private handleIncomingDamageEvent(damage: DamageSyncEvent) {
    if (damage.attackerId === this.localPlayerId) return;
    const target = this.fighters.find((f) => f.id === damage.targetId);
    if (target && !target.isDead) {
      target.currentHp = Math.max(0, target.currentHp - damage.damage);
      const isCrit = !!damage.isCritical;
      this.damageFloaters.push({
        id: `floater-net-${Date.now()}-${Math.random()}`,
        text: `-${Math.round(damage.damage)}${isCrit ? ' CRIT!' : ''}`,
        x: target.x + (Math.random() - 0.5) * 1.5,
        y: target.y + 3.2,
        z: target.z + (Math.random() - 0.5) * 1.5,
        color: isCrit ? '#F59E0B' : target.isPlayer ? '#EF4444' : '#10B981',
        isCrit,
        opacity: 1.0,
      });
    }
  }

  private buildFighter3DModel(fighter: ActiveFighter) {
    const model = Creature3DBuilder.buildCreature(fighter.creature);
    model.root.position.set(fighter.x, fighter.y, fighter.z);
    model.root.rotation.y = fighter.rotation;
    this.scene.add(model.root);
    this.fighterModels.set(fighter.id, model);

    // Floating Overhead 3D Health Bar
    const isFriend = fighter.creature.name.toLowerCase().includes('friend') || fighter.id.startsWith('fighter-friend-') || (!fighter.id.startsWith('fighter-ai-') && !fighter.isPlayer);
    const hpGroup = new THREE.Group();
    const bgBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.DoubleSide })
    );
    const fillBar = new THREE.Mesh(
      new THREE.PlaneGeometry(2.3, 0.22),
      new THREE.MeshBasicMaterial({
        color: fighter.isPlayer ? 0x00e676 : isFriend ? 0x10b981 : 0xff1744,
        side: THREE.DoubleSide,
      })
    );
    fillBar.position.z = 0.01;
    hpGroup.add(bgBar);
    hpGroup.add(fillBar);

    // Floating Overhead AI or Teammate Agent Tag
    if (!fighter.isPlayer) {
      const tagCanvas = document.createElement('canvas');
      tagCanvas.width = 256;
      tagCanvas.height = 64;
      const ctx = tagCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(7, 22, 16, 0.94)';
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(4, 4, 248, 56, 14);
        } else {
          ctx.rect(4, 4, 248, 56);
        }
        ctx.fill();
        ctx.lineWidth = 3;
        if (isFriend) {
          ctx.strokeStyle = '#10b981';
          ctx.stroke();
          ctx.font = 'bold 22px monospace';
          ctx.fillStyle = '#6ee7b7';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const cleanName = fighter.creature.name.replace(/.*\[Friend\]\s*/i, '').replace('⭐', '').trim().slice(0, 14);
          ctx.fillText(`⭐ ${cleanName || 'Friend'}`, 128, 32);
        } else {
          ctx.strokeStyle = '#22c55e';
          ctx.stroke();
          ctx.font = 'bold 24px monospace';
          ctx.fillStyle = '#4ade80';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const aiNum = fighter.id.replace('fighter-ai-', '');
          ctx.fillText(`🤖 AI AGENT #${Number(aiNum) + 1}`, 128, 32);
        }
      }
      const tagTex = new THREE.CanvasTexture(tagCanvas);
      const tagMat = new THREE.SpriteMaterial({ map: tagTex, transparent: true, depthTest: false });
      const tagSprite = new THREE.Sprite(tagMat);
      tagSprite.scale.set(3.2, 0.8, 1);
      tagSprite.position.set(0, 0.68, 0);
      hpGroup.add(tagSprite);
    }

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
    if (!this.isRunning || this.isDestroyed) return;

    try {
      if (!this.isPaused) {
        const dt = 0.016; // 60fps fixed step
        this.updateSimulation(dt);
      }

      if (this.renderer && this.container) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (err) {
      console.warn('ThreeArenaEngine render tick error suppressed:', err);
    }

    if (!this.isDestroyed) {
      this.animationFrameId = requestAnimationFrame(this.tick);
    }
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

    // 1c. Multiplayer Combat High-Frequency Sync (20 FPS)
    if (this.isMultiplayer && this.multiplayerRoomCode && this.playerFighter && !this.playerFighter.isDead) {
      const now = performance.now();
      if (now - this.lastCombatPacketSendTime >= 50) {
        this.lastCombatPacketSendTime = now;
        multiplayerManager.broadcastCombatState(this.multiplayerRoomCode, {
          senderId: this.localPlayerId,
          senderName: this.playerFighter.creature.name,
          creature: this.playerFighter.creature,
          x: this.playerFighter.x,
          y: this.playerFighter.y,
          z: this.playerFighter.z,
          rotation: this.playerFighter.rotation,
          currentHp: this.playerFighter.currentHp,
          maxHp: this.playerFighter.maxHp,
          isAttacking: this.isAttackPressed || this.playerFighter.isAttacking,
          isDashing: this.isDashPressed || this.playerFighter.isDashing,
          isJumping: this.isJumpPressed,
          attackType: (this.isAbilityPressed || this.playerFighter.isCastingAbility) ? 'special' : 'normal',
          timestamp: Date.now(),
        });
      }

      // Smoothly interpolate remote players' positions & rotations
      this.remoteFighterTargets.forEach((target, fighterId) => {
        const f = this.fighters.find((x) => x.id === fighterId);
        if (f && !f.isDead) {
          f.x += (target.x - f.x) * Math.min(1, dt * 14);
          f.y += (target.y - f.y) * Math.min(1, dt * 14);
          f.z += (target.z - f.z) * Math.min(1, dt * 14);
          f.rotation += (target.rot - f.rotation) * Math.min(1, dt * 14);

          const model = this.fighterModels.get(f.id);
          if (model) {
            model.root.position.set(f.x, f.y, f.z);
            model.root.rotation.y = f.rotation;
          }
          const hpBar = this.fighterHpBars.get(f.id);
          if (hpBar) {
            const fighterScale = f.creature.visualParams?.scale || 1.1;
            hpBar.position.set(f.x, f.y + 4.5 * fighterScale, f.z);
          }
        }
      });
    }

    // 1b. Multi-Agent AI Thought Broadcast (Live Multi-Agent Integration)
    this.aiThoughtTimer += dt;
    if (this.aiThoughtTimer > 6.5) {
      this.aiThoughtTimer = 0;
      const aliveAiBots = this.fighters.filter((f) => !f.isPlayer && !f.isDead);
      if (aliveAiBots.length > 0) {
        const randomBot = aliveAiBots[Math.floor(Math.random() * aliveAiBots.length)];
        const botIndex = Number(randomBot.id.replace('fighter-ai-', '')) + 1;
        const thoughts = this.gameMode === 'hard' ? [
          `🤖 [AI Agent #${botIndex}]: [HARD MODE] Swarm protocol: ALL BOTS CONVERGE ON PLAYER!`,
          `🤖 [AI Agent #${botIndex}]: Player coordinates locked → executing synchronized encirclement!`,
          `🤖 [AI Agent #${botIndex}]: Full lethal aggression: hunt down player at all costs!`,
          `🤖 [AI Agent #${botIndex}]: Multi-agent mesh network: swarming player position!`,
        ] : this.gameMode === 'moderate' ? [
          `🤖 [AI Agent #${botIndex}]: [MODERATE MODE] Controlled aggression: 1-2 bots targeting player!`,
          `🤖 [AI Agent #${botIndex}]: Balancing arena skirmishes with tactical player dueling!`,
          `🤖 [AI Agent #${botIndex}]: Engaging rival AI agent across the perimeter!`,
        ] : [
          `🤖 [AI Agent #${botIndex}]: [EASY MODE] Going easy on player → dueling other AI bots!`,
          `🤖 [AI Agent #${botIndex}]: Breaking off player chase → roaming open field!`,
          `🤖 [AI Agent #${botIndex}]: Relaxed patrol: training skirmish with other bots!`,
        ];
        const chosenThought = thoughts[Math.floor(Math.random() * thoughts.length)];
        this.combatLogs.push(chosenThought);
        this.damageFloaters.push({
          id: `ai-thought-${Date.now()}`,
          text: `🧠 AI #${botIndex} ADAPTING`,
          x: randomBot.x,
          y: randomBot.y + 4.6,
          z: randomBot.z,
          color: '#38BDF8',
          isCrit: false,
          opacity: 0.95,
        });
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

        // 3D Camera-Relative Movement:
        // Forward vector from camera towards player on ground plane
        const camForwardX = -Math.sin(this.cameraYaw);
        const camForwardZ = -Math.cos(this.cameraYaw);
        // Right vector perpendicular to forward vector
        const camRightX = Math.cos(this.cameraYaw);
        const camRightZ = -Math.sin(this.cameraYaw);

        const moveForward = -this.inputVector.z;
        const moveRight = this.inputVector.x;

        const worldDirX = camRightX * moveRight + camForwardX * moveForward;
        const worldDirZ = camRightZ * moveRight + camForwardZ * moveForward;

        const targetMoveX = worldDirX * speed;
        const targetMoveZ = worldDirZ * speed;

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

        // Vertical jump & gravity physics (High heroic leap to dodge attacks)
        if (this.playerFighter.y > 0 || (this.playerFighter.jumpVelocityY && this.playerFighter.jumpVelocityY !== 0)) {
          const gravity = 36;
          this.playerFighter.jumpVelocityY = (this.playerFighter.jumpVelocityY || 0) - gravity * dt;
          this.playerFighter.y = Math.max(0, this.playerFighter.y + this.playerFighter.jumpVelocityY * dt);

          // Agile mid-air steering (air control) while leaping over attacks
          if (Math.hypot(worldDirX, worldDirZ) > 0.05) {
            this.playerFighter.x += worldDirX * speed * 0.85 * dt;
            this.playerFighter.z += worldDirZ * speed * 0.85 * dt;
          }

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

        // Rotate player to facing direction (movement direction, or camera forward)
        if (Math.hypot(worldDirX, worldDirZ) > 0.05) {
          this.playerFighter.rotation = Math.atan2(worldDirX, worldDirZ);
        }

        // Smooth Elastic Boundary Containment: securely keeps player inside the beautiful perimeter
        const distFromCenter = Math.sqrt(this.playerFighter.x ** 2 + this.playerFighter.z ** 2);
        const maxBoundaryDist = this.arenaRadius - 2.8;
        if (distFromCenter > maxBoundaryDist) {
          const factor = maxBoundaryDist / distFromCenter;
          this.playerFighter.x *= factor;
          this.playerFighter.z *= factor;
        }

        // Actions: Attack - crisp base cooldown compressed by Forge Energon Overdrive
        if (this.isAttackPressed && this.playerFighter.attackCooldown <= 0) {
          // If standing still when attacking, face the camera look direction
          if (Math.hypot(worldDirX, worldDirZ) <= 0.05) {
            this.playerFighter.rotation = Math.atan2(camForwardX, camForwardZ);
          }
          this.executeAttack(this.playerFighter);
          const baseAttackInterval = isBerserk ? 0.18 : 0.28;
          this.playerFighter.attackCooldown = Math.max(0.08, baseAttackInterval / this.forgeBonuses.fireRateMultiplier);
        }

        // Actions: Special Ability / Skill (Activated by pressing X or clicking HUD button)
        if (this.isAbilityPressed) {
          if (this.playerFighter.abilityCooldown <= 0) {
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
              const baseCd = this.playerFighter.creature.specialAbility?.cooldown || 6.0;
              this.playerFighter.abilityCooldown = baseCd * this.forgeBonuses.specialCdFactor;
            }
          } else if (!this.lastAbilityWasPressed && Date.now() - this.lastAbilityWarningTime > 800) {
            this.lastAbilityWarningTime = Date.now();
            this.damageFloaters.push({
              id: `floater-cd-${Date.now()}`,
              text: `⚡ RECHARGING (${Math.ceil(this.playerFighter.abilityCooldown)}s)`,
              x: this.playerFighter.x,
              y: 3.5,
              z: this.playerFighter.z,
              color: '#FBBF24',
              isCrit: false,
              opacity: 1.0,
            });
          }
        }
        this.lastAbilityWasPressed = this.isAbilityPressed;

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

      // Hit reaction timer (auto-clears isHit so mechs never vibrate continuously)
      if (f.hitTimer && f.hitTimer > 0) {
        f.hitTimer -= dt;
        if (f.hitTimer <= 0) {
          f.isHit = false;
        }
      } else {
        f.isHit = false;
      }

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

    // 6b. Fighter-Fighter Soft Collision Separation (prevents mechs from overlapping and oscillating/vibrating)
    for (let i = 0; i < this.fighters.length; i++) {
      const f1 = this.fighters[i];
      if (f1.isDead) continue;
      for (let j = i + 1; j < this.fighters.length; j++) {
        const f2 = this.fighters[j];
        if (f2.isDead) continue;
        const dx = f2.x - f1.x;
        const dz = f2.z - f1.z;
        const distSq = dx * dx + dz * dz;
        const minDistance = 2.4;
        if (distSq < minDistance * minDistance) {
          const dist = Math.sqrt(distSq);
          const safeDist = dist < 0.001 ? 0.001 : dist;
          const overlap = minDistance - safeDist;
          const nx = dist < 0.001 ? 1 : dx / safeDist;
          const nz = dist < 0.001 ? 0 : dz / safeDist;
          const push = overlap * 0.5;
          f1.x -= nx * push;
          f1.z -= nz * push;
          f2.x += nx * push;
          f2.z += nz * push;
        }
      }
    }

    // 6c. Nature Flora Update & Tree Solid Cover Collisions
    if (this.floraSystem) {
      this.floraSystem.update(dt, time);

      // Enforce physical obstacle collision with solid tree trunks
      for (const fighter of this.fighters) {
        if (fighter.isDead) continue;
        for (const tree of this.floraSystem.trees) {
          const dx = fighter.x - tree.x;
          const dz = fighter.z - tree.z;
          const dist = Math.hypot(dx, dz);
          if (dist < tree.collisionRadius) {
            const safeDist = dist < 0.001 ? 0.001 : dist;
            const push = tree.collisionRadius - safeDist;
            fighter.x += (dx / safeDist) * push;
            fighter.z += (dz / safeDist) * push;
          }
        }
      }

      // 6d. Tactical Hiding in Foliage Bushes
      let playerInBush = false;
      for (const fighter of this.fighters) {
        if (fighter.isDead) continue;
        let insideBush = false;
        for (const bush of this.floraSystem.bushes) {
          const d = Math.hypot(fighter.x - bush.x, fighter.z - bush.z);
          if (d < bush.radius) {
            insideBush = true;
            break;
          }
        }

        if (insideBush) {
          fighter.stealthDuration = Math.max(fighter.stealthDuration || 0, 0.4);
          fighter.isStealthed = true;
          if (fighter.isPlayer) {
            playerInBush = true;
          }
        }
      }

      this.isPlayerHidingInBush = playerInBush;
      if (playerInBush && !this.wasPlayerHidingInBush) {
        this.combatLogs.push('🌿 Camouflaged in Bush: Hidden from enemies! (Next hit deals 2.5x Stealth Crit)');
        this.damageFloaters.push({
          id: `bush-stealth-${Date.now()}`,
          text: '🌿 BUSH CAMOUFLAGE',
          x: this.playerFighter.x,
          y: this.playerFighter.y + 3.0,
          z: this.playerFighter.z,
          color: '#4ade80',
          isCrit: true,
          opacity: 1.0,
        });
      }
      this.wasPlayerHidingInBush = playerInBush;

      // Modulate player model visual opacity when hidden in bush
      const playerModel = this.fighterModels.get('player');
      if (playerModel) {
        const targetOpacity = playerInBush ? 0.55 : 1.0;
        playerModel.root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => {
              if (m) {
                m.transparent = playerInBush;
                m.opacity = targetOpacity;
              }
            });
          }
        });
      }
    }

    // 7. Update 3D Visual Models & Overhead HP Bars
    this.fighters.forEach((fighter) => {
      const model = this.fighterModels.get(fighter.id);
      const hpBar = this.fighterHpBars.get(fighter.id);

      // Defeated robots MUST disappear from the stage completely
      if (fighter.isDead) {
        if (model) {
          model.root.visible = false;
          if (model.root.parent) {
            model.root.parent.remove(model.root);
          }
        }
        if (hpBar) {
          hpBar.visible = false;
          if (hpBar.parent) {
            hpBar.parent.remove(hpBar);
          }
        }
        return;
      }

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

    // 8. Snappy Third-Person Camera Follow with 360° Free Look
    if (!this.playerFighter.isDead) {
      const isPortrait = this.camera.aspect < 1.0;
      const baseDist = isPortrait ? 22 : 18;
      const hDist = baseDist * Math.cos(this.cameraPitch);
      const vDist = baseDist * Math.sin(this.cameraPitch);

      const targetCamX = this.playerFighter.x + Math.sin(this.cameraYaw) * hDist;
      const targetCamZ = this.playerFighter.z + Math.cos(this.cameraYaw) * hDist;
      const targetCamY = Math.max(2.5, this.playerFighter.y + vDist);

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.18;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.18;
      this.camera.position.y += (targetCamY - this.camera.position.y) * 0.18;
      this.camera.lookAt(this.playerFighter.x, this.playerFighter.y + 2.0, this.playerFighter.z);
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
        playerWeaponType: getCreatureWeaponType(this.playerFighter.creature),
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
        friendCombatantsCount: this.friendCombatantsCount,
        friendNames: this.friendNames,
        // Adaptive Gemini Combat Director
        tacticalPolicy: this.currentTacticalPolicy,
        recentAdaptationEvent: this.recentAdaptationEvent,
        observationMetrics: this.combatObserver.getMetrics(),
        tacticalAdaptationHistory: this.tacticalAdaptationHistory,
        // Permanent Forge Upgrades Combat System
        forgeBonuses: this.forgeBonuses,
        // Natural Biome & Tactical Foliage
        isHidingInBush: this.isPlayerHidingInBush,
        radarBushes: this.floraSystem?.bushes.map((b) => ({
          x: b.x,
          z: b.z,
          radius: b.radius,
        })),
        radarTrees: this.floraSystem?.trees.map((t) => ({
          x: t.x,
          z: t.z,
        })),
        gameMode: this.gameMode,
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

    // Find target based on game mode:
    // - Easy: NPCs go easy on player (bots fight each other, wander, disengage when far, slower attack cadence, relaxed speed)
    // - Moderate: Few NPCs target player (at most 1-2 bots at a time), other bots duel each other in balanced skirmishes
    // - Hard: All NPCs relentlessly hunt and try to kill the player
    let closestTarget: ActiveFighter | null = null;
    let minDist = 999;

    const aliveOtherBots = this.fighters.filter(
      (other) => !other.isPlayer && !other.isDead && other.id !== fighter.id
    );
    const isPlayerAlive = this.playerFighter && !this.playerFighter.isDead;
    const distToPlayer = isPlayerAlive
      ? Math.hypot(this.playerFighter.x - fighter.x, this.playerFighter.z - fighter.z)
      : 9999;

    if (this.gameMode === 'hard') {
      // HARD MODE: All NPCs relentlessly hunt and swarm the player!
      if (isPlayerAlive) {
        closestTarget = this.playerFighter;
        minDist = distToPlayer;
      } else {
        aliveOtherBots.forEach((other) => {
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
      }
    } else if (this.gameMode === 'moderate') {
      // MODERATE MODE: Only a few NPCs target player (max 2 bots at once), remaining bots duel each other!
      const sortedByProximityToPlayer = [...aliveOtherBots, fighter].sort((a, b) => {
        const da = Math.hypot(this.playerFighter.x - a.x, this.playerFighter.z - a.z);
        const db = Math.hypot(this.playerFighter.x - b.x, this.playerFighter.z - b.z);
        return da - db;
      });

      const isOneOfFewTargetingPlayer =
        sortedByProximityToPlayer.slice(0, 2).some((b) => b.id === fighter.id);

      if (isPlayerAlive && (isOneOfFewTargetingPlayer || aliveOtherBots.length === 0)) {
        closestTarget = this.playerFighter;
        minDist = distToPlayer;
      } else {
        // Target closest other AI bot
        aliveOtherBots.forEach((other) => {
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
      }
    } else {
      // EASY MODE: NPCs go easy on player
      // Bots prioritize fighting each other. Only target player if no other bots remain or player is within close melee range (< 4.5 units)
      if (aliveOtherBots.length > 0) {
        aliveOtherBots.forEach((other) => {
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

        // Only lightly engage player if player steps within 4.5 units and no other bot is nearby
        if (isPlayerAlive && distToPlayer < 4.5 && (!closestTarget || minDist > 12)) {
          closestTarget = this.playerFighter;
          minDist = distToPlayer;
        }
      } else if (isPlayerAlive) {
        closestTarget = this.playerFighter;
        minDist = distToPlayer;
      }
    }

    if (closestTarget) {
      const target = closestTarget as ActiveFighter;
      const angleToTarget = Math.atan2(target.x - fighter.x, target.z - fighter.z);

      // Smooth angular turning rather than instant snapping to prevent rotation jitter
      let angleDiff = angleToTarget - fighter.rotation;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      fighter.rotation += angleDiff * Math.min(1, 14 * dt);

      const isBerserk = !!(fighter.berserkDuration && fighter.berserkDuration > 0);
      const dna = fighter.combatDna || fighter.creature.combatDna;
      const mobilityMod = 0.80 + (dna?.mobility ?? 0.5) * 0.40;
      let speed = fighter.creature.stats.speed * 0.45 * (isBerserk ? 1.4 : 1.0) * mobilityMod;

      const policy = this.currentTacticalPolicy;
      const isTargetingPlayer = target.isPlayer;

      // Mode-based NPC movement scaling:
      if (isTargetingPlayer) {
        if (this.gameMode === 'easy') {
          speed *= 0.65; // Easy: Bot moves casually and gently
        } else if (this.gameMode === 'hard') {
          speed *= 1.22; // Hard: Relentless fast hunt sprint!
        }
      }

      // Easy Mode: If bot is targeting player but player moved > 7.5 units away, bot breaks off pursuit!
      if (this.gameMode === 'easy' && isTargetingPlayer && distToPlayer > 7.5 && aliveOtherBots.length > 0) {
        const wanderAngle = fighter.rotation + Math.PI * 0.8 + (Math.random() - 0.5) * 0.6;
        fighter.x += Math.sin(wanderAngle) * speed * 0.5 * dt;
        fighter.z += Math.cos(wanderAngle) * speed * 0.5 * dt;
        fighter.rotation = wanderAngle;
        return;
      }

      // When targeting player, apply Tactical Policy parameters
      const preferredRange = (isTargetingPlayer && policy) ? policy.preferredRange : 3.5;
      const cadenceMod = (isTargetingPlayer && policy) ? policy.attackCadenceMultiplier : 1.0;
      const dashChance = (isTargetingPlayer && policy) ? policy.dodgeDashProbability : 0.25;

      if (isTargetingPlayer && policy) {
        if (policy.strategy === 'AGGRESSIVE_RUSH') {
          speed *= 1.25;
        } else if (policy.strategy === 'DEFENSIVE') {
          speed *= 0.90;
        }
      }

      // Movement behavior:
      // A. Critical HP retreat (unless Berserk, AGGRESSIVE_RUSH, or Hard mode where bots fight to the death)
      if (fighter.currentHp < fighter.maxHp * 0.20 && minDist < 10 && !isBerserk && this.gameMode !== 'hard' && (!policy || policy.strategy !== 'AGGRESSIVE_RUSH')) {
        fighter.x -= Math.sin(angleToTarget) * speed * dt;
        fighter.z -= Math.cos(angleToTarget) * speed * dt;
      } 
      // B. Close distance if beyond preferred range
      else if (minDist > preferredRange + 1.2) {
        fighter.x += Math.sin(angleToTarget) * speed * dt;
        fighter.z += Math.cos(angleToTarget) * speed * dt;

        // AGGRESSIVE_RUSH or Hard Mode: rapid dash forward to close gap!
        const rushDashChance = this.gameMode === 'hard' ? 0.35 : dashChance;
        if (isTargetingPlayer && (policy?.strategy === 'AGGRESSIVE_RUSH' || this.gameMode === 'hard') && minDist > 5.5 && fighter.dashCooldown <= 0 && Math.random() < rushDashChance * dt * 2.5) {
          fighter.x += Math.sin(angleToTarget) * 4.2;
          fighter.z += Math.cos(angleToTarget) * 4.2;
          fighter.dashCooldown = this.gameMode === 'hard' ? 1.6 : 2.4;
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
      else if (minDist < preferredRange - 1.2 && this.gameMode !== 'hard') {
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
        let cdMultiplier = cadenceMod * (isBerserk ? 0.75 : 1.0);
        if (isTargetingPlayer) {
          if (this.gameMode === 'easy') {
            cdMultiplier *= 1.85; // Easy: Bot attacks player much less often
          } else if (this.gameMode === 'hard') {
            cdMultiplier *= 0.65; // Hard: Relentless rapid attack frequency
          }
        }
        fighter.attackCooldown = (1.3 + Math.random() * 0.7) * cdMultiplier;
      }

      // Special Ability when ready (cannot cast if silenced)
      const isSilenced = !!(fighter.silenceDuration && fighter.silenceDuration > 0);
      const specialRange = (isTargetingPlayer && policy?.strategy === 'SPECIAL_ABILITY_FOCUS') ? 14 : 12;
      if (minDist < specialRange && fighter.abilityCooldown <= 0 && !isSilenced) {
        if (isTargetingPlayer && this.gameMode === 'easy' && Math.random() > 0.40) {
          // Easy: often spares player from devastating ability attacks
        } else {
          this.executeSpecialAbility(fighter);
        }
        const abilityCdFactor = (isTargetingPlayer && policy?.strategy === 'SPECIAL_ABILITY_FOCUS') ? 0.75 : 1.0;
        let modeAbilityCd = (fighter.creature.specialAbility.cooldown + Math.random() * 2.5) * abilityCdFactor;
        if (isTargetingPlayer && this.gameMode === 'easy') modeAbilityCd *= 1.6;
        if (isTargetingPlayer && this.gameMode === 'hard') modeAbilityCd *= 0.75;
        fighter.abilityCooldown = modeAbilityCd;
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

  // Attack Execution: Archetype-Specific Weapon Attacks (Swords, Flamethrower, Double Guns, Mage, Fighter, Archer, Magic Fist, Electric Stun Gun, Launcher, Disk Thrower, Laser Gun)
  public executeAttack(fighter: ActiveFighter) {
    fighter.isAttacking = true;
    setTimeout(() => {
      fighter.isAttacking = false;
    }, 180);

    const baseMult = fighter.isPlayer ? 0.90 : 0.40;
    const effectiveAtk = fighter.isPlayer
      ? (fighter.creature.stats.attack + (this.forgeBonuses.damageAdd || 0))
      : fighter.creature.stats.attack;
    let bulletDamage = Math.round(effectiveAtk * baseMult);

    const weaponType = getCreatureWeaponType(fighter.creature);
    const color = fighter.creature.visualParams.glowColor;
    const rot = fighter.rotation;

    if (weaponType === 'swords') {
      // Swordsman: Crescent Energon Arc Slash with forward strike impulse
      const lunge = 0.3;
      const targetX = fighter.x + Math.sin(rot) * lunge;
      const targetZ = fighter.z + Math.cos(rot) * lunge;
      const distFromCenter = Math.hypot(targetX, targetZ);
      if (distFromCenter < this.arenaRadius - 2.8) {
        fighter.x = targetX;
        fighter.z = targetZ;
      }
      const speed = 34;
      const radius = 1.35;
      const proj: AttackProjectile = {
        id: `proj-sword-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(16, Math.round(bulletDamage * 1.35)),
        color,
        radius,
        element: fighter.creature.element,
        lifetime: 0.6,
        weaponType: 'swords',
        isPiercing: true,
        pierceCount: 3,
      };
      const mesh = createWeaponProjectileMesh('swords', color, radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'flamethrower') {
      // Flame Thrower: 3 expanding fiery plasma jets with burning damage
      const spreadAngles = [-0.18, 0, 0.18];
      spreadAngles.forEach((angleOffset, idx) => {
        const spreadRot = rot + angleOffset;
        const speed = 24 + idx * 2;
        const radius = 0.65;
        const proj: AttackProjectile = {
          id: `proj-flame-${Date.now()}-${Math.random()}-${idx}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(rot) * 1.4,
          y: fighter.y + 1.7,
          z: fighter.z + Math.cos(rot) * 1.4,
          vx: Math.sin(spreadRot) * speed,
          vz: Math.cos(spreadRot) * speed,
          damage: Math.max(8, Math.round(bulletDamage * 0.45)),
          color: '#f97316',
          radius,
          element: 'fire',
          lifetime: 0.85,
          weaponType: 'flamethrower',
          burnDuration: 2.2,
        };
        const mesh = createWeaponProjectileMesh('flamethrower', '#f97316', radius, spreadRot);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);
      });
    } else if (weaponType === 'double_guns') {
      // Double Guns: Rapid dual laser blaster bolts
      const speed = 46;
      const radius = 0.35;
      const rightX = fighter.x + Math.sin(rot) * 1.5 + Math.cos(rot) * 0.55;
      const rightZ = fighter.z + Math.cos(rot) * 1.5 - Math.sin(rot) * 0.55;
      const projRight: AttackProjectile = {
        id: `proj-gun1-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: rightX,
        y: fighter.y + 1.8,
        z: rightZ,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(10, Math.round(bulletDamage * 0.65)),
        color,
        radius,
        element: fighter.creature.element,
        lifetime: 1.1,
        weaponType: 'double_guns',
      };
      const meshR = createWeaponProjectileMesh('double_guns', color, radius, rot);
      meshR.position.set(projRight.x, projRight.y, projRight.z);
      this.scene.add(meshR);
      this.projectiles.push(projRight);
      this.projectileMeshes.set(projRight.id, meshR);

      // Left gun second shot delayed slightly
      setTimeout(() => {
        if (fighter.isDead) return;
        const leftX = fighter.x + Math.sin(fighter.rotation) * 1.5 - Math.cos(fighter.rotation) * 0.55;
        const leftZ = fighter.z + Math.cos(fighter.rotation) * 1.5 + Math.sin(fighter.rotation) * 0.55;
        const projLeft: AttackProjectile = {
          id: `proj-gun2-${Date.now()}-${Math.random()}`,
          ownerId: fighter.id,
          x: leftX,
          y: fighter.y + 1.8,
          z: leftZ,
          vx: Math.sin(fighter.rotation) * speed,
          vz: Math.cos(fighter.rotation) * speed,
          damage: Math.max(10, Math.round(bulletDamage * 0.65)),
          color,
          radius,
          element: fighter.creature.element,
          lifetime: 1.1,
          weaponType: 'double_guns',
        };
        const meshL = createWeaponProjectileMesh('double_guns', color, radius, fighter.rotation);
        meshL.position.set(projLeft.x, projLeft.y, projLeft.z);
        this.scene.add(meshL);
        this.projectiles.push(projLeft);
        this.projectileMeshes.set(projLeft.id, meshL);
      }, 75);
    } else if (weaponType === 'mage_spell') {
      // Mage: Astral high-speed straight spell orb (fires straight along attack vector, no chasing)
      const speed = 36;
      const radius = 0.75;
      const proj: AttackProjectile = {
        id: `proj-mage-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.5,
        y: fighter.y + 1.9,
        z: fighter.z + Math.cos(rot) * 1.5,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(15, Math.round(bulletDamage * 1.15)),
        color: '#a855f7',
        radius,
        element: 'electric',
        lifetime: 1.4,
        weaponType: 'mage_spell',
        isHoming: false,
      };
      const mesh = createWeaponProjectileMesh('mage_spell', '#a855f7', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'fighter') {
      // Fighter: Kinetic hydraulic power punch shockwave with forward rush
      fighter.x += Math.sin(rot) * 1.1;
      fighter.z += Math.cos(rot) * 1.1;
      const speed = 36;
      const radius = 0.85;
      const proj: AttackProjectile = {
        id: `proj-punch-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(16, Math.round(bulletDamage * 1.25)),
        color: '#eab308',
        radius,
        element: 'rock',
        lifetime: 0.55,
        weaponType: 'fighter',
        knockbackForce: 4.5,
      };
      const mesh = createWeaponProjectileMesh('fighter', '#eab308', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'archer_bow') {
      // Archer: High-speed photon piercing arrow
      const speed = 64;
      const radius = 0.4;
      const proj: AttackProjectile = {
        id: `proj-arrow-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(14, Math.round(bulletDamage * 1.2)),
        color: '#22c55e',
        radius,
        element: fighter.creature.element,
        lifetime: 1.3,
        weaponType: 'archer_bow',
        isPiercing: true,
        pierceCount: 2,
      };
      const mesh = createWeaponProjectileMesh('archer_bow', '#22c55e', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'magic_fist') {
      // Magic Fist: Heavy spectral rocket fist projectile
      const speed = 32;
      const radius = 0.95;
      const proj: AttackProjectile = {
        id: `proj-fist-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(16, Math.round(bulletDamage * 1.3)),
        color: '#f59e0b',
        radius,
        element: fighter.creature.element,
        lifetime: 1.0,
        weaponType: 'magic_fist',
        knockbackForce: 5.5,
      };
      const mesh = createWeaponProjectileMesh('magic_fist', '#f59e0b', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'electric_stun_gun') {
      // Electric Stun Gun: High-voltage crackling spark bolt with stun
      const speed = 42;
      const radius = 0.55;
      const proj: AttackProjectile = {
        id: `proj-stun-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.5,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.5,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(12, Math.round(bulletDamage * 0.95)),
        color: '#facc15',
        radius,
        element: 'electric',
        lifetime: 1.1,
        weaponType: 'electric_stun_gun',
        stunDuration: 1.0,
      };
      const mesh = createWeaponProjectileMesh('electric_stun_gun', '#facc15', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'launcher') {
      // Launcher: Explosive rocket missile with AoE explosion radius
      const speed = 30;
      const radius = 0.7;
      const proj: AttackProjectile = {
        id: `proj-rocket-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(18, Math.round(bulletDamage * 1.25)),
        color: '#ef4444',
        radius,
        element: 'fire',
        lifetime: 1.3,
        weaponType: 'launcher',
        aoeRadius: 4.2,
      };
      const mesh = createWeaponProjectileMesh('launcher', '#ef4444', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'disk_thrower') {
      // Disk Thrower: Spinning razor plasma chakram with ricochet bounce
      const speed = 36;
      const radius = 0.75;
      const proj: AttackProjectile = {
        id: `proj-disk-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.5,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.5,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(12, Math.round(bulletDamage * 0.85)),
        color: '#06b6d4',
        radius,
        element: 'ice',
        lifetime: 1.8,
        weaponType: 'disk_thrower',
        ricochetCount: 3,
        spinSpeed: 25,
      };
      const mesh = createWeaponProjectileMesh('disk_thrower', '#06b6d4', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else if (weaponType === 'laser_gun') {
      // Laser Gun: Long continuous piercing rail-beam rod
      const speed = 80;
      const radius = 0.45;
      const proj: AttackProjectile = {
        id: `proj-laser-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.6,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.6,
        vx: Math.sin(rot) * speed,
        vz: Math.cos(rot) * speed,
        damage: Math.max(14, Math.round(bulletDamage * 1.1)),
        color: '#6366f1',
        radius,
        element: fighter.creature.element,
        lifetime: 0.9,
        weaponType: 'laser_gun',
        isPiercing: true,
        pierceCount: 4,
      };
      const mesh = createWeaponProjectileMesh('laser_gun', '#6366f1', radius, rot);
      mesh.position.set(proj.x, proj.y, proj.z);
      this.scene.add(mesh);
      this.projectiles.push(proj);
      this.projectileMeshes.set(proj.id, mesh);
    } else {
      // Fallback: Standard plasma blaster bullet
      const speed = 28;
      const vx = Math.sin(rot) * speed;
      const vz = Math.cos(rot) * speed;
      const proj: AttackProjectile = {
        id: `proj-${Date.now()}-${Math.random()}`,
        ownerId: fighter.id,
        x: fighter.x + Math.sin(rot) * 1.5,
        y: fighter.y + 1.8,
        z: fighter.z + Math.cos(rot) * 1.5,
        vx,
        vz,
        damage: Math.max(12, bulletDamage),
        color,
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
    }

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
    const effectiveSpecial = fighter.isPlayer
      ? ((ability.damage || 180) + (this.forgeBonuses.specialAdd || 0))
      : (ability.damage || 180);
    const baseDamage = Math.round(effectiveSpecial);
    const abilityColor = fighter.creature.visualParams.glowColor || '#2BE29E';

    // Intelligently resolve unique special ability effect for every robot:
    let resolvedEffect = ability.effectType || '';
    if (!resolvedEffect || resolvedEffect === 'generic') {
      const nameLower = (ability.name || '').toLowerCase();
      const vfx = ability.vfxType || '';

      if (nameLower.includes('supercharger') || nameLower.includes('cataclysmic') || nameLower.includes('nova') || nameLower.includes('v8')) {
        resolvedEffect = 'supercharger_nova';
      } else if (nameLower.includes('matrix') || nameLower.includes('bastion') || nameLower.includes('shield')) {
        resolvedEffect = 'buff_shield';
      } else if (nameLower.includes('stinger') || nameLower.includes('warp') || nameLower.includes('lightning') || nameLower.includes('flash') || nameLower.includes('arc')) {
        resolvedEffect = 'stun_chain';
      } else if (nameLower.includes('singularity') || nameLower.includes('vortex') || nameLower.includes('black hole') || nameLower.includes('dark sing')) {
        resolvedEffect = 'gravity_pull';
      } else if (nameLower.includes('airstrike') || nameLower.includes('barrage') || nameLower.includes('missile')) {
        resolvedEffect = 'homing_barrage';
      } else if (nameLower.includes('disrupt') || nameLower.includes('sonic') || nameLower.includes('soundwave') || nameLower.includes('subwoofer')) {
        resolvedEffect = 'weapon_disrupt';
      } else if (nameLower.includes('mortar') || nameLower.includes('artillery') || nameLower.includes('battery')) {
        resolvedEffect = 'artillery_cluster';
      } else if (nameLower.includes('railgun') || nameLower.includes('beam') || nameLower.includes('ray') || nameLower.includes('lance')) {
        resolvedEffect = 'piercing_beam';
      } else if (nameLower.includes('berserk') || nameLower.includes('frenzy') || nameLower.includes('rage')) {
        resolvedEffect = 'berserk_frenzy';
      } else if (nameLower.includes('shred') || nameLower.includes('particle') || nameLower.includes('cyclops')) {
        resolvedEffect = 'armor_shred';
      } else if (nameLower.includes('ram') || nameLower.includes('emp') || nameLower.includes('surge')) {
        resolvedEffect = 'ram_emp';
      } else if (nameLower.includes('cyclone') || nameLower.includes('turbine') || nameLower.includes('twister') || nameLower.includes('storm')) {
        resolvedEffect = 'vortex_lift';
      } else if (nameLower.includes('siege') || nameLower.includes('cannonade')) {
        resolvedEffect = 'siege_crush';
      } else if (nameLower.includes('stealth') || nameLower.includes('decoy') || nameLower.includes('cloak')) {
        resolvedEffect = 'stealth_crit';
      } else if (nameLower.includes('spike') || nameLower.includes('thorn') || nameLower.includes('canopy')) {
        resolvedEffect = 'spikes';
      } else if (vfx && (vfx as string) !== 'generic' && vfx !== 'nova') {
        resolvedEffect = vfx;
      } else if (fighter.creature.weaponType) {
        resolvedEffect = fighter.creature.weaponType;
      } else {
        resolvedEffect = 'supercharger_nova';
      }
    }

    // Trigger ability casting sound and record observer
    if (fighter.isPlayer) {
      sound.playBonus();
      this.combatObserver.recordPlayerSpecialAbility();
    }

    switch (resolvedEffect) {
      case 'damage_burst':
      case 'supercharger_nova':
      case 'nova': {
        // Colossal V8 Muscle Car Engine: Cataclysmic Supercharger Nova!
        const radius = 16;
        // Adrenaline supercharge repairs caster +70 HP
        fighter.currentHp = Math.min(fighter.maxHp, fighter.currentHp + 70);

        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            // High aerial leap dodges ground nova blast!
            if (target.y > 1.6) {
              if (target.isPlayer) {
                this.damageFloaters.push({
                  id: `floater-leap-dodge-${Date.now()}`,
                  text: '💨 LEAPED OVER SUPERCHARGER NOVA!',
                  x: target.x,
                  y: target.y + 2.6,
                  z: target.z,
                  color: '#38BDF8',
                  isCrit: true,
                  opacity: 1.0,
                });
              }
              return;
            }

            const falloff = Math.max(0.45, 1 - (d / radius) * 0.45);
            const dmg = Math.round(baseDamage * falloff);
            this.damageFighter(target, dmg, fighter.creature.name, true, 'fire');
            target.burnDuration = 3.5;

            // Colossal Radial Knockback
            const angle = Math.atan2(target.x - fighter.x, target.z - fighter.z);
            const impulse = Math.max(5.0, (16 - d) * 0.8);
            target.x += Math.sin(angle) * impulse;
            target.z += Math.cos(angle) * impulse;
          }
        });

        // Triple expanding supercharger flame rings & particle explosion
        const fireColors = [0xff4500, 0xffa500, 0xef4444];
        fireColors.forEach((col, i) => {
          const ringGeo = new THREE.RingGeometry(0.8, 2.0 + i * 0.8, 32);
          ringGeo.rotateX(-Math.PI / 2);
          const ringMat = new THREE.MeshBasicMaterial({
            color: col,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.9,
          });
          const ringMesh = new THREE.Mesh(ringGeo, ringMat);
          ringMesh.position.set(fighter.x, 0.2 + i * 0.2, fighter.z);
          this.scene.add(ringMesh);

          let scale = 1.0;
          const anim = setInterval(() => {
            scale += 1.4;
            ringMesh.scale.set(scale, scale, scale);
            ringMat.opacity -= 0.08;
            if (ringMat.opacity <= 0 || scale > 14) {
              clearInterval(anim);
              this.scene.remove(ringMesh);
              ringGeo.dispose();
              ringMat.dispose();
            }
          }, 20);
        });

        this.damageFloaters.push({
          id: `floater-supercharger-${Date.now()}`,
          text: `💥 ${ability.name ? ability.name.toUpperCase() : 'SUPERCHARGER NOVA!'}`,
          x: fighter.x,
          y: 4.8,
          z: fighter.z,
          color: '#F97316',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'spikes':
      case 'thornstorm': {
        // Nature / Botanical Mechs: Petrified Thornstorm Canopy Eruption
        const spikeRadius = 14;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= spikeRadius) {
            if (target.y > 1.5) {
              if (target.isPlayer) {
                this.damageFloaters.push({
                  id: `floater-leap-thorn-${Date.now()}`,
                  text: '💨 LEAPED OVER THORNSTORM!',
                  x: target.x,
                  y: target.y + 2.6,
                  z: target.z,
                  color: '#38BDF8',
                  isCrit: true,
                  opacity: 1.0,
                });
              }
              return;
            }
            const dmg = Math.round(baseDamage * 0.95);
            this.damageFighter(target, dmg, fighter.creature.name, true, 'nature');
            target.isStunned = true;
            target.stunDuration = 2.0;
          }
        });

        // 12 Petrified Jade/Emerald Thorns erupting upwards
        const spikeCount = 12;
        const spikeGroup = new THREE.Group();
        for (let s = 0; s < spikeCount; s++) {
          const sAngle = (s * Math.PI * 2) / spikeCount;
          const sDist = 4.0 + (s % 3) * 3.0;
          const coneGeo = new THREE.ConeGeometry(0.7, 4.5, 6);
          const coneMat = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            emissive: 0x15803d,
            roughness: 0.3,
          });
          const cone = new THREE.Mesh(coneGeo, coneMat);
          cone.position.set(Math.sin(sAngle) * sDist, 2.2, Math.cos(sAngle) * sDist);
          spikeGroup.add(cone);
        }
        spikeGroup.position.set(fighter.x, 0, fighter.z);
        this.scene.add(spikeGroup);

        setTimeout(() => {
          let sY = 0;
          const sinkAnim = setInterval(() => {
            sY -= 0.3;
            spikeGroup.position.y = sY;
            if (sY < -4.5) {
              clearInterval(sinkAnim);
              this.scene.remove(spikeGroup);
            }
          }, 25);
        }, 900);

        this.damageFloaters.push({
          id: `floater-spikes-${Date.now()}`,
          text: `🌿 ${ability.name ? ability.name.toUpperCase() : 'THORNSTORM ERUPTION!'}`,
          x: fighter.x,
          y: 4.6,
          z: fighter.z,
          color: '#22C55E',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'buff_shield': {
        // Optimus Prime: Matrix Bastion Shield
        const specialMultiplier = fighter.isPlayer ? this.forgeBonuses.specialMultiplier : 1.0;
        const healAmt = Math.round(75 * specialMultiplier);
        const shieldAmt = Math.round(140 * specialMultiplier);
        // 1. Heal caster
        fighter.currentHp = Math.min(fighter.maxHp, fighter.currentHp + healAmt);
        // 2. Grant Energy Shield
        fighter.shieldHp = shieldAmt;
        fighter.shieldDuration = 6.0;
        this.damageFloaters.push({
          id: `floater-shield-${Date.now()}`,
          text: `MATRIX BASTION (+${shieldAmt} SHIELD)`,
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#38BDF8',
          isCrit: true,
          opacity: 1.0,
        });
        this.damageFloaters.push({
          id: `floater-heal-${Date.now()}`,
          text: `+${healAmt} HP HEAL`,
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

      // Archetype-Specific Special Abilities
      case 'swords':
      case 'whirlwind_tempest': {
        // Swordsman: Whirlwind Blade Tempest
        const waveCount = 6;
        for (let w = 0; w < waveCount; w++) {
          const waveAngle = fighter.rotation + (w * Math.PI * 2) / waveCount;
          const speed = 32;
          const radius = 1.6;
          const proj: AttackProjectile = {
            id: `proj-whirl-${Date.now()}-${w}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(waveAngle) * 1.5,
            y: fighter.y + 1.8,
            z: fighter.z + Math.cos(waveAngle) * 1.5,
            vx: Math.sin(waveAngle) * speed,
            vz: Math.cos(waveAngle) * speed,
            damage: Math.round(baseDamage * 0.75),
            color: abilityColor,
            radius,
            element: fighter.creature.element,
            lifetime: 0.75,
            weaponType: 'swords',
            isPiercing: true,
            pierceCount: 4,
          };
          const mesh = createWeaponProjectileMesh('swords', abilityColor, radius, waveAngle);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        this.damageFloaters.push({
          id: `floater-tempest-${Date.now()}`,
          text: '⚔️ WHIRLWIND BLADE TEMPEST!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#38BDF8',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'flamethrower':
      case 'magma_flamethrower': {
        // Flame Thrower: Inferno Magma Torrent
        const burstCount = 10;
        for (let b = 0; b < burstCount; b++) {
          const spread = (Math.random() - 0.5) * 0.75;
          const flameRot = fighter.rotation + spread;
          const speed = 20 + Math.random() * 12;
          const radius = 0.8;
          const proj: AttackProjectile = {
            id: `proj-inferno-${Date.now()}-${b}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(fighter.rotation) * 1.4,
            y: fighter.y + 1.6,
            z: fighter.z + Math.cos(fighter.rotation) * 1.4,
            vx: Math.sin(flameRot) * speed,
            vz: Math.cos(flameRot) * speed,
            damage: Math.round(baseDamage * 0.35),
            color: '#f97316',
            radius,
            element: 'fire',
            lifetime: 1.1,
            weaponType: 'flamethrower',
            burnDuration: 3.0,
          };
          const mesh = createWeaponProjectileMesh('flamethrower', '#f97316', radius, flameRot);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        this.damageFloaters.push({
          id: `floater-inferno-${Date.now()}`,
          text: '🔥 INFERNO MAGMA TORRENT!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#F97316',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'double_guns':
      case 'bulletstorm': {
        // Double Guns: Bulletstorm Barrage (Rapid 8-bolt dual barrage)
        for (let b = 0; b < 8; b++) {
          setTimeout(() => {
            if (fighter.isDead) return;
            const isLeft = b % 2 === 0;
            const sideOffset = isLeft ? -0.6 : 0.6;
            const curRot = fighter.rotation + (Math.random() - 0.5) * 0.1;
            const speed = 48;
            const radius = 0.4;
            const px = fighter.x + Math.sin(curRot) * 1.6 + Math.cos(curRot) * sideOffset;
            const pz = fighter.z + Math.cos(curRot) * 1.6 - Math.sin(curRot) * sideOffset;
            const proj: AttackProjectile = {
              id: `proj-barrage-${Date.now()}-${b}`,
              ownerId: fighter.id,
              x: px,
              y: fighter.y + 1.8,
              z: pz,
              vx: Math.sin(curRot) * speed,
              vz: Math.cos(curRot) * speed,
              damage: Math.round(baseDamage * 0.45),
              color: abilityColor,
              radius,
              element: fighter.creature.element,
              lifetime: 1.2,
              weaponType: 'double_guns',
            };
            const mesh = createWeaponProjectileMesh('double_guns', abilityColor, radius, curRot);
            mesh.position.set(proj.x, proj.y, proj.z);
            this.scene.add(mesh);
            this.projectiles.push(proj);
            this.projectileMeshes.set(proj.id, mesh);
          }, b * 65);
        }
        this.damageFloaters.push({
          id: `floater-guns-${Date.now()}`,
          text: '🔫 BULLETSTORM BARRAGE!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#38BDF8',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'mage_spell':
      case 'astral_singularity': {
        // Mage: Cosmic Singularity Collapse
        const proj: AttackProjectile = {
          id: `proj-singularity-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(fighter.rotation) * 8.0,
          y: 1.8,
          z: fighter.z + Math.cos(fighter.rotation) * 8.0,
          vx: 0,
          vz: 0,
          damage: baseDamage,
          color: '#a855f7',
          radius: 2.2,
          element: 'electric',
          lifetime: 3.5,
          weaponType: 'mage_spell',
          isSingularity: true,
        };
        const mesh = createWeaponProjectileMesh('mage_spell', '#a855f7', 2.2, fighter.rotation);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-vortex-${Date.now()}`,
          text: '🔮 COSMIC SINGULARITY COLLAPSE!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#A855F7',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'fighter':
      case 'titan_breaker': {
        // Fighter: Titan Breaker Seismic Pummel (Radial shockwave + 2.5s stun)
        const radius = 11;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            this.damageFighter(target, baseDamage, fighter.creature.name, true, 'rock');
            target.stunDuration = 2.5;
            this.applyKnockback(target, fighter.x, fighter.z, 6.0);
          }
        });
        this.damageFloaters.push({
          id: `floater-titan-${Date.now()}`,
          text: '👊 TITAN BREAKER EARTHQUAKE!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#EAB308',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'archer_bow':
      case 'arrow_volley': {
        // Archer: Supersonic Arrow Volley (7 piercing photon arrows)
        for (let a = -3; a <= 3; a++) {
          const arrowRot = fighter.rotation + a * 0.12;
          const speed = 65;
          const radius = 0.45;
          const proj: AttackProjectile = {
            id: `proj-volley-${Date.now()}-${a}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(arrowRot) * 1.6,
            y: fighter.y + 1.8,
            z: fighter.z + Math.cos(arrowRot) * 1.6,
            vx: Math.sin(arrowRot) * speed,
            vz: Math.cos(arrowRot) * speed,
            damage: Math.round(baseDamage * 0.65),
            color: '#22c55e',
            radius,
            element: fighter.creature.element,
            lifetime: 1.5,
            weaponType: 'archer_bow',
            isPiercing: true,
            pierceCount: 3,
          };
          const mesh = createWeaponProjectileMesh('archer_bow', '#22c55e', radius, arrowRot);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        this.damageFloaters.push({
          id: `floater-volley-${Date.now()}`,
          text: '🏹 SUPERSONIC ARROW VOLLEY!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#22C55E',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'magic_fist':
      case 'gigaton_megafist': {
        // Magic Fist: Gigaton Megafist Slam (Massive rocket fist with colossal AoE)
        const speed = 30;
        const radius = 1.4;
        const proj: AttackProjectile = {
          id: `proj-megafist-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(fighter.rotation) * 2.0,
          y: fighter.y + 1.9,
          z: fighter.z + Math.cos(fighter.rotation) * 2.0,
          vx: Math.sin(fighter.rotation) * speed,
          vz: Math.cos(fighter.rotation) * speed,
          damage: baseDamage,
          color: '#f59e0b',
          radius,
          element: fighter.creature.element,
          lifetime: 1.5,
          weaponType: 'magic_fist',
          knockbackForce: 7.0,
          aoeRadius: 6.5,
        };
        const mesh = createWeaponProjectileMesh('magic_fist', '#f59e0b', radius, fighter.rotation);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-fist-${Date.now()}`,
          text: '🥊 GIGATON MEGAFIST SLAM!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#F59E0B',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'electric_stun_gun':
      case 'emp_overload': {
        // Electric Stun Gun: Chain Lightning EMP Overload (360 stun shockwave)
        const radius = 12;
        this.fighters.forEach((target) => {
          if (target.id === fighter.id || target.isDead) return;
          const d = Math.hypot(target.x - fighter.x, target.z - fighter.z);
          if (d <= radius) {
            this.damageFighter(target, baseDamage, fighter.creature.name, true, 'electric');
            target.stunDuration = 2.5;
            this.applyKnockback(target, fighter.x, fighter.z, 4.5);
          }
        });
        this.damageFloaters.push({
          id: `floater-emp-${Date.now()}`,
          text: '⚡ CHAIN LIGHTNING EMP OVERLOAD!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#FACC15',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'launcher':
      case 'cluster_barrage': {
        // Launcher: Cluster Warhead Barrage (4 explosive cluster rockets)
        for (let r = 0; r < 4; r++) {
          const rocketRot = fighter.rotation + (r - 1.5) * 0.25;
          const speed = 28;
          const radius = 0.8;
          const proj: AttackProjectile = {
            id: `proj-cluster-${Date.now()}-${r}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(rocketRot) * 1.8,
            y: fighter.y + 2.0,
            z: fighter.z + Math.cos(rocketRot) * 1.8,
            vx: Math.sin(rocketRot) * speed,
            vz: Math.cos(rocketRot) * speed,
            damage: Math.round(baseDamage * 0.75),
            color: '#ef4444',
            radius,
            element: 'fire',
            lifetime: 1.4,
            weaponType: 'launcher',
            aoeRadius: 4.5,
          };
          const mesh = createWeaponProjectileMesh('launcher', '#ef4444', radius, rocketRot);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        this.damageFloaters.push({
          id: `floater-cluster-${Date.now()}`,
          text: '🚀 CLUSTER WARHEAD BARRAGE!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#EF4444',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'disk_thrower':
      case 'chakram_swarm': {
        // Disk Thrower: Triple Hyper-Chakram Swarm (3 bouncing chakrams)
        for (let d = -1; d <= 1; d++) {
          const diskRot = fighter.rotation + d * 0.28;
          const speed = 36;
          const radius = 0.85;
          const proj: AttackProjectile = {
            id: `proj-chakram-${Date.now()}-${d}`,
            ownerId: fighter.id,
            x: fighter.x + Math.sin(diskRot) * 1.6,
            y: fighter.y + 1.8,
            z: fighter.z + Math.cos(diskRot) * 1.6,
            vx: Math.sin(diskRot) * speed,
            vz: Math.cos(diskRot) * speed,
            damage: Math.round(baseDamage * 0.65),
            color: '#06b6d4',
            radius,
            element: 'ice',
            lifetime: 2.2,
            weaponType: 'disk_thrower',
            ricochetCount: 4,
            spinSpeed: 30,
          };
          const mesh = createWeaponProjectileMesh('disk_thrower', '#06b6d4', radius, diskRot);
          mesh.position.set(proj.x, proj.y, proj.z);
          this.scene.add(mesh);
          this.projectiles.push(proj);
          this.projectileMeshes.set(proj.id, mesh);
        }
        this.damageFloaters.push({
          id: `floater-chakram-${Date.now()}`,
          text: '💿 TRIPLE HYPER-CHAKRAM SWARM!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#06B6D4',
          isCrit: true,
          opacity: 1.0,
        });
        break;
      }

      case 'laser_gun':
      case 'death_ray': {
        // Laser Gun: Orbital Death Ray (Continuous piercing rail-beam)
        const speed = 90;
        const radius = 0.6;
        const proj: AttackProjectile = {
          id: `proj-deathray-${Date.now()}`,
          ownerId: fighter.id,
          x: fighter.x + Math.sin(fighter.rotation) * 2.0,
          y: fighter.y + 1.8,
          z: fighter.z + Math.cos(fighter.rotation) * 2.0,
          vx: Math.sin(fighter.rotation) * speed,
          vz: Math.cos(fighter.rotation) * speed,
          damage: baseDamage,
          color: '#6366f1',
          radius,
          element: fighter.creature.element,
          lifetime: 1.1,
          weaponType: 'laser_gun',
          isPiercing: true,
          pierceCount: 10,
        };
        const mesh = createWeaponProjectileMesh('laser_gun', '#6366f1', radius, fighter.rotation);
        mesh.position.set(proj.x, proj.y, proj.z);
        this.scene.add(mesh);
        this.projectiles.push(proj);
        this.projectileMeshes.set(proj.id, mesh);

        this.damageFloaters.push({
          id: `floater-laser-${Date.now()}`,
          text: '⚡ ORBITAL DEATH RAY!',
          x: fighter.x,
          y: 4.5,
          z: fighter.z,
          color: '#6366F1',
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
    if (fighter.isPlayer) sound.playBonus();
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

  // Jump execution with arcade vertical velocity (High heroic leap to dodge attacks)
  public executeJump(fighter: ActiveFighter) {
    if (fighter.y > 0.1 || fighter.isDead) return;
    fighter.isJumping = true;
    fighter.jumpVelocityY = 24.0; // High athletic leap soaring over rockets, beams, and shockwaves
    if (fighter.isPlayer) {
      this.combatObserver.recordPlayerJump();
    }
    try {
      sound.playJump();
    } catch {}

    // Ground leap pulse ring
    const jumpRingGeo = new THREE.RingGeometry(0.6, 2.2, 32);
    jumpRingGeo.rotateX(-Math.PI / 2);
    const ringColor = fighter.creature.visualParams.glowColor ? new THREE.Color(fighter.creature.visualParams.glowColor) : new THREE.Color(0x38bdf8);
    const jumpRingMat = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const jumpRingMesh = new THREE.Mesh(jumpRingGeo, jumpRingMat);
    jumpRingMesh.position.set(fighter.x, 0.05, fighter.z);
    this.scene.add(jumpRingMesh);
    let scale = 1.0;
    const ringAnim = setInterval(() => {
      scale += 0.35;
      jumpRingMesh.scale.set(scale, scale, scale);
      jumpRingMat.opacity -= 0.12;
      if (jumpRingMat.opacity <= 0) {
        clearInterval(ringAnim);
        this.scene.remove(jumpRingMesh);
        jumpRingGeo.dispose();
        jumpRingMat.dispose();
      }
    }, 25);
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
      let mitigation = 0.45; // 55% base incoming damage mitigation
      if (this.gameMode === 'easy') {
        mitigation *= 0.50; // Easy mode: NPCs go easy on player (50% less damage)
      } else if (this.gameMode === 'hard') {
        mitigation *= 1.25; // Hard mode: NPCs hit harder
      }
      modifiedAmount *= mitigation;
      if (fighter.isAttacking) {
        // Offensive poise / armor bonus: attack without losing health rapidly
        modifiedAmount *= 0.70;
      }
      fighter.timeSinceLastDamage = 0;
      fighter.invulnerabilityTimer = this.gameMode === 'easy' ? 0.70 : 0.50;
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
    fighter.hitTimer = 0.16; // Solid, transient 160ms hit flinch that clears automatically

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

    // Immediately remove model from 3D stage
    const model = this.fighterModels.get(victim.id);
    if (model) {
      model.root.visible = false;
      if (model.root.parent) {
        model.root.parent.remove(model.root);
      }
      this.scene.remove(model.root);
      try {
        model.dispose?.();
      } catch {
        // Ignore disposal errors
      }
    }

    // Immediately remove overhead HP bar from 3D stage
    const hpBar = this.fighterHpBars.get(victim.id);
    if (hpBar) {
      hpBar.visible = false;
      if (hpBar.parent) {
        hpBar.parent.remove(hpBar);
      }
      this.scene.remove(hpBar);
    }

    // Award kill to killer
    const killer = this.fighters.find((f) => f.creature.name === killerName);
    if (killer) {
      killer.kills += 1;
      killer.level += 1;
      killer.currentHp = Math.min(killer.maxHp, killer.currentHp + 100); // Heal on kill
    }

    // Spectacular Disintegration & Vaporization VFX
    this.createDefeatDisintegrationVfx(
      victim.x,
      victim.y,
      victim.z,
      victim.creature.visualParams?.glowColor || '#00E5FF'
    );

    this.damageFloaters.push({
      id: `floater-elim-${Date.now()}-${Math.random()}`,
      text: '💥 VAPORIZED & ELIMINATED',
      x: victim.x,
      y: victim.y + 3.2,
      z: victim.z,
      color: '#EF4444',
      isCrit: true,
      opacity: 1.0,
    });

    this.combatLogs.push(`⚔️ ${victim.creature.name} was vaporized and eliminated by ${killerName}!`);

    if (victim.isPlayer) {
      sound.playGameOver();
    } else {
      sound.playKill();
    }
  }

  // Defeat Disintegration VFX (Expanding Energy Shockwave Ring & Exploding Shards)
  private createDefeatDisintegrationVfx(x: number, y: number, z: number, colorHex: string) {
    const ringGeo = new THREE.RingGeometry(0.3, 1.2, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(x, 0.25, z);
    this.scene.add(ringMesh);

    // Exploding cybernetic spark fragments
    const sparkCount = 16;
    const sparkGroup = new THREE.Group();
    sparkGroup.position.set(x, y + 1.2, z);
    const sparkGeo = new THREE.OctahedronGeometry(0.22, 0);
    const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });
    const fragments: { vx: number; vy: number; vz: number; mesh: THREE.Mesh }[] = [];

    for (let i = 0; i < sparkCount; i++) {
      const sp = new THREE.Mesh(sparkGeo, sparkMat);
      sparkGroup.add(sp);
      const angle = (i * Math.PI * 2) / sparkCount + (Math.random() - 0.5) * 0.4;
      const horizSpeed = 7 + Math.random() * 8;
      fragments.push({
        vx: Math.cos(angle) * horizSpeed,
        vy: 4 + Math.random() * 6,
        vz: Math.sin(angle) * horizSpeed,
        mesh: sp,
      });
    }
    this.scene.add(sparkGroup);

    let progress = 0;
    const animInterval = setInterval(() => {
      progress += 0.055;
      ringMesh.scale.multiplyScalar(1.14);
      ringMat.opacity = Math.max(0, 1 - progress);

      fragments.forEach((f) => {
        f.mesh.position.x += f.vx * 0.035;
        f.mesh.position.y += f.vy * 0.035;
        f.mesh.position.z += f.vz * 0.035;
        f.vy -= 9.8 * 0.035;
      });

      if (progress >= 1.0) {
        clearInterval(animInterval);
        this.scene.remove(ringMesh);
        ringGeo.dispose();
        ringMat.dispose();
        this.scene.remove(sparkGroup);
        sparkGeo.dispose();
        sparkMat.dispose();
      }
    }, 32);
  }

  // Update Projectiles Movement & Hitboxes with Elemental Passing & Ability Physics
  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing guidance logic (strictly restricted to special ultimate missiles, normal attacks always fly completely straight)
      if (p.isHoming && p.homingTargetId && p.vfxType === 'missiles') {
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

      // Arena boundary ricochet for chakrams and ricochet projectiles
      if (p.ricochetCount && p.ricochetCount > 0) {
        const boundLimit = this.arenaRadius - 2.5;
        if (Math.abs(p.x) > boundLimit) {
          p.vx = -p.vx;
          p.x = Math.sign(p.x) * boundLimit;
          p.ricochetCount--;
        }
        if (Math.abs(p.z) > boundLimit) {
          p.vz = -p.vz;
          p.z = Math.sign(p.z) * boundLimit;
          p.ricochetCount--;
        }
      }

      const mesh = this.projectileMeshes.get(p.id);
      if (mesh) {
        mesh.position.set(p.x, p.y, p.z);
        if (p.isCyclone) {
          mesh.rotation.y += 12 * dt;
        }
        if (p.weaponType === 'disk_thrower') {
          mesh.rotation.y += (p.spinSpeed || 25) * dt;
        }
      }

      // Check hits against fighters
      let hit = false;
      for (const fighter of this.fighters) {
        if (fighter.id === p.ownerId || fighter.isDead) continue;
        const d = Math.hypot(fighter.x - p.x, fighter.z - p.z);
        const dy = Math.abs((fighter.y + 1.8) - p.y);

        // Aerial leap evasion: if fighter jumped high over a ground/mid-level attack, it dodges!
        if (fighter.y > 0.8 && p.y < fighter.y + 1.2) {
          if (fighter.isPlayer && d < 3.2 && !fighter.isDead) {
            if (!p.hasDodgedPlayer) {
              p.hasDodgedPlayer = true;
              this.combatObserver.recordPlayerJump();
              try {
                sound.playDash();
              } catch {}
              this.damageFloaters.push({
                id: `dodge-${Date.now()}-${Math.random()}`,
                text: '💨 AERIAL DODGE!',
                x: fighter.x,
                y: fighter.y + 2.6,
                z: fighter.z,
                color: '#38BDF8',
                isCrit: true,
                opacity: 1.0,
              });
            }
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

          // Real-World Combat DNA Knockback Impact or Custom Weapon Knockback
          if (p.knockbackForce) {
            this.applyKnockback(fighter, p.x, p.z, p.knockbackForce);
          } else {
            const attackerImpact = ownerFighter?.combatDna?.impactForce ?? 0.5;
            const rawForce = 1.8 * (0.75 + attackerImpact * 0.85);
            this.applyKnockback(fighter, p.x - p.vx * 0.05, p.z - p.vz * 0.05, rawForce);
          }

          // Weapon Status Effects: Burning
          if (p.burnDuration) {
            fighter.currentHp = Math.max(0, fighter.currentHp - 25);
            this.damageFloaters.push({
              id: `floater-burn-${Date.now()}-${Math.random()}`,
              text: '🔥 BURNING (-25 HP)',
              x: fighter.x,
              y: fighter.y + 3.4,
              z: fighter.z,
              color: '#F97316',
              isCrit: true,
              opacity: 1.0,
            });
            if (fighter.currentHp <= 0) {
              this.handleFighterElimination(fighter, p.ownerId === 'player' ? this.playerFighter.creature.name : 'Rival');
            }
          }

          // Weapon Status Effects: Electric Stun
          if (p.stunDuration) {
            fighter.stunDuration = Math.max(fighter.stunDuration || 0, p.stunDuration);
            this.damageFloaters.push({
              id: `floater-stun-${Date.now()}-${Math.random()}`,
              text: '⚡ STUNNED!',
              x: fighter.x,
              y: fighter.y + 3.6,
              z: fighter.z,
              color: '#FACC15',
              isCrit: true,
              opacity: 1.0,
            });
          }

          // Weapon AoE Explosion Radius (Rocket Launcher, Megafist)
          if (p.aoeRadius) {
            this.fighters.forEach((splashTarget) => {
              if (splashTarget.id === p.ownerId || splashTarget.id === fighter.id || splashTarget.isDead) return;
              const splashDist = Math.hypot(splashTarget.x - p.x, splashTarget.z - p.z);
              if (splashDist <= p.aoeRadius!) {
                this.damageFighter(splashTarget, Math.round(finalDamage * 0.75), 'Blast Shockwave', true, p.element);
                this.applyKnockback(splashTarget, p.x, p.z, 3.8);
              }
            });
          }

          // Multi-Pierce logic
          if (p.pierceCount && p.pierceCount > 0) {
            p.pierceCount--;
            hit = false;
          } else if (!p.isPiercing && !p.isCyclone) {
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

      // Check physical projectile collision with solid tree trunks (Wood Cover)
      if (!hit && this.floraSystem) {
        for (const tree of this.floraSystem.trees) {
          const dTree = Math.hypot(tree.x - p.x, tree.z - p.z);
          if (dTree < tree.trunkRadius && p.y < tree.trunkHeight) {
            hit = true;
            try {
              sound.playHit();
            } catch {}
            this.damageFloaters.push({
              id: `tree-cover-${Date.now()}-${Math.random()}`,
              text: '🛡️ WOOD COVER',
              x: tree.x,
              y: Math.max(1.5, p.y),
              z: tree.z,
              color: '#86efac',
              isCrit: false,
              opacity: 0.9,
            });
            break;
          }
        }
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
        score: Math.round(this.matchDuration * 12 + this.playerFighter.kills * 150),
        trophies: Math.max(5, this.playerFighter.kills * 5 + (rank <= 3 ? 10 : 2)),
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
      const kills = this.playerFighter.kills;
      const stats: Arena3DMatchStats = {
        creatureName: this.playerFighter.creature.name,
        originalObject: this.playerFighter.creature.originalObject,
        rank: 1,
        totalCombatants: this.fighters.length,
        kills,
        damageDealt: kills * 320 + Math.round(this.matchDuration * 25),
        survivalTimeSeconds: Math.round(this.matchDuration),
        isVictory: true,
        earnedXp: 500 + kills * 100,
        earnedCoins: 350 + kills * 75,
        score: 1000 + kills * 250 + Math.round(this.matchDuration * 20),
        trophies: 35 + kills * 10,
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
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    this.isRunning = false;
    this.isPaused = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = 0;
    }
    try {
      multiplayerManager.stopCombatSync();
    } catch {}
    try {
      this.cleanupCombatEntities();
    } catch {}
    try {
      if (this.floraSystem) {
        this.scene.remove(this.floraSystem.floraGroup);
        this.floraSystem.dispose();
        this.floraSystem = null;
      }
    } catch {}
    try {
      if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentElement) {
        this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
      }
      this.renderer?.dispose();
    } catch {}
  }
}
