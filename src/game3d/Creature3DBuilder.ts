import * as THREE from 'three';
import { BattleCreature } from '../types/creature';
import { getCreatureWeaponType } from './weaponSkillConfig';
import { STARTER_TEMPLATE_ROBOT } from '../data/creaturePresets';

export interface Creature3DModel {
  root: THREE.Group;
  bodyMesh: THREE.Object3D;
  headGroup: THREE.Group;
  wings?: THREE.Group[];
  limbs: THREE.Object3D[];
  orbitingOrbs: THREE.Mesh[];
  eyeMeshes: THREE.Mesh[];
  auraMesh?: THREE.Mesh;
  rightArmGroup?: THREE.Group;
  leftArmGroup?: THREE.Group;
  cannonMesh?: THREE.Mesh;
  leftLegGroup?: THREE.Group;
  rightLegGroup?: THREE.Group;
  updateAnimation: (time: number, isMoving: boolean, isAttacking: boolean, isHit: boolean) => void;
  dispose: () => void;
}

export class Creature3DBuilder {
  public static buildCreature(creature: BattleCreature): Creature3DModel {
    const fallback = STARTER_TEMPLATE_ROBOT;
    const safeCreature: BattleCreature = {
      ...fallback,
      ...(creature || {}),
      name: creature?.name || fallback.name,
      stats: {
        ...fallback.stats,
        ...(creature?.stats || {}),
      },
      visualParams: {
        ...fallback.visualParams,
        ...(creature?.visualParams || {}),
      },
    };
    creature = safeCreature;

    const root = new THREE.Group();
    const vp = creature.visualParams || ({} as any);
    const scale = vp.scale || 1.1;

    // Faction determination
    const isDecepticon = creature.faction === 'Decepticon' || 
      (creature.name && (creature.name.toLowerCase().includes('mega') || 
                         creature.name.toLowerCase().includes('star') || 
                         creature.name.toLowerCase().includes('sound') || 
                         creature.name.toLowerCase().includes('shock') || 
                         creature.name.toLowerCase().includes('brawl') || 
                         creature.name.toLowerCase().includes('barricade')));

    const primaryColor = new THREE.Color(vp.primaryColor || (isDecepticon ? '#64748B' : '#DC2626'));
    const secondaryColor = new THREE.Color(vp.secondaryColor || (isDecepticon ? '#581C87' : '#1D4ED8'));
    
    // Optic & Energon core colors
    const energonColorHex = isDecepticon ? '#EF4444' : '#00E5FF';
    const energonColor = new THREE.Color(vp.glowColor || energonColorHex);
    const darkSteelColor = new THREE.Color('#18181B');
    const chromeColor = new THREE.Color('#E2E8F0');

    // Visual Transmutation 2.0 Contract
    const vt = creature.visualTransmutation || creature.objectDna?.visualTransmutation || vp.visualTransmutation;

    // 1. High-Tech PBR Armor Materials with Real-World Physical Material Fidelity
    // Keep metalness balanced (0.22) and roughness tuned (0.36) so real-world object colors are vivid and punchy!
    const matRoughness = typeof vt?.roughness === 'number'
      ? Math.max(0.15, Math.min(0.85, vt.roughness))
      : (typeof vp.roughnessFactor === 'number' ? Math.max(0.15, Math.min(0.85, vp.roughnessFactor)) : 0.36);
    const matMetalness = typeof vt?.metallic === 'number'
      ? Math.max(0.05, Math.min(0.45, vt.metallic))
      : (typeof vp.metallicFactor === 'number' ? Math.max(0.05, Math.min(0.45, vp.metallicFactor)) : 0.22);

    const armorPlateMat = new THREE.MeshStandardMaterial({
      color: primaryColor,
      roughness: matRoughness,
      metalness: matMetalness,
    });

    const trimPlateMat = new THREE.MeshStandardMaterial({
      color: secondaryColor,
      roughness: Math.min(1.0, matRoughness * 1.05),
      metalness: Math.max(0.05, matMetalness * 0.95),
    });

    const darkEndoskeletonMat = new THREE.MeshStandardMaterial({
      color: darkSteelColor,
      roughness: 0.45,
      metalness: 0.8,
    });

    const chromeDetailMat = new THREE.MeshStandardMaterial({
      color: chromeColor,
      roughness: 0.12,
      metalness: 0.98,
    });

    // Glowing Energon Matrix & Optic Eyes Material
    const energonCoreMat = new THREE.MeshStandardMaterial({
      color: energonColor,
      emissive: energonColor,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.3,
    });

    const opticEyeMat = new THREE.MeshBasicMaterial({
      color: energonColor,
    });

    const screenGlassMat = new THREE.MeshStandardMaterial({
      color: 0x050d1a,
      emissive: energonColor,
      emissiveIntensity: 0.6,
      roughness: 0.1,
      metalness: 0.8,
    });

    const limbs: THREE.Object3D[] = [];
    const wings: THREE.Group[] = [];
    const orbitingOrbs: THREE.Mesh[] = [];
    const eyeMeshes: THREE.Mesh[] = [];
    const disposables: (THREE.BufferGeometry | THREE.Material)[] = [
      armorPlateMat,
      trimPlateMat,
      darkEndoskeletonMat,
      chromeDetailMat,
      energonCoreMat,
      opticEyeMat,
      screenGlassMat,
    ];

    // ==========================================
    // 2. ROOT ROBOT BODY GROUP & CHASSIS
    // ==========================================
    const STANDING_HEIGHT = 2.64 * scale;
    const robotRootGroup = new THREE.Group();
    robotRootGroup.position.y = STANDING_HEIGHT;
    root.add(robotRootGroup);

    // Dynamic Body Proportions from Visual Transmutation 2.0
    const propW = Math.max(0.7, Math.min(1.7, vt?.bodyProportions?.width || 1.0));
    const propH = Math.max(0.7, Math.min(1.7, vt?.bodyProportions?.height || 1.0));
    const propD = Math.max(0.7, Math.min(1.7, vt?.bodyProportions?.depth || 1.0));

    // Real-world physical shape archetype detection:
    // 1. Bottle / Can / Flask -> Cylindrical silhouette, threaded cap collar, fluid level indicators, cylinder cannons
    // 2. Laptop / Tablet / Screen -> Wide ultra-slim sheet slab, clamshell folding display lid on back, glowing OLED chest display, keyboard matrix
    // 3. Sphere / Round / Apple / Orb -> Massive glowing spherical orbital chassis, gyroscopic orbital rings, spherical orb pauldrons & orbiting drones
    const rawArchetype = vp.shapeArchetype;
    const textClues = [
      creature.originalObject || '',
      creature.name || '',
      creature.objectFeature || '',
      creature.objectDna?.objectIdentity?.canonicalName || '',
      creature.objectDna?.visualIdentity?.shape || '',
      vp.primaryShape || '',
      vp.objectArchetype || '',
      ...(vp.geometryHints || []),
      ...(creature.objectDna?.signatureFeatures || []),
    ].join(' ').toLowerCase();

    const archetype: 'cylinder' | 'sheet_slab' | 'sphere_round' | 'cuboid_box' =
      rawArchetype ||
      (/bottle|flask|canister|thermos|cylinder|cylindrical|can\b|tumbler|mug|cup\b|tube|pipe|beaker|container|dispenser|shampoo|spray|deodorant|candle|vase|penn\b|pencil|marker/i.test(textClues)
        ? 'cylinder'
        : /sheet|slab|laptop|notebook|macbook|chromebook|tablet|ipad|phone|smartphone|screen|display|monitor|flatscreen|book|card|paper|board|clipboard|kindle|switch|deck/i.test(textClues)
        ? 'sheet_slab'
        : /sphere|spherical|round|ball|orb\b|globe|apple|orange|fruit|tomato|lemon|onion|melon|baseball|basketball|football|soccer|tennis|golf|marble|bulb|pearl|dome|circle|circular/i.test(textClues)
        ? 'sphere_round'
        : 'cuboid_box');

    const isCylinder = archetype === 'cylinder';
    const isSheetSlab = archetype === 'sheet_slab';
    const isSphereRound = archetype === 'sphere_round';

    let chestWidth = 1.4 * scale * propW;
    let chestHeight = 1.15 * scale * propH;
    let chestDepth = 0.95 * scale * propD;
    let cylRadiusTop = 0.54 * scale * propW;
    let cylRadiusBot = 0.58 * scale * propW;
    let cylHeight = 1.35 * scale * propH;
    let sphereRadius = 0.84 * scale * Math.max(propW, propH);

    let chestMesh: THREE.Mesh;

    if (isCylinder) {
      // 1. CYLINDRICAL CHASSIS (Bottle, Flask, Canister, Can, Thermos)
      const chestGeo = new THREE.CylinderGeometry(cylRadiusTop, cylRadiusBot, cylHeight, 28);
      disposables.push(chestGeo);
      chestMesh = new THREE.Mesh(chestGeo, armorPlateMat);
      chestMesh.castShadow = true;
      robotRootGroup.add(chestMesh);

      // Bottle Cap Neck Collar & Threaded Ring
      const collarGeo = new THREE.CylinderGeometry(cylRadiusTop * 0.88, cylRadiusTop * 0.98, 0.22 * scale, 24);
      disposables.push(collarGeo);
      const collar = new THREE.Mesh(collarGeo, trimPlateMat);
      collar.position.y = cylHeight * 0.5 + 0.11 * scale;
      chestMesh.add(collar);

      const threadGeo = new THREE.TorusGeometry(cylRadiusTop * 0.92, 0.035 * scale, 8, 24);
      disposables.push(threadGeo);
      const threadRing = new THREE.Mesh(threadGeo, chromeDetailMat);
      threadRing.rotation.x = Math.PI / 2;
      threadRing.position.y = cylHeight * 0.5 + 0.14 * scale;
      chestMesh.add(threadRing);

      // Front Vertical Liquid Level Gauge with Energon Fluid
      const gaugeBackGeo = new THREE.BoxGeometry(0.18 * scale, cylHeight * 0.68, 0.06 * scale);
      disposables.push(gaugeBackGeo);
      const gaugeBack = new THREE.Mesh(gaugeBackGeo, darkEndoskeletonMat);
      gaugeBack.position.set(0, 0, cylRadiusBot * 0.95);
      chestMesh.add(gaugeBack);

      const gaugeLiquidGeo = new THREE.BoxGeometry(0.10 * scale, cylHeight * 0.62, 0.08 * scale);
      disposables.push(gaugeLiquidGeo);
      const gaugeLiquid = new THREE.Mesh(gaugeLiquidGeo, energonCoreMat);
      gaugeLiquid.position.set(0, 0, cylRadiusBot * 0.96);
      chestMesh.add(gaugeLiquid);

      // Graduated measurement tick marks
      for (let i = -2; i <= 2; i++) {
        const markGeo = new THREE.BoxGeometry(0.24 * scale, 0.02 * scale, 0.05 * scale);
        disposables.push(markGeo);
        const mark = new THREE.Mesh(markGeo, chromeDetailMat);
        mark.position.set(0, i * 0.18 * scale, cylRadiusBot * 0.97);
        chestMesh.add(mark);
      }

      // Flank Pressure Canisters
      for (const side of [-1, 1]) {
        const canisterGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, cylHeight * 0.75, 16);
        disposables.push(canisterGeo);
        const canister = new THREE.Mesh(canisterGeo, chromeDetailMat);
        canister.position.set(side * (cylRadiusBot + 0.12 * scale), 0, 0);
        chestMesh.add(canister);

        const capGeo = new THREE.SphereGeometry(0.14 * scale, 12, 12);
        disposables.push(capGeo);
        for (const capSide of [-1, 1]) {
          const capMesh = new THREE.Mesh(capGeo, energonCoreMat);
          capMesh.position.set(side * (cylRadiusBot + 0.12 * scale), capSide * cylHeight * 0.375, 0);
          chestMesh.add(capMesh);
        }
      }

      // Lower Abdomen Midriff
      const abGeo = new THREE.CylinderGeometry(cylRadiusBot * 0.75, cylRadiusBot * 0.85, 0.5 * scale, 16);
      disposables.push(abGeo);
      const abMesh = new THREE.Mesh(abGeo, darkEndoskeletonMat);
      abMesh.position.y = -(cylHeight * 0.5 + 0.18 * scale);
      chestMesh.add(abMesh);
    } else if (isSheetSlab) {
      // 2. SHEET / SLAB CHASSIS (Laptop, Tablet, Screen, Notebook, Flat Panel)
      chestWidth = 1.95 * scale * propW;
      chestHeight = 1.22 * scale * propH;
      chestDepth = 0.28 * scale * propD; // Ultra-slim slab profile

      const chestGeo = new THREE.BoxGeometry(chestWidth, chestHeight, chestDepth);
      disposables.push(chestGeo);
      chestMesh = new THREE.Mesh(chestGeo, armorPlateMat);
      chestMesh.castShadow = true;
      robotRootGroup.add(chestMesh);

      // Front Chest Glowing OLED Screen Panel
      const screenGeo = new THREE.BoxGeometry(chestWidth * 0.86, chestHeight * 0.62, 0.05 * scale);
      disposables.push(screenGeo);
      const screenMesh = new THREE.Mesh(screenGeo, screenGlassMat);
      screenMesh.position.set(0, 0.14 * scale, chestDepth * 0.51);
      chestMesh.add(screenMesh);

      // Screen bezel frame
      const bezelGeo = new THREE.BoxGeometry(chestWidth * 0.90, chestHeight * 0.66, 0.03 * scale);
      disposables.push(bezelGeo);
      const bezel = new THREE.Mesh(bezelGeo, darkEndoskeletonMat);
      bezel.position.set(0, 0.14 * scale, chestDepth * 0.50);
      chestMesh.add(bezel);

      // Clamshell Folding Screen Lid on Back (like an open laptop or tablet display)
      const lidGroup = new THREE.Group();
      lidGroup.position.set(0, 0.45 * scale, -chestDepth * 0.52);
      lidGroup.rotation.x = -0.36; // Angled open display!
      chestMesh.add(lidGroup);

      const lidGeo = new THREE.BoxGeometry(chestWidth * 0.96, chestHeight * 0.92, 0.08 * scale);
      disposables.push(lidGeo);
      const lidMesh = new THREE.Mesh(lidGeo, trimPlateMat);
      lidMesh.position.y = chestHeight * 0.42;
      lidGroup.add(lidMesh);

      const lidScreenGeo = new THREE.BoxGeometry(chestWidth * 0.88, chestHeight * 0.84, 0.04 * scale);
      disposables.push(lidScreenGeo);
      const lidScreen = new THREE.Mesh(lidScreenGeo, screenGlassMat);
      lidScreen.position.set(0, chestHeight * 0.42, 0.03 * scale);
      lidGroup.add(lidScreen);

      // Outer Illuminated Emblem on back of lid
      const emblemGeo = new THREE.OctahedronGeometry(0.18 * scale, 0);
      disposables.push(emblemGeo);
      const emblem = new THREE.Mesh(emblemGeo, energonCoreMat);
      emblem.position.set(0, chestHeight * 0.42, -0.05 * scale);
      lidGroup.add(emblem);

      // Illuminated Keyboard Matrix on Lower Chest / Abdomen
      const kbGeo = new THREE.BoxGeometry(chestWidth * 0.76, 0.24 * scale, 0.12 * scale);
      disposables.push(kbGeo);
      const kbMesh = new THREE.Mesh(kbGeo, darkEndoskeletonMat);
      kbMesh.position.set(0, -chestHeight * 0.32, chestDepth * 0.52);
      chestMesh.add(kbMesh);

      for (let r = -1; r <= 1; r++) {
        const keyRowGeo = new THREE.BoxGeometry(chestWidth * 0.68, 0.035 * scale, 0.04 * scale);
        disposables.push(keyRowGeo);
        const keyRow = new THREE.Mesh(keyRowGeo, energonCoreMat);
        keyRow.position.set(0, -chestHeight * 0.32 + r * 0.065 * scale, chestDepth * 0.52 + 0.05 * scale);
        chestMesh.add(keyRow);
      }

      // Thin Slab Abdomen connector
      const abGeo = new THREE.BoxGeometry(chestWidth * 0.48, 0.45 * scale, chestDepth * 0.85);
      disposables.push(abGeo);
      const abMesh = new THREE.Mesh(abGeo, darkEndoskeletonMat);
      abMesh.position.y = -(chestHeight * 0.5 + 0.18 * scale);
      chestMesh.add(abMesh);
    } else if (isSphereRound) {
      // 3. SPHERICAL CHASSIS (Sphere, Ball, Apple, Fruit, Orb, Globe)
      const chestGeo = new THREE.SphereGeometry(sphereRadius, 28, 28);
      disposables.push(chestGeo);
      chestMesh = new THREE.Mesh(chestGeo, armorPlateMat);
      chestMesh.castShadow = true;
      robotRootGroup.add(chestMesh);

      // Equatorial Armor Belt
      const beltGeo = new THREE.CylinderGeometry(sphereRadius * 1.03, sphereRadius * 1.03, 0.22 * scale, 28, 1, true);
      disposables.push(beltGeo);
      const beltMesh = new THREE.Mesh(beltGeo, trimPlateMat);
      chestMesh.add(beltMesh);

      // Orbital Gyroscopic Ring 1 (Horizontal tilt)
      const gyroRing1Geo = new THREE.TorusGeometry(sphereRadius * 1.26, 0.045 * scale, 12, 36);
      disposables.push(gyroRing1Geo);
      const gyroRing1 = new THREE.Mesh(gyroRing1Geo, chromeDetailMat);
      gyroRing1.rotation.x = 0.42;
      gyroRing1.rotation.z = 0.15;
      chestMesh.add(gyroRing1);

      // Orbital Gyroscopic Ring 2 (Cross diagonal orbital gimbal)
      const gyroRing2Geo = new THREE.TorusGeometry(sphereRadius * 1.34, 0.038 * scale, 12, 36);
      disposables.push(gyroRing2Geo);
      const gyroRing2 = new THREE.Mesh(gyroRing2Geo, energonCoreMat);
      gyroRing2.rotation.x = -0.65;
      gyroRing2.rotation.y = 0.75;
      chestMesh.add(gyroRing2);

      // Central Spherical Allspark Singularity Eye / Ocular Lens
      const lensRingGeo = new THREE.RingGeometry(0.18 * scale, 0.38 * scale, 24);
      disposables.push(lensRingGeo);
      const lensRing = new THREE.Mesh(lensRingGeo, chromeDetailMat);
      lensRing.position.set(0, 0, sphereRadius * 0.94);
      chestMesh.add(lensRing);

      const lensGeo = new THREE.SphereGeometry(0.24 * scale, 18, 18);
      disposables.push(lensGeo);
      const lens = new THREE.Mesh(lensGeo, energonCoreMat);
      lens.position.set(0, 0, sphereRadius * 0.88);
      chestMesh.add(lens);

      // Dynamic Orbiting Satellite Drone Spheres
      for (let i = 0; i < 3; i++) {
        const droneGroup = new THREE.Group();
        const droneSphereGeo = new THREE.SphereGeometry(0.15 * scale, 14, 14);
        disposables.push(droneSphereGeo);
        const droneMesh = new THREE.Mesh(droneSphereGeo, energonCoreMat);
        droneGroup.add(droneMesh);

        const droneRingGeo = new THREE.TorusGeometry(0.22 * scale, 0.02 * scale, 8, 18);
        disposables.push(droneRingGeo);
        const droneRing = new THREE.Mesh(droneRingGeo, chromeDetailMat);
        droneGroup.add(droneRing);

        robotRootGroup.add(droneGroup);
        orbitingOrbs.push(droneMesh);
      }

      // Spherical Gimbal Abdomen
      const abGeo = new THREE.SphereGeometry(0.38 * scale, 16, 16);
      disposables.push(abGeo);
      const abMesh = new THREE.Mesh(abGeo, darkEndoskeletonMat);
      abMesh.position.y = -(sphereRadius * 0.85 + 0.12 * scale);
      chestMesh.add(abMesh);
    } else {
      // 4. DEFAULT CUBOID / BOX CHASSIS
      const chestGeo = new THREE.BoxGeometry(chestWidth, chestHeight, chestDepth);
      disposables.push(chestGeo);
      chestMesh = new THREE.Mesh(chestGeo, armorPlateMat);
      chestMesh.castShadow = true;
      robotRootGroup.add(chestMesh);

      // Front Chest Pectoral Armor Plates / Vehicle Hood
      const pectW = Math.min(chestWidth * 0.44, 0.68 * scale);
      const pectH = Math.min(chestHeight * 0.62, 0.76 * scale);
      const pectLeftGeo = new THREE.BoxGeometry(pectW, pectH, 0.22 * scale);
      disposables.push(pectLeftGeo);
      const pectLeft = new THREE.Mesh(pectLeftGeo, trimPlateMat);
      pectLeft.position.set(chestWidth * 0.24, 0.12 * scale, chestDepth * 0.52);
      pectLeft.rotation.y = -0.15;
      chestMesh.add(pectLeft);

      const pectRight = new THREE.Mesh(pectLeftGeo, trimPlateMat);
      pectRight.position.set(-chestWidth * 0.24, 0.12 * scale, chestDepth * 0.52);
      pectRight.rotation.y = 0.15;
      chestMesh.add(pectRight);

      // Lower Abdominal Hydraulic Midriff
      const abGeo = new THREE.CylinderGeometry(
        Math.min(chestWidth, chestDepth) * 0.38,
        Math.min(chestWidth, chestDepth) * 0.44,
        0.55 * scale,
        12
      );
      disposables.push(abGeo);
      const abMesh = new THREE.Mesh(abGeo, darkEndoskeletonMat);
      abMesh.position.y = -(chestHeight * 0.5 + 0.2 * scale);
      chestMesh.add(abMesh);
    }

    // Center Energon Spark Chamber / Matrix of Leadership (for non-sphere or layered on chest)
    if (!isSphereRound) {
      const matrixZ = isCylinder ? cylRadiusBot * 0.95 : isSheetSlab ? chestDepth * 0.52 : chestDepth * 0.51;
      const matrixHousingGeo = new THREE.RingGeometry(0.18 * scale, 0.32 * scale, 16);
      disposables.push(matrixHousingGeo);
      const matrixHousing = new THREE.Mesh(matrixHousingGeo, chromeDetailMat);
      matrixHousing.position.set(0, 0.12 * scale, matrixZ);
      chestMesh.add(matrixHousing);

      const energonCrystalGeo = new THREE.OctahedronGeometry(0.18 * scale, 0);
      disposables.push(energonCrystalGeo);
      const energonCrystal = new THREE.Mesh(energonCrystalGeo, energonCoreMat);
      energonCrystal.position.set(0, 0.12 * scale, matrixZ + 0.02 * scale);
      chestMesh.add(energonCrystal);
    }

    // Captured Real-World Photo Medallion (inset into Energon Matrix!)
    if (creature.capturedImageUrl) {
      try {
        const medalGroup = new THREE.Group();
        const discGeo = new THREE.CircleGeometry(0.28 * scale, 24);
        disposables.push(discGeo);

        const texture = new THREE.TextureLoader().load(creature.capturedImageUrl);
        texture.colorSpace = THREE.SRGBColorSpace;
        const photoMat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        disposables.push(photoMat);

        const photoDisc = new THREE.Mesh(discGeo, photoMat);
        photoDisc.position.z = 0.02;
        medalGroup.add(photoDisc);

        const frameRing = new THREE.RingGeometry(0.28 * scale, 0.34 * scale, 24);
        disposables.push(frameRing);
        const ringMesh = new THREE.Mesh(frameRing, energonCoreMat);
        medalGroup.add(ringMesh);

        const medalZ = isCylinder ? cylRadiusBot * 0.96 : isSheetSlab ? chestDepth * 0.54 : isSphereRound ? sphereRadius * 0.97 : chestDepth * 0.54;
        medalGroup.position.set(0, -0.05 * scale, medalZ);
        chestMesh.add(medalGroup);
      } catch (e) {
        console.warn('Could not load photo into transformer chest:', e);
      }
    }

    // ==========================================
    // 3. BACK EXHAUSTS & JET WINGS
    // ==========================================
    if (isDecepticon || vp.wings || creature.robotClass === 'Seeker') {
      // Decepticon Supersonic Fighter Jet Delta Wings (Starscream Style)
      const wingGeo = new THREE.BufferGeometry();
      const wSpan = 1.9 * scale;
      const wDepth = 1.6 * scale;
      const vertices = new Float32Array([
        0, 0, 0,
        wSpan, 0.4 * scale, -wDepth,
        0.2 * scale, -0.2 * scale, -wDepth * 0.8,
      ]);
      wingGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      wingGeo.computeVertexNormals();
      disposables.push(wingGeo);

      const leftWingGroup = new THREE.Group();
      const leftWingMesh = new THREE.Mesh(wingGeo, trimPlateMat);
      leftWingGroup.add(leftWingMesh);
      leftWingGroup.position.set(0.6 * scale, 0.3 * scale, -0.45 * scale);
      chestMesh.add(leftWingGroup);
      wings.push(leftWingGroup);

      const rightWingGroup = new THREE.Group();
      const rightWingMesh = new THREE.Mesh(wingGeo, trimPlateMat);
      rightWingMesh.scale.x = -1;
      rightWingGroup.add(rightWingMesh);
      rightWingGroup.position.set(-0.6 * scale, 0.3 * scale, -0.45 * scale);
      chestMesh.add(rightWingGroup);
      wings.push(rightWingGroup);

      // Jet Thruster Turbines on back
      for (const side of [-1, 1]) {
        const turbineGeo = new THREE.CylinderGeometry(0.18 * scale, 0.22 * scale, 0.7 * scale, 12);
        disposables.push(turbineGeo);
        const turbine = new THREE.Mesh(turbineGeo, chromeDetailMat);
        turbine.position.set(side * 0.35 * scale, 0.35 * scale, -0.58 * scale);
        turbine.rotation.x = Math.PI / 2;
        chestMesh.add(turbine);

        const exhaustGlowGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.08 * scale, 12);
        disposables.push(exhaustGlowGeo);
        const exhaustGlow = new THREE.Mesh(exhaustGlowGeo, energonCoreMat);
        exhaustGlow.position.set(side * 0.35 * scale, 0.35 * scale, -0.92 * scale);
        exhaustGlow.rotation.x = Math.PI / 2;
        chestMesh.add(exhaustGlow);
      }
    } else {
      // Autobot Chrome Exhaust Smokestacks (Optimus Prime / Ironhide Style)
      for (const side of [-1, 1]) {
        const pipeGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 1.4 * scale, 10);
        disposables.push(pipeGeo);
        const pipe = new THREE.Mesh(pipeGeo, chromeDetailMat);
        pipe.position.set(side * 0.62 * scale, 0.65 * scale, -0.42 * scale);
        chestMesh.add(pipe);

        // Angled exhaust tip
        const tipGeo = new THREE.CylinderGeometry(0.09 * scale, 0.08 * scale, 0.22 * scale, 8);
        disposables.push(tipGeo);
        const tip = new THREE.Mesh(tipGeo, chromeDetailMat);
        tip.position.set(side * 0.62 * scale, 1.4 * scale, -0.45 * scale);
        tip.rotation.x = -0.3;
        chestMesh.add(tip);
      }
    }

    // ==========================================
    // 3. OBJECT RECOGNITION 2.0: OBJECT DNA GEOMETRY INJECTION
    // ==========================================
    const geometryHints: string[] = [
      ...(vp.geometryHints || []),
      ...(vp.visualFingerprint?.geometryHints || []),
      ...(creature.objectDna?.visualFingerprint?.geometryHints || []),
    ];
    const primaryShape = (
      vp.primaryShape ||
      vp.visualFingerprint?.primaryShape ||
      creature.objectDna?.visualFingerprint?.primaryShape ||
      creature.objectDna?.visualIdentity?.shape ||
      ''
    ).toLowerCase();
    const objNameLower = (creature.originalObject || creature.name || '').toLowerCase();

    const isBoxy = geometryHints.includes('box_armor') || primaryShape.includes('box') || primaryShape.includes('cuboid') || objNameLower.includes('box') || objNameLower.includes('carton');
    const isChair = geometryHints.includes('dorsal_backrest') || geometryHints.includes('strut_supports') || primaryShape.includes('tubular frame') || objNameLower.includes('chair') || objNameLower.includes('furniture');
    const isBike = geometryHints.includes('wheel_motifs') || objNameLower.includes('bike') || objNameLower.includes('bicycle') || objNameLower.includes('cycle');
    const isTower = geometryHints.includes('columnar_tower') || primaryShape.includes('columnar') || objNameLower.includes('building') || objNameLower.includes('tower');
    const isTreeOrPlant = geometryHints.includes('branching_arbor') || primaryShape.includes('branching') || objNameLower.includes('tree') || objNameLower.includes('branch') || objNameLower.includes('plant') || vp.hasSucculentSpines;
    const isBackpack = geometryHints.includes('strap_harness') || objNameLower.includes('backpack') || objNameLower.includes('bag');
    const isTool = geometryHints.includes('tool_tines') || vp.hasBladesOrTines || objNameLower.includes('tool') || objNameLower.includes('drill') || objNameLower.includes('knife');
    const isFluidVessel = geometryHints.includes('fluid_canister') || vp.hasCapOrLid || objNameLower.includes('bottle') || objNameLower.includes('flask') || objNameLower.includes('can');
    const hasScreenHud = geometryHints.includes('screen_hud') || vp.hasScreen || objNameLower.includes('phone') || objNameLower.includes('laptop') || objNameLower.includes('screen');

    // 1. Box Armor & Flap Plates
    if (isBoxy || vt?.silhouette === 'rectangular_box') {
      for (const side of [-1, 1]) {
        const flapGeo = new THREE.BoxGeometry(0.48 * scale, 0.55 * scale, 0.08 * scale);
        disposables.push(flapGeo);
        const flap = new THREE.Mesh(flapGeo, armorPlateMat);
        flap.position.set(side * 0.42 * scale, 0.15 * scale, (chestDepth * 0.5 + 0.06 * scale));
        flap.rotation.y = side * 0.18;
        chestMesh.add(flap);

        const tapeSeamGeo = new THREE.BoxGeometry(0.12 * scale, 0.58 * scale, 0.09 * scale);
        disposables.push(tapeSeamGeo);
        const tape = new THREE.Mesh(tapeSeamGeo, trimPlateMat);
        tape.position.set(side * 0.42 * scale, 0.15 * scale, (chestDepth * 0.5 + 0.08 * scale));
        chestMesh.add(tape);
      }
    }

    // 1b. Cylindrical Bottle Barrel Hull & Threaded Collar
    if (isFluidVessel || vt?.silhouette === 'cylindrical_bottle') {
      const bottleRadius = Math.min(chestWidth, chestDepth) * 0.48;
      const bottleGeo = new THREE.CylinderGeometry(bottleRadius * 0.94, bottleRadius, chestHeight * 1.04, 18);
      disposables.push(bottleGeo);
      const bottleShroud = new THREE.Mesh(bottleGeo, armorPlateMat);
      chestMesh.add(bottleShroud);

      const collarGeo = new THREE.TorusGeometry(bottleRadius * 0.85, 0.07 * scale, 8, 20);
      disposables.push(collarGeo);
      collarGeo.rotateX(Math.PI / 2);
      const collarMesh = new THREE.Mesh(collarGeo, chromeDetailMat);
      collarMesh.position.set(0, chestHeight * 0.52, 0);
      chestMesh.add(collarMesh);
    }

    // 1c. Spherical Orb Dome Core Pod
    if (vt?.silhouette === 'spherical_orb') {
      const orbRadius = Math.min(chestWidth, chestHeight, chestDepth) * 0.46;
      const sphereGeo = new THREE.SphereGeometry(orbRadius, 16, 16);
      disposables.push(sphereGeo);
      const sphereCore = new THREE.Mesh(sphereGeo, armorPlateMat);
      chestMesh.add(sphereCore);
    }

    // 1d. Columnar Tower Cornice Slabs
    if (isTower || vt?.silhouette === 'columnar_tower') {
      for (let tier = 0; tier < 3; tier++) {
        const slabGeo = new THREE.BoxGeometry(chestWidth * (1.1 - tier * 0.08), 0.12 * scale, chestDepth * (1.1 - tier * 0.08));
        disposables.push(slabGeo);
        const slab = new THREE.Mesh(slabGeo, trimPlateMat);
        slab.position.set(0, (tier - 1) * 0.38 * scale, 0);
        chestMesh.add(slab);
      }
    }

    // 1e. Aerodynamic Wedge Prow
    if (vt?.silhouette === 'aerodynamic_wedge') {
      const prowGeo = new THREE.ConeGeometry(chestWidth * 0.44, chestDepth * 0.85, 4);
      disposables.push(prowGeo);
      prowGeo.rotateX(-Math.PI / 2);
      prowGeo.rotateZ(Math.PI / 4);
      const prowMesh = new THREE.Mesh(prowGeo, armorPlateMat);
      prowMesh.position.set(0, 0, chestDepth * 0.48);
      chestMesh.add(prowMesh);
    }

    // 2. Chair Dorsal Backrest & Quad Support Struts
    if (isChair) {
      const backrestGeo = new THREE.BoxGeometry(1.25 * scale, 1.45 * scale, 0.14 * scale);
      disposables.push(backrestGeo);
      const backrest = new THREE.Mesh(backrestGeo, armorPlateMat);
      backrest.position.set(0, 0.72 * scale, -0.45 * scale);
      chestMesh.add(backrest);

      for (const side of [-1, 1]) {
        const strutGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.95 * scale, 8);
        disposables.push(strutGeo);
        const strut = new THREE.Mesh(strutGeo, chromeDetailMat);
        strut.position.set(side * 0.55 * scale, -0.2 * scale, -0.45 * scale);
        strut.rotation.z = side * 0.35;
        chestMesh.add(strut);
      }
    }

    // 3. Bicycle Dual Wheel Rims & Spokes
    if (isBike) {
      for (const side of [-1, 1]) {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(side * 0.85 * scale, 0.6 * scale, -0.25 * scale);

        const tireGeo = new THREE.TorusGeometry(0.38 * scale, 0.08 * scale, 10, 24);
        disposables.push(tireGeo);
        const tire = new THREE.Mesh(tireGeo, darkEndoskeletonMat);
        wheelGroup.add(tire);

        const hubGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.1 * scale, 12);
        disposables.push(hubGeo);
        const hub = new THREE.Mesh(hubGeo, chromeDetailMat);
        hub.rotation.x = Math.PI / 2;
        wheelGroup.add(hub);

        const spokeGeo = new THREE.BoxGeometry(0.72 * scale, 0.03 * scale, 0.02 * scale);
        disposables.push(spokeGeo);
        const spoke1 = new THREE.Mesh(spokeGeo, chromeDetailMat);
        const spoke2 = new THREE.Mesh(spokeGeo, chromeDetailMat);
        spoke2.rotation.z = Math.PI / 2;
        wheelGroup.add(spoke1);
        wheelGroup.add(spoke2);

        chestMesh.add(wheelGroup);
      }
    }

    // 4. Columnar Monolith Tower & Window Grid
    if (isTower) {
      chestMesh.scale.set(0.92, 1.18, 0.92);
      for (let row = 0; row < 3; row++) {
        for (const side of [-1, 1]) {
          const windowGeo = new THREE.BoxGeometry(0.18 * scale, 0.09 * scale, 0.05 * scale);
          disposables.push(windowGeo);
          const windowSlot = new THREE.Mesh(windowGeo, energonCoreMat);
          windowSlot.position.set(side * 0.35 * scale, (0.35 - row * 0.22) * scale, 0.54 * scale);
          chestMesh.add(windowSlot);
        }
      }
    }

    // 5. Tree / Plant Branching Arbor
    if (isTreeOrPlant) {
      for (const side of [-1, 1]) {
        const branchGroup = new THREE.Group();
        branchGroup.position.set(side * 0.72 * scale, 0.65 * scale, -0.15 * scale);

        const b1Geo = new THREE.CylinderGeometry(0.06 * scale, 0.09 * scale, 0.65 * scale, 6);
        disposables.push(b1Geo);
        const b1 = new THREE.Mesh(b1Geo, trimPlateMat);
        b1.rotation.z = side * -0.45;
        branchGroup.add(b1);

        const leafGeo = new THREE.ConeGeometry(0.12 * scale, 0.32 * scale, 4);
        disposables.push(leafGeo);
        const leaf = new THREE.Mesh(leafGeo, energonCoreMat);
        leaf.position.set(side * 0.22 * scale, 0.35 * scale, 0);
        leaf.rotation.z = side * -0.3;
        branchGroup.add(leaf);

        chestMesh.add(branchGroup);
      }
    }

    // 6. Backpack Utility Straps
    if (isBackpack) {
      for (const side of [-1, 1]) {
        const strapGeo = new THREE.BoxGeometry(0.14 * scale, 0.95 * scale, 0.04 * scale);
        disposables.push(strapGeo);
        const strap = new THREE.Mesh(strapGeo, trimPlateMat);
        strap.position.set(side * 0.32 * scale, 0.15 * scale, 0.54 * scale);
        strap.rotation.z = side * -0.15;
        chestMesh.add(strap);
      }
    }

    // 7. Tool Tines & Blades
    if (isTool) {
      for (const side of [-1, 1]) {
        const tineGeo = new THREE.ConeGeometry(0.06 * scale, 0.65 * scale, 4);
        disposables.push(tineGeo);
        tineGeo.rotateX(Math.PI / 2);
        const tine = new THREE.Mesh(tineGeo, chromeDetailMat);
        tine.position.set(side * 0.28 * scale, -0.72 * scale, 0.85 * scale);
        chestMesh.add(tine);
      }
    }

    // 8. Fluid Canister Reservoir
    if (isFluidVessel) {
      const canisterGeo = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.65 * scale, 16);
      disposables.push(canisterGeo);
      const canister = new THREE.Mesh(canisterGeo, energonCoreMat);
      canister.position.set(0, -0.22 * scale, 0.54 * scale);
      chestMesh.add(canister);
    }

    // 9. Screen HUD Display
    if (hasScreenHud) {
      const hudGeo = new THREE.BoxGeometry(0.68 * scale, 0.42 * scale, 0.06 * scale);
      disposables.push(hudGeo);
      const hud = new THREE.Mesh(hudGeo, screenGlassMat);
      hud.position.set(0, -0.22 * scale, 0.54 * scale);
      chestMesh.add(hud);
    }

    // ==========================================
    // 4. TRANSFORMER BATTLE HELMET & OPTICS
    // ==========================================
    const headGroup = new THREE.Group();
    const headOffsetY = isCylinder
      ? cylHeight * 0.5 + 0.42 * scale
      : isSphereRound
      ? sphereRadius * 0.82 + 0.36 * scale
      : 0.85 * scale;
    headGroup.position.set(0, headOffsetY, 0.05 * scale);
    chestMesh.add(headGroup);

    if (isCylinder) {
      // 1. Cylindrical Bottle-Cap Dome Helmet
      const helmetGeo = new THREE.CylinderGeometry(0.32 * scale, 0.35 * scale, 0.62 * scale, 24);
      disposables.push(helmetGeo);
      const helmetMesh = new THREE.Mesh(helmetGeo, armorPlateMat);
      helmetMesh.castShadow = true;
      headGroup.add(helmetMesh);

      // Threaded Cap Crown
      const capCrownGeo = new THREE.CylinderGeometry(0.28 * scale, 0.32 * scale, 0.16 * scale, 24);
      disposables.push(capCrownGeo);
      const capCrown = new THREE.Mesh(capCrownGeo, trimPlateMat);
      capCrown.position.y = 0.36 * scale;
      headGroup.add(capCrown);

      const capThreadGeo = new THREE.TorusGeometry(0.30 * scale, 0.03 * scale, 8, 24);
      disposables.push(capThreadGeo);
      const capThread = new THREE.Mesh(capThreadGeo, chromeDetailMat);
      capThread.rotation.x = Math.PI / 2;
      capThread.position.y = 0.32 * scale;
      headGroup.add(capThread);

      // Panoramic Curved Wrap-Around Visor
      const visorGeo = new THREE.CylinderGeometry(
        0.36 * scale,
        0.36 * scale,
        0.18 * scale,
        24,
        1,
        false,
        -Math.PI * 0.38,
        Math.PI * 0.76
      );
      disposables.push(visorGeo);
      const visor = new THREE.Mesh(visorGeo, opticEyeMat);
      visor.position.y = 0.08 * scale;
      headGroup.add(visor);
      eyeMeshes.push(visor);
    } else if (isSheetSlab) {
      // 2. Wide Ultra-Slim Terminal Head
      const helmetGeo = new THREE.BoxGeometry(0.82 * scale, 0.50 * scale, 0.26 * scale);
      disposables.push(helmetGeo);
      const helmetMesh = new THREE.Mesh(helmetGeo, armorPlateMat);
      helmetMesh.castShadow = true;
      headGroup.add(helmetMesh);

      // Full-Width Flat Glass Panoramic Visor
      const visorGeo = new THREE.BoxGeometry(0.74 * scale, 0.16 * scale, 0.08 * scale);
      disposables.push(visorGeo);
      const visor = new THREE.Mesh(visorGeo, opticEyeMat);
      visor.position.set(0, 0.06 * scale, 0.14 * scale);
      headGroup.add(visor);
      eyeMeshes.push(visor);

      // Cyber Data Antenna / Stylus Pen
      const stylusGeo = new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.55 * scale, 8);
      disposables.push(stylusGeo);
      const stylus = new THREE.Mesh(stylusGeo, chromeDetailMat);
      stylus.position.set(0.42 * scale, 0.28 * scale, 0);
      stylus.rotation.z = -0.22;
      headGroup.add(stylus);
    } else if (isSphereRound) {
      // 3. Smooth High-Tech Orbital Sphere Dome
      const helmetGeo = new THREE.SphereGeometry(0.38 * scale, 24, 24);
      disposables.push(helmetGeo);
      const helmetMesh = new THREE.Mesh(helmetGeo, armorPlateMat);
      helmetMesh.castShadow = true;
      headGroup.add(helmetMesh);

      // Equatorial Brow Ring
      const browRingGeo = new THREE.TorusGeometry(0.385 * scale, 0.025 * scale, 8, 24);
      disposables.push(browRingGeo);
      const browRing = new THREE.Mesh(browRingGeo, trimPlateMat);
      browRing.rotation.x = 0.2;
      headGroup.add(browRing);

      // Central Circular Ocular Mono-Eye
      const monoEyeGeo = new THREE.SphereGeometry(0.16 * scale, 16, 16);
      disposables.push(monoEyeGeo);
      const monoEye = new THREE.Mesh(monoEyeGeo, opticEyeMat);
      monoEye.position.set(0, 0.06 * scale, 0.30 * scale);
      headGroup.add(monoEye);
      eyeMeshes.push(monoEye);

      const eyeRimGeo = new THREE.TorusGeometry(0.18 * scale, 0.025 * scale, 8, 20);
      disposables.push(eyeRimGeo);
      const eyeRim = new THREE.Mesh(eyeRimGeo, chromeDetailMat);
      eyeRim.position.set(0, 0.06 * scale, 0.30 * scale);
      headGroup.add(eyeRim);
    } else {
      // 4. Angular Cybertronian Helmet
      const helmetGeo = new THREE.BoxGeometry(0.62 * scale, 0.65 * scale, 0.62 * scale);
      disposables.push(helmetGeo);
      const helmetMesh = new THREE.Mesh(helmetGeo, armorPlateMat);
      helmetMesh.castShadow = true;
      headGroup.add(helmetMesh);

      // Forehead Battle Crest
      const crestGeo = new THREE.ConeGeometry(0.12 * scale, 0.45 * scale, 4);
      disposables.push(crestGeo);
      const crest = new THREE.Mesh(crestGeo, trimPlateMat);
      crest.position.set(0, 0.45 * scale, 0.15 * scale);
      crest.rotation.x = -0.2;
      headGroup.add(crest);

      // Antenna Ear Spikes (Optimus / Bumblebee audio receptors)
      for (const side of [-1, 1]) {
        const earGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.6 * scale, 6);
        disposables.push(earGeo);
        const ear = new THREE.Mesh(earGeo, trimPlateMat);
        ear.position.set(side * 0.35 * scale, 0.3 * scale, 0);
        ear.rotation.z = side * -0.25;
        headGroup.add(ear);
      }

      // Angular Faceplate / Battle Mask
      const maskGeo = new THREE.BoxGeometry(0.46 * scale, 0.32 * scale, 0.18 * scale);
      disposables.push(maskGeo);
      const maskMesh = new THREE.Mesh(maskGeo, chromeDetailMat);
      maskMesh.position.set(0, -0.12 * scale, 0.28 * scale);
      headGroup.add(maskMesh);

      // Glowing Optic Visor / Eyes
      const cName = (creature.name || '').toLowerCase();
      if (cName.includes('shock') || cName.includes('cyclops')) {
        // Shockwave-style single glowing Cyclops optic
        const cyclopsGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.1 * scale, 16);
        disposables.push(cyclopsGeo);
        cyclopsGeo.rotateX(Math.PI / 2);
        const eyeMesh = new THREE.Mesh(cyclopsGeo, opticEyeMat);
        eyeMesh.position.set(0, 0.12 * scale, 0.32 * scale);
        headGroup.add(eyeMesh);
        eyeMeshes.push(eyeMesh);
      } else {
        // Dual glowing optics (Autobot Blue or Decepticon Red)
        const eyeGeo = new THREE.BoxGeometry(0.14 * scale, 0.08 * scale, 0.08 * scale);
        disposables.push(eyeGeo);
        for (const side of [-1, 1]) {
          const eyeMesh = new THREE.Mesh(eyeGeo, opticEyeMat);
          eyeMesh.position.set(side * 0.16 * scale, 0.12 * scale, 0.32 * scale);
          headGroup.add(eyeMesh);
          eyeMeshes.push(eyeMesh);
        }
      }
    }

    // ==========================================
    // 5. ARMS & WEAPONS (FUSION CANNON / ION BLASTER)
    // ==========================================
    const armOffsetX = isSheetSlab
      ? chestWidth * 0.54
      : isCylinder
      ? cylRadiusBot + 0.38 * scale
      : isSphereRound
      ? sphereRadius + 0.28 * scale
      : 0.95 * scale;

    const armOffsetY = isCylinder ? 0.30 * scale : isSphereRound ? 0.22 * scale : 0.35 * scale;

    // RIGHT ARM: Heavy Blaster Cannon
    const rightArmGroup = new THREE.Group();
    rightArmGroup.position.set(armOffsetX, armOffsetY, 0);
    chestMesh.add(rightArmGroup);
    limbs.push(rightArmGroup);

    // Archetype-adapted Shoulder Pauldron
    let shoulderGeo: THREE.BufferGeometry;
    if (isCylinder) {
      // Cylindrical horizontal pressure tank pauldron
      shoulderGeo = new THREE.CylinderGeometry(0.24 * scale, 0.24 * scale, 0.62 * scale, 18);
      shoulderGeo.rotateZ(Math.PI / 2);
    } else if (isSheetSlab) {
      // Thin planar sheet armor fin / heat-sink slab
      shoulderGeo = new THREE.BoxGeometry(0.68 * scale, 0.16 * scale, 0.56 * scale);
    } else if (isSphereRound) {
      // Glowing spherical orb pauldron
      shoulderGeo = new THREE.SphereGeometry(0.35 * scale, 18, 18);
    } else {
      shoulderGeo = new THREE.BoxGeometry(0.48 * scale, 0.45 * scale, 0.55 * scale);
    }
    disposables.push(shoulderGeo);

    const rightShoulder = new THREE.Mesh(shoulderGeo, trimPlateMat);
    rightArmGroup.add(rightShoulder);

    // Upper Bicep Armature
    const bicepGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.5 * scale, 8);
    disposables.push(bicepGeo);
    const rightBicep = new THREE.Mesh(bicepGeo, darkEndoskeletonMat);
    rightBicep.position.y = -0.38 * scale;
    rightArmGroup.add(rightBicep);

    // Determine weapon type
    const weaponType = getCreatureWeaponType(creature);

    // Right Arm Weapon Mount
    const cannonGroup = new THREE.Group();
    cannonGroup.position.y = -0.65 * scale;
    rightArmGroup.add(cannonGroup);

    let muzzleGlow: THREE.Mesh;

    if (weaponType === 'swords') {
      // Dual Swords: Long Energon Katana on Right Arm
      const bladeLength = 1.4 * scale;
      const swordBladeGeo = new THREE.BoxGeometry(0.08 * scale, bladeLength, 0.22 * scale);
      disposables.push(swordBladeGeo);
      swordBladeGeo.rotateX(Math.PI / 2);
      const swordBlade = new THREE.Mesh(swordBladeGeo, energonCoreMat);
      swordBlade.position.set(0, 0, 0.7 * scale);
      cannonGroup.add(swordBlade);

      const hiltGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.35 * scale, 8);
      disposables.push(hiltGeo);
      const hilt = new THREE.Mesh(hiltGeo, chromeDetailMat);
      cannonGroup.add(hilt);

      const tipGlowGeo = new THREE.ConeGeometry(0.12 * scale, 0.3 * scale, 6);
      tipGlowGeo.rotateX(Math.PI / 2);
      disposables.push(tipGlowGeo);
      muzzleGlow = new THREE.Mesh(tipGlowGeo, energonCoreMat);
      muzzleGlow.position.set(0, 0, 1.4 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'flamethrower') {
      // Flamethrower: Dual fuel canisters and fluted nozzle
      const tankGeo = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.8 * scale, 8);
      disposables.push(tankGeo);
      const tank = new THREE.Mesh(tankGeo, trimPlateMat);
      tank.position.set(0.22 * scale, 0.2 * scale, 0);
      cannonGroup.add(tank);

      const flutedBarrelGeo = new THREE.CylinderGeometry(0.22 * scale, 0.16 * scale, 1.0 * scale, 10);
      flutedBarrelGeo.rotateX(Math.PI / 2);
      disposables.push(flutedBarrelGeo);
      const barrel = new THREE.Mesh(flutedBarrelGeo, darkEndoskeletonMat);
      barrel.position.set(0, 0, 0.45 * scale);
      cannonGroup.add(barrel);

      const igniterGeo = new THREE.SphereGeometry(0.15 * scale, 8, 8);
      disposables.push(igniterGeo);
      const igniterMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
      disposables.push(igniterMat);
      muzzleGlow = new THREE.Mesh(igniterGeo, igniterMat);
      muzzleGlow.position.set(0, 0, 1.0 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'double_guns') {
      // Twin Blasters: Dual parallel barrels on right arm
      const b1Geo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.9 * scale, 8);
      b1Geo.rotateX(Math.PI / 2);
      disposables.push(b1Geo);
      const b1 = new THREE.Mesh(b1Geo, chromeDetailMat);
      b1.position.set(0.12 * scale, 0, 0.4 * scale);
      const b2 = new THREE.Mesh(b1Geo, chromeDetailMat);
      b2.position.set(-0.12 * scale, 0, 0.4 * scale);
      cannonGroup.add(b1);
      cannonGroup.add(b2);

      const mGeo = new THREE.CylinderGeometry(0.14 * scale, 0.14 * scale, 0.08 * scale, 8);
      mGeo.rotateX(Math.PI / 2);
      disposables.push(mGeo);
      muzzleGlow = new THREE.Mesh(mGeo, energonCoreMat);
      muzzleGlow.position.set(0, 0, 0.88 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'mage_spell') {
      // Mage: Arcane catalyst staff with floating rune focus ring
      const staffGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 1.2 * scale, 8);
      disposables.push(staffGeo);
      const staff = new THREE.Mesh(staffGeo, chromeDetailMat);
      cannonGroup.add(staff);

      const runeOrbGeo = new THREE.SphereGeometry(0.24 * scale, 10, 10);
      disposables.push(runeOrbGeo);
      const runeMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
      disposables.push(runeMat);
      muzzleGlow = new THREE.Mesh(runeOrbGeo, runeMat);
      muzzleGlow.position.set(0, 0.65 * scale, 0.2 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'fighter') {
      // Fighter: Spiked reinforced hydraulic brawling power knuckle
      const knuckleGeo = new THREE.BoxGeometry(0.48 * scale, 0.45 * scale, 0.48 * scale);
      disposables.push(knuckleGeo);
      const knuckleMesh = new THREE.Mesh(knuckleGeo, armorPlateMat);
      knuckleMesh.position.set(0, 0, 0.25 * scale);
      cannonGroup.add(knuckleMesh);

      const spikeGeo = new THREE.ConeGeometry(0.08 * scale, 0.3 * scale, 6);
      spikeGeo.rotateX(Math.PI / 2);
      disposables.push(spikeGeo);
      for (let s = -1; s <= 1; s++) {
        const spike = new THREE.Mesh(spikeGeo, chromeDetailMat);
        spike.position.set(s * 0.15 * scale, 0, 0.55 * scale);
        cannonGroup.add(spike);
      }
      muzzleGlow = new THREE.Mesh(spikeGeo, energonCoreMat);
      muzzleGlow.position.set(0, 0, 0.65 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'archer_bow') {
      // Archer: Forearm-mounted compound energy bow
      const bowLimbGeo = new THREE.TorusGeometry(0.65 * scale, 0.06 * scale, 6, 12, Math.PI);
      bowLimbGeo.rotateY(Math.PI / 2);
      disposables.push(bowLimbGeo);
      const bowLimb = new THREE.Mesh(bowLimbGeo, chromeDetailMat);
      bowLimb.position.set(0, 0, 0.3 * scale);
      cannonGroup.add(bowLimb);

      const arrowGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 1.1 * scale, 6);
      arrowGeo.rotateX(Math.PI / 2);
      disposables.push(arrowGeo);
      muzzleGlow = new THREE.Mesh(arrowGeo, energonCoreMat);
      muzzleGlow.position.set(0, 0, 0.55 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'magic_fist') {
      // Magic Fist: Colossal oversized cybernetic spectral power fist
      const fistGeo = new THREE.BoxGeometry(0.55 * scale, 0.55 * scale, 0.65 * scale);
      disposables.push(fistGeo);
      const fistMesh = new THREE.Mesh(fistGeo, trimPlateMat);
      fistMesh.position.set(0, 0, 0.35 * scale);
      cannonGroup.add(fistMesh);

      const knuckleCoreGeo = new THREE.SphereGeometry(0.25 * scale, 8, 8);
      disposables.push(knuckleCoreGeo);
      const knuckleCoreMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      disposables.push(knuckleCoreMat);
      muzzleGlow = new THREE.Mesh(knuckleCoreGeo, knuckleCoreMat);
      muzzleGlow.position.set(0, 0, 0.72 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'electric_stun_gun') {
      // Electric Stun Gun: Twin Tesla stun prongs
      const prongGeo = new THREE.CylinderGeometry(0.06 * scale, 0.06 * scale, 0.7 * scale, 6);
      prongGeo.rotateX(Math.PI / 2);
      disposables.push(prongGeo);
      const p1 = new THREE.Mesh(prongGeo, chromeDetailMat);
      p1.position.set(0.14 * scale, 0, 0.45 * scale);
      const p2 = new THREE.Mesh(prongGeo, chromeDetailMat);
      p2.position.set(-0.14 * scale, 0, 0.45 * scale);
      cannonGroup.add(p1);
      cannonGroup.add(p2);

      const sparkNodeGeo = new THREE.SphereGeometry(0.12 * scale, 6, 6);
      disposables.push(sparkNodeGeo);
      const sparkNodeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
      disposables.push(sparkNodeMat);
      muzzleGlow = new THREE.Mesh(sparkNodeGeo, sparkNodeMat);
      muzzleGlow.position.set(0, 0, 0.85 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'launcher') {
      // Rocket Launcher: 4-tube cluster missile box
      const boxGeo = new THREE.BoxGeometry(0.45 * scale, 0.45 * scale, 0.9 * scale);
      disposables.push(boxGeo);
      const box = new THREE.Mesh(boxGeo, darkEndoskeletonMat);
      box.position.set(0, 0, 0.35 * scale);
      cannonGroup.add(box);

      const tubeGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.2 * scale, 8);
      tubeGeo.rotateX(Math.PI / 2);
      disposables.push(tubeGeo);
      for (const [tx, ty] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
        const tube = new THREE.Mesh(tubeGeo, chromeDetailMat);
        tube.position.set(tx * scale, ty * scale, 0.82 * scale);
        cannonGroup.add(tube);
      }
      muzzleGlow = new THREE.Mesh(new THREE.SphereGeometry(0.14 * scale, 6, 6), energonCoreMat);
      muzzleGlow.position.set(0, 0, 0.85 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'disk_thrower') {
      // Disk Thrower: Forearm disk feeder and glowing plasma circular chakram
      const magGeo = new THREE.BoxGeometry(0.42 * scale, 0.22 * scale, 0.7 * scale);
      disposables.push(magGeo);
      const mag = new THREE.Mesh(magGeo, chromeDetailMat);
      mag.position.set(0, 0, 0.3 * scale);
      cannonGroup.add(mag);

      const diskGeo = new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.05 * scale, 16);
      disposables.push(diskGeo);
      const diskMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
      disposables.push(diskMat);
      muzzleGlow = new THREE.Mesh(diskGeo, diskMat);
      muzzleGlow.position.set(0, 0.12 * scale, 0.65 * scale);
      cannonGroup.add(muzzleGlow);
    } else if (weaponType === 'laser_gun') {
      // Laser Gun: Long precision optic sniper rail-barrel
      const railGeo = new THREE.BoxGeometry(0.18 * scale, 0.18 * scale, 1.4 * scale);
      disposables.push(railGeo);
      const rail = new THREE.Mesh(railGeo, chromeDetailMat);
      rail.position.set(0, 0, 0.6 * scale);
      cannonGroup.add(rail);

      const scopeGeo = new THREE.CylinderGeometry(0.08 * scale, 0.08 * scale, 0.45 * scale, 8);
      scopeGeo.rotateX(Math.PI / 2);
      disposables.push(scopeGeo);
      const scope = new THREE.Mesh(scopeGeo, darkEndoskeletonMat);
      scope.position.set(0, 0.16 * scale, 0.4 * scale);
      cannonGroup.add(scope);

      const lensGeo = new THREE.SphereGeometry(0.12 * scale, 8, 8);
      disposables.push(lensGeo);
      const lensMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
      disposables.push(lensMat);
      muzzleGlow = new THREE.Mesh(lensGeo, lensMat);
      muzzleGlow.position.set(0, 0, 1.35 * scale);
      cannonGroup.add(muzzleGlow);
    } else {
      // Default Cannon Barrel
      const cannonBarrelGeo = new THREE.CylinderGeometry(0.18 * scale, 0.24 * scale, 1.1 * scale, 12);
      disposables.push(cannonBarrelGeo);
      cannonBarrelGeo.rotateX(Math.PI / 2);
      const cannonBarrel = new THREE.Mesh(cannonBarrelGeo, chromeDetailMat);
      cannonBarrel.position.set(0, 0, 0.35 * scale);
      cannonGroup.add(cannonBarrel);

      const muzzleGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.08 * scale, 12);
      disposables.push(muzzleGeo);
      muzzleGeo.rotateX(Math.PI / 2);
      muzzleGlow = new THREE.Mesh(muzzleGeo, energonCoreMat);
      muzzleGlow.position.set(0, 0, 0.92 * scale);
      cannonGroup.add(muzzleGlow);
    }

    // LEFT ARM: Armored Manipulator & Off-Hand Weapon / Shield
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-armOffsetX, armOffsetY, 0);
    chestMesh.add(leftArmGroup);
    limbs.push(leftArmGroup);

    const leftShoulder = new THREE.Mesh(shoulderGeo, trimPlateMat);
    leftArmGroup.add(leftShoulder);

    const leftBicep = new THREE.Mesh(bicepGeo, darkEndoskeletonMat);
    leftBicep.position.y = -0.38 * scale;
    leftArmGroup.add(leftBicep);

    // Left Forearm Armor Plate
    const forearmGeo = new THREE.BoxGeometry(0.32 * scale, 0.55 * scale, 0.32 * scale);
    disposables.push(forearmGeo);
    const leftForearm = new THREE.Mesh(forearmGeo, armorPlateMat);
    leftForearm.position.y = -0.72 * scale;
    leftArmGroup.add(leftForearm);

    // Off-hand equipment based on weapon type
    if (weaponType === 'swords') {
      // Off-hand dual sword!
      const offBladeGeo = new THREE.BoxGeometry(0.08 * scale, 1.2 * scale, 0.2 * scale);
      offBladeGeo.rotateX(Math.PI / 2);
      disposables.push(offBladeGeo);
      const offBlade = new THREE.Mesh(offBladeGeo, energonCoreMat);
      offBlade.position.set(0, -0.72 * scale, 0.55 * scale);
      leftArmGroup.add(offBlade);
    } else if (weaponType === 'double_guns') {
      // Off-hand second blaster gun!
      const leftGunGroup = new THREE.Group();
      leftGunGroup.position.set(0, -0.72 * scale, 0.35 * scale);
      const lgGeo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.9 * scale, 8);
      lgGeo.rotateX(Math.PI / 2);
      disposables.push(lgGeo);
      const lgMesh = new THREE.Mesh(lgGeo, chromeDetailMat);
      leftGunGroup.add(lgMesh);
      const lmGeo = new THREE.CylinderGeometry(0.12 * scale, 0.12 * scale, 0.08 * scale, 8);
      lmGeo.rotateX(Math.PI / 2);
      disposables.push(lmGeo);
      const lmMesh = new THREE.Mesh(lmGeo, energonCoreMat);
      lmMesh.position.set(0, 0, 0.48 * scale);
      leftGunGroup.add(lmMesh);
      leftArmGroup.add(leftGunGroup);
    } else if (weaponType === 'fighter') {
      // Off-hand matching spiked power knuckle!
      const offKnuckleGeo = new THREE.BoxGeometry(0.45 * scale, 0.42 * scale, 0.45 * scale);
      disposables.push(offKnuckleGeo);
      const offKnuckle = new THREE.Mesh(offKnuckleGeo, armorPlateMat);
      offKnuckle.position.set(0, -0.72 * scale, 0.25 * scale);
      leftArmGroup.add(offKnuckle);
    } else {
      // Energon Blade / Shield on Left Wrist
      const bladeGeo = new THREE.ConeGeometry(0.14 * scale, 0.85 * scale, 4);
      disposables.push(bladeGeo);
      bladeGeo.rotateX(Math.PI / 2);
      const bladeMesh = new THREE.Mesh(bladeGeo, energonCoreMat);
      bladeMesh.position.set(0, -0.72 * scale, 0.45 * scale);
      leftArmGroup.add(bladeMesh);
    }

    // ==========================================
    // 6. BIPEDAL STOMPING MECH LEGS & TREADS
    // ==========================================
    const legOffsetX = isSheetSlab
      ? chestWidth * 0.28
      : isCylinder
      ? cylRadiusBot * 0.65
      : isSphereRound
      ? sphereRadius * 0.55
      : 0.45 * scale;

    const legOffsetY = isCylinder
      ? -(cylHeight * 0.5 + 0.45 * scale)
      : isSphereRound
      ? -(sphereRadius * 0.85 + 0.45 * scale)
      : -1.05 * scale;

    const leftLegGroup = new THREE.Group();
    leftLegGroup.position.set(legOffsetX, legOffsetY, 0);
    chestMesh.add(leftLegGroup);
    limbs.push(leftLegGroup);

    const rightLegGroup = new THREE.Group();
    rightLegGroup.position.set(-legOffsetX, legOffsetY, 0);
    chestMesh.add(rightLegGroup);
    limbs.push(rightLegGroup);

    const legMechanics: {
      legGroup: THREE.Group;
      kneeGroup: THREE.Group;
      footGroup: THREE.Group;
    }[] = [];

    for (const legGroup of [leftLegGroup, rightLegGroup]) {
      // Upper Thigh Armor
      const thighGeo = new THREE.BoxGeometry(0.38 * scale, 0.65 * scale, 0.42 * scale);
      disposables.push(thighGeo);
      const thigh = new THREE.Mesh(thighGeo, armorPlateMat);
      thigh.position.y = -0.32 * scale;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Hydraulic Knee Joint Group (pivots at y = -0.65 * scale below hip)
      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.65 * scale, 0);
      legGroup.add(kneeGroup);

      // Knee Joint Cylinder
      const kneeGeo = new THREE.CylinderGeometry(0.15 * scale, 0.15 * scale, 0.36 * scale, 8);
      disposables.push(kneeGeo);
      kneeGeo.rotateZ(Math.PI / 2);
      const knee = new THREE.Mesh(kneeGeo, chromeDetailMat);
      knee.position.set(0, 0, 0.08 * scale);
      kneeGroup.add(knee);

      // Lower Armored Shin / Calf (Heavy Mech Stomper)
      const calfGeo = new THREE.BoxGeometry(0.44 * scale, 0.72 * scale, 0.52 * scale);
      disposables.push(calfGeo);
      const calf = new THREE.Mesh(calfGeo, trimPlateMat);
      calf.position.set(0, -0.38 * scale, -0.02 * scale);
      calf.castShadow = true;
      kneeGroup.add(calf);

      // Articulated Ankle / Foot Group (pivots at ankle)
      const footGroup = new THREE.Group();
      footGroup.position.set(0, -0.74 * scale, 0.04 * scale);
      kneeGroup.add(footGroup);

      // Magnetic Stomp Footplate
      const footGeo = new THREE.BoxGeometry(0.48 * scale, 0.22 * scale, 0.78 * scale);
      disposables.push(footGeo);
      const foot = new THREE.Mesh(footGeo, darkEndoskeletonMat);
      foot.position.set(0, -0.06 * scale, 0.10 * scale);
      foot.castShadow = true;
      footGroup.add(foot);

      // Sole tread / rubber grip strips (rests precisely on floor at y = 0.01)
      const gripGeo = new THREE.BoxGeometry(0.46 * scale, 0.06 * scale, 0.76 * scale);
      disposables.push(gripGeo);
      const grip = new THREE.Mesh(gripGeo, chromeDetailMat);
      grip.position.set(0, -0.16 * scale, 0.10 * scale);
      footGroup.add(grip);

      legMechanics.push({ legGroup, kneeGroup, footGroup });
    }

    // ==========================================
    // 6.5 DYNAMIC FEATURE PLACEMENT FROM VISUAL TRANSMUTATION CONTRACT
    // ==========================================
    const placedFeatures = vt?.featurePlacement || [];
    for (const item of placedFeatures) {
      const pScale = (item.scale || 1.0) * scale;
      const mType = item.meshType || 'generic_panel';
      const pLoc = item.placement || 'chest';

      if (mType === 'ring_handle') {
        const ringGeo = new THREE.TorusGeometry(0.24 * pScale, 0.06 * pScale, 10, 20, Math.PI * 1.3);
        disposables.push(ringGeo);
        const ringMesh = new THREE.Mesh(ringGeo, chromeDetailMat);
        if (pLoc === 'shoulder') {
          ringMesh.position.set(0.95 * scale, 0.45 * scale, 0);
          ringMesh.rotation.z = Math.PI / 4;
          chestMesh.add(ringMesh);
        } else if (pLoc === 'back') {
          ringMesh.position.set(0, 0.45 * scale, -(chestDepth * 0.5 + 0.08 * scale));
          ringMesh.rotation.x = Math.PI / 2;
          chestMesh.add(ringMesh);
        } else {
          ringMesh.position.set(chestWidth * 0.35, 0.15 * scale, chestDepth * 0.52);
          chestMesh.add(ringMesh);
        }
      } else if (mType === 'wheel_hub') {
        const wheelGroup = new THREE.Group();
        const tireGeo = new THREE.TorusGeometry(0.36 * pScale, 0.10 * pScale, 12, 24);
        disposables.push(tireGeo);
        const tire = new THREE.Mesh(tireGeo, darkEndoskeletonMat);
        wheelGroup.add(tire);
        const rimGeo = new THREE.CylinderGeometry(0.22 * pScale, 0.22 * pScale, 0.12 * pScale, 16);
        disposables.push(rimGeo);
        rimGeo.rotateX(Math.PI / 2);
        const rim = new THREE.Mesh(rimGeo, chromeDetailMat);
        wheelGroup.add(rim);
        if (pLoc === 'shoulder') {
          wheelGroup.position.set(chestWidth * 0.65, 0.45 * scale, 0);
          wheelGroup.rotation.y = Math.PI / 2;
          chestMesh.add(wheelGroup);
        } else if (pLoc === 'hip') {
          wheelGroup.position.set(chestWidth * 0.5, -(chestHeight * 0.6), 0);
          wheelGroup.rotation.y = Math.PI / 2;
          chestMesh.add(wheelGroup);
        } else {
          wheelGroup.position.set(chestWidth * 0.45, 0.1 * scale, chestDepth * 0.4);
          chestMesh.add(wheelGroup);
        }
      } else if (mType === 'screen_hud') {
        const hudGroup = new THREE.Group();
        const frameGeo = new THREE.BoxGeometry(0.82 * pScale, 0.55 * pScale, 0.08 * pScale);
        disposables.push(frameGeo);
        const frame = new THREE.Mesh(frameGeo, darkEndoskeletonMat);
        hudGroup.add(frame);
        const glassGeo = new THREE.PlaneGeometry(0.72 * pScale, 0.45 * pScale);
        disposables.push(glassGeo);
        const glass = new THREE.Mesh(glassGeo, screenGlassMat);
        glass.position.z = 0.05 * pScale;
        hudGroup.add(glass);
        hudGroup.position.set(0, 0.15 * scale, chestDepth * 0.52);
        chestMesh.add(hudGroup);
      } else if (mType === 'button_node') {
        for (let i = -1; i <= 1; i++) {
          const btnGeo = new THREE.CylinderGeometry(0.05 * pScale, 0.05 * pScale, 0.06 * pScale, 8);
          disposables.push(btnGeo);
          btnGeo.rotateX(Math.PI / 2);
          const btn = new THREE.Mesh(btnGeo, energonCoreMat);
          btn.position.set(i * 0.18 * pScale, -0.15 * scale, chestDepth * 0.54);
          chestMesh.add(btn);
        }
      } else if (mType === 'vent_exhaust') {
        const ventBoxGeo = new THREE.BoxGeometry(0.35 * pScale, 0.45 * pScale, 0.15 * pScale);
        disposables.push(ventBoxGeo);
        const ventBox = new THREE.Mesh(ventBoxGeo, darkEndoskeletonMat);
        if (pLoc === 'back') {
          ventBox.position.set(0, 0.25 * scale, -(chestDepth * 0.5 + 0.08 * scale));
          ventBox.rotation.x = 0.2;
          chestMesh.add(ventBox);
        } else {
          ventBox.position.set(chestWidth * 0.3, -0.45 * scale, chestDepth * 0.48);
          chestMesh.add(ventBox);
        }
      } else if (mType === 'strut_brace') {
        for (const side of [-1, 1]) {
          const strutGeo = new THREE.CylinderGeometry(0.05 * pScale, 0.05 * pScale, 0.85 * pScale, 8);
          disposables.push(strutGeo);
          const strut = new THREE.Mesh(strutGeo, chromeDetailMat);
          strut.position.set(side * chestWidth * 0.35, -0.4 * scale, chestDepth * 0.4);
          strut.rotation.z = side * 0.25;
          chestMesh.add(strut);
        }
      } else if (mType === 'strap_band') {
        const bandGeo = new THREE.BoxGeometry(chestWidth * 1.05, 0.12 * pScale, chestDepth * 1.05);
        disposables.push(bandGeo);
        const band = new THREE.Mesh(bandGeo, darkEndoskeletonMat);
        band.position.set(0, 0.15 * scale, 0);
        band.rotation.z = 0.22;
        chestMesh.add(band);
      } else if (mType === 'hinge_pivot') {
        for (const side of [-1, 1]) {
          const hingeGeo = new THREE.CylinderGeometry(0.12 * pScale, 0.12 * pScale, 0.3 * pScale, 10);
          disposables.push(hingeGeo);
          hingeGeo.rotateZ(Math.PI / 2);
          const hinge = new THREE.Mesh(hingeGeo, chromeDetailMat);
          hinge.position.set(side * chestWidth * 0.55, 0.45 * scale, 0);
          chestMesh.add(hinge);
        }
      } else if (mType === 'tine_blade') {
        for (const side of [-1, 1]) {
          const tineGeo = new THREE.ConeGeometry(0.08 * pScale, 0.7 * pScale, 4);
          disposables.push(tineGeo);
          tineGeo.rotateZ(-side * Math.PI / 3);
          const tine = new THREE.Mesh(tineGeo, chromeDetailMat);
          tine.position.set(side * chestWidth * 0.6, 0.2 * scale, chestDepth * 0.2);
          chestMesh.add(tine);
        }
      } else if (mType === 'cap_crest') {
        const capGeo = new THREE.CylinderGeometry(0.22 * pScale, 0.24 * pScale, 0.18 * pScale, 16);
        disposables.push(capGeo);
        const cap = new THREE.Mesh(capGeo, chromeDetailMat);
        cap.position.set(0, 0.48 * scale, 0.05 * scale);
        headGroup.add(cap);
      } else if (mType === 'tread_plate') {
        for (const leg of legMechanics) {
          const tPlateGeo = new THREE.BoxGeometry(0.48 * pScale, 0.07 * pScale, 0.82 * pScale);
          disposables.push(tPlateGeo);
          const tPlate = new THREE.Mesh(tPlateGeo, darkEndoskeletonMat);
          tPlate.position.set(0, -0.19 * scale, 0.10 * scale);
          leg.footGroup.add(tPlate);
        }
      } else if (mType === 'branch_crest') {
        for (const side of [-1, 1]) {
          const branchGroup = new THREE.Group();
          const stemGeo = new THREE.CylinderGeometry(0.06 * pScale, 0.08 * pScale, 0.65 * pScale, 6);
          disposables.push(stemGeo);
          const stem = new THREE.Mesh(stemGeo, trimPlateMat);
          branchGroup.add(stem);
          const subGeo = new THREE.CylinderGeometry(0.04 * pScale, 0.05 * pScale, 0.45 * pScale, 6);
          disposables.push(subGeo);
          const sub = new THREE.Mesh(subGeo, armorPlateMat);
          sub.position.set(side * 0.15 * pScale, 0.2 * pScale, 0);
          sub.rotation.z = side * 0.5;
          branchGroup.add(sub);
          branchGroup.position.set(side * chestWidth * 0.55, 0.65 * scale, 0);
          branchGroup.rotation.z = side * 0.3;
          chestMesh.add(branchGroup);
        }
      } else if (mType === 'box_flap') {
        for (const side of [-1, 1]) {
          const flapGeo = new THREE.BoxGeometry(0.55 * pScale, 0.65 * pScale, 0.09 * pScale);
          disposables.push(flapGeo);
          const flap = new THREE.Mesh(flapGeo, armorPlateMat);
          flap.position.set(side * chestWidth * 0.45, 0.2 * scale, chestDepth * 0.52);
          flap.rotation.y = side * 0.2;
          chestMesh.add(flap);
        }
      } else if (mType === 'canister_core') {
        const canGeo = new THREE.CylinderGeometry(0.26 * pScale, 0.26 * pScale, 0.72 * pScale, 16);
        disposables.push(canGeo);
        const canMesh = new THREE.Mesh(canGeo, energonCoreMat);
        canMesh.position.set(0, 0.05 * scale, chestDepth * 0.5);
        chestMesh.add(canMesh);
      }
    }

    // ==========================================
    // 7. FLOATING ENERGON ORBS & GROUND RING
    // ==========================================
    if (vp.floatingOrbs) {
      const orbCount = 3;
      for (let i = 0; i < orbCount; i++) {
        const orbGeo = new THREE.OctahedronGeometry(0.16 * scale, 0);
        disposables.push(orbGeo);
        const orb = new THREE.Mesh(orbGeo, energonCoreMat);
        root.add(orb);
        orbitingOrbs.push(orb);
      }
    }

    // Ground Cyber Matrix Cyber-Ring (Right on platform floor surface)
    const auraGeo = new THREE.RingGeometry(1.3 * scale, 1.7 * scale, 24);
    auraGeo.rotateX(-Math.PI / 2);
    disposables.push(auraGeo);
    const auraMat = new THREE.MeshBasicMaterial({
      color: energonColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    disposables.push(auraMat);
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    auraMesh.position.y = 0.04;
    root.add(auraMesh);

    // ==========================================
    // 8. HIGH-PRECISION ROBOTIC ANIMATION LOOP
    // ==========================================
    const updateAnimation = (time: number, isMoving: boolean, isAttacking: boolean, isHit: boolean) => {
      // Energon crystal core pulse
      const pulseIntensity = 0.9 + Math.sin(time * 5) * 0.4;
      energonCoreMat.emissiveIntensity = pulseIntensity;

      // Locomotion: Deliberate heavy mech walking on the platform floor
      if (isMoving) {
        // Slow, rhythmic, powerful mech stride
        const strideSpeed = 7.0;
        const walkCycle = Math.sin(time * strideSpeed);

        // Vertical step bob: body lifts as planted foot pushes off, feet never submerge
        const stepBob = Math.abs(Math.sin(time * strideSpeed)) * 0.06 * scale;
        robotRootGroup.position.y = STANDING_HEIGHT + stepBob;
        robotRootGroup.position.x = Math.sin(time * strideSpeed * 0.5) * 0.03 * scale;

        // Bipedal alternating stride
        const [left, right] = legMechanics;

        // Hip swing
        left.legGroup.rotation.x = walkCycle * 0.42;
        right.legGroup.rotation.x = -walkCycle * 0.42;

        // Knee bends backward when swinging forward to lift foot cleanly over floor
        left.kneeGroup.rotation.x = Math.max(0, -walkCycle * 0.48);
        right.kneeGroup.rotation.x = Math.max(0, walkCycle * 0.48);

        // Ankle articulates so footplate stays parallel to floor
        left.footGroup.rotation.x = -left.legGroup.rotation.x * 0.55;
        right.footGroup.rotation.x = -right.legGroup.rotation.x * 0.55;

        // Torso weight shift & tilt
        chestMesh.rotation.z = Math.sin(time * (strideSpeed * 0.5)) * 0.025;
        chestMesh.rotation.x = 0.06; // Forward walking poise

        // Arms counter-swing
        leftArmGroup.rotation.x = -walkCycle * 0.35;
        rightArmGroup.rotation.x = walkCycle * 0.30;
      } else {
        // Idle hydraulic suspension bob (breathing stance, feet remain firmly on floor)
        const idleBob = Math.sin(time * 2.2) * 0.025 * scale;
        robotRootGroup.position.y = STANDING_HEIGHT + idleBob;
        robotRootGroup.position.x = 0;

        // Reset legs to crisp standing posture
        for (const m of legMechanics) {
          m.legGroup.rotation.x = 0;
          m.kneeGroup.rotation.x = 0;
          m.footGroup.rotation.x = 0;
        }

        chestMesh.rotation.z = 0;
        chestMesh.rotation.x = 0;
        leftArmGroup.rotation.x = 0;
        rightArmGroup.rotation.x = 0;
      }

      // Fighter Jet Wings sweep/flex
      if (wings.length >= 2) {
        const wingSweep = Math.sin(time * (isMoving ? 8 : 2)) * 0.08;
        wings[0].rotation.y = wingSweep;
        wings[1].rotation.y = -wingSweep;
      }

      // Attack Animation: Aim Cannon & Recoil Kickback
      if (isAttacking) {
        // Raise heavy weapon arm with stable forward aim & solid recoil
        rightArmGroup.rotation.x = -Math.PI * 0.45;
        rightArmGroup.position.z = -0.10 * scale;
        muzzleGlow.scale.set(2.2, 2.2, 2.2);
        chestMesh.rotation.x = -0.06; // Recoil lean back
      } else {
        muzzleGlow.scale.set(1, 1, 1);
        if (!isMoving) {
          rightArmGroup.position.z = 0;
        }
      }

      // Hit Reaction: Armor flash & physical chest flinch (no coordinate jitter/vibration)
      if (isHit) {
        chestMesh.rotation.x = -0.10;
        armorPlateMat.emissive.set(0xff2200);
        armorPlateMat.emissiveIntensity = 0.85;
      } else {
        armorPlateMat.emissive.set(0x000000);
        armorPlateMat.emissiveIntensity = 0;
      }

      // Orbiting Energon Crystals
      orbitingOrbs.forEach((orb, i) => {
        const angle = time * 2.2 + (i * Math.PI * 2) / orbitingOrbs.length;
        const radius = 1.9 * scale;
        orb.position.set(
          Math.cos(angle) * radius,
          robotRootGroup.position.y + Math.sin(time * 3.5 + i) * 0.35 * scale,
          Math.sin(angle) * radius
        );
        orb.rotation.x = time * 2;
        orb.rotation.y = time * 3;
      });

      // Rotating Cyber Aura Ring
      if (auraMesh) {
        auraMesh.rotation.y = time * 0.8;
      }
    };

    const dispose = () => {
      disposables.forEach((item) => {
        if ('dispose' in item && typeof item.dispose === 'function') {
          item.dispose();
        }
      });
    };

    return {
      root,
      bodyMesh: robotRootGroup,
      headGroup,
      wings,
      limbs,
      orbitingOrbs,
      eyeMeshes,
      auraMesh,
      rightArmGroup,
      leftArmGroup,
      cannonMesh: muzzleGlow,
      leftLegGroup,
      rightLegGroup,
      updateAnimation,
      dispose,
    };
  }
}
