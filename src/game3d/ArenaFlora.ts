import * as THREE from 'three';

export interface ArenaBush {
  id: string;
  x: number;
  z: number;
  radius: number;
  group: THREE.Group;
  foliageMeshes: THREE.Mesh[];
  originalScaleY: number;
}

export interface ArenaTree {
  id: string;
  x: number;
  z: number;
  collisionRadius: number;
  trunkRadius: number;
  trunkHeight: number;
  group: THREE.Group;
}

export interface ArenaFloraSystem {
  trees: ArenaTree[];
  bushes: ArenaBush[];
  grassMesh: THREE.InstancedMesh;
  floraGroup: THREE.Group;
  update: (dt: number, time: number) => void;
  dispose: () => void;
}

/**
 * Generates a rich, procedural organic grass canvas texture
 * with deep emerald gradients, subtle field stone pathways, and wild flora specks.
 */
export function createGrassCanvasTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Base vibrant lush meadow gradient
    const grad = ctx.createRadialGradient(512, 512, 50, 512, 512, 512);
    grad.addColorStop(0, '#2d7a46'); // Bright sunlit center grass
    grad.addColorStop(0.4, '#1b5e34'); // Rich emerald meadow
    grad.addColorStop(0.8, '#144c29'); // Deep forest edge
    grad.addColorStop(1, '#0e3a1f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Procedural grass blade clumps & mossy organic noise
    const colors = ['#22c55e', '#16a34a', '#15803d', '#4ade80', '#84cc16', '#14532d', '#365314'];
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const len = 3 + Math.random() * 8;
      const angle = (Math.random() - 0.5) * 1.5 - Math.PI / 2;
      ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // 3. Subtle tactical concentric clearing rings embedded into the turf
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.22)';
    ctx.beginPath();
    ctx.arc(512, 512, 220, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
    ctx.beginPath();
    ctx.arc(512, 512, 380, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Wild buttercups, chamomile & glowing bioluminescent floral dots
    const flowerColors = ['#fef08a', '#ffffff', '#f472b6', '#a7f3d0', '#67e8f9'];
    for (let f = 0; f < 350; f++) {
      const fx = Math.random() * 1024;
      const fy = Math.random() * 1024;
      ctx.fillStyle = flowerColors[Math.floor(Math.random() * flowerColors.length)];
      ctx.beginPath();
      ctx.arc(fx, fy, 1.2 + Math.random() * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the complete arena flora system:
 * - 4,000 3D instanced grass tufts with wind sway
 * - 12 majestic stylized trees with solid trunks for physical projectile/movement cover
 * - 16 dense tactical bushes for player & creature hiding/stealth ambushes
 */
export function buildArenaFlora(arenaRadius: number): ArenaFloraSystem {
  const floraGroup = new THREE.Group();
  floraGroup.name = 'ArenaFloraGroup';

  // ==========================================
  // 1. INSTANCED 3D GRASS BLADES (4,200 TUFTS)
  // ==========================================
  const grassCount = 4200;

  // Create a stylized 3-blade grass cluster geometry
  const grassGeo = new THREE.BufferGeometry();
  // 3 crossed curved blades (5 vertices each blade = 15 vertices total)
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const bladeAngles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];
  let vertOffset = 0;

  for (const bAngle of bladeAngles) {
    const width = 0.18;
    const height = 0.95;
    const cosA = Math.cos(bAngle);
    const sinA = Math.sin(bAngle);

    // Bottom left, bottom right, mid left, mid right, top tip
    const bLx = -width * cosA * 0.5;
    const bLz = -width * sinA * 0.5;
    const bRx = width * cosA * 0.5;
    const bRz = width * sinA * 0.5;

    const mLx = -width * 0.35 * cosA + sinA * 0.15;
    const mLz = -width * 0.35 * sinA - cosA * 0.15;
    const mRx = width * 0.35 * cosA + sinA * 0.15;
    const mRz = width * 0.35 * sinA - cosA * 0.15;

    const tipX = sinA * 0.32;
    const tipZ = -cosA * 0.32;

    // 5 vertices for a tapered grass blade
    // 0: Bottom Left
    vertices.push(bLx, 0, bLz);
    normals.push(0, 1, 0);
    uvs.push(0, 0);

    // 1: Bottom Right
    vertices.push(bRx, 0, bRz);
    normals.push(0, 1, 0);
    uvs.push(1, 0);

    // 2: Mid Left
    vertices.push(mLx, height * 0.5, mLz);
    normals.push(0, 1, 0);
    uvs.push(0, 0.5);

    // 3: Mid Right
    vertices.push(mRx, height * 0.5, mRz);
    normals.push(0, 1, 0);
    uvs.push(1, 0.5);

    // 4: Tip
    vertices.push(tipX, height, tipZ);
    normals.push(0, 1, 0);
    uvs.push(0.5, 1);

    // Triangles: 0-1-2, 1-3-2, 2-3-4
    indices.push(
      vertOffset + 0, vertOffset + 1, vertOffset + 2,
      vertOffset + 1, vertOffset + 3, vertOffset + 2,
      vertOffset + 2, vertOffset + 3, vertOffset + 4
    );
    vertOffset += 5;
  }

  grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  grassGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  grassGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  grassGeo.setIndex(indices);
  grassGeo.computeVertexNormals();

  const grassMat = new THREE.MeshStandardMaterial({
    roughness: 0.82,
    metalness: 0.08,
    side: THREE.DoubleSide,
    shadowSide: THREE.DoubleSide,
  });

  const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  grassMesh.receiveShadow = true;
  grassMesh.castShadow = true;

  const grassDummy = new THREE.Object3D();
  const grassPalette = [
    new THREE.Color('#22c55e'), // Spring green
    new THREE.Color('#16a34a'), // Forest green
    new THREE.Color('#15803d'), // Deep emerald
    new THREE.Color('#84cc16'), // Vibrant lime
    new THREE.Color('#10b981'), // Teal emerald
    new THREE.Color('#4ade80'), // Light meadow green
    new THREE.Color('#a3e635'), // Sunlit chartreuse
  ];

  for (let i = 0; i < grassCount; i++) {
    // Distribute evenly across circle, leaving only outer 5.5 units for forcefield lip
    const r = Math.sqrt(Math.random()) * (arenaRadius - 5.5);
    const theta = Math.random() * Math.PI * 2;
    const x = Math.cos(theta) * r;
    const z = Math.sin(theta) * r;

    grassDummy.position.set(x, 0.02, z);
    grassDummy.rotation.y = Math.random() * Math.PI * 2;
    grassDummy.rotation.x = (Math.random() - 0.5) * 0.18;
    grassDummy.rotation.z = (Math.random() - 0.5) * 0.18;

    const scale = 0.7 + Math.random() * 0.65;
    const heightScale = 0.8 + Math.random() * 0.7;
    grassDummy.scale.set(scale, heightScale, scale);
    grassDummy.updateMatrix();

    grassMesh.setMatrixAt(i, grassDummy.matrix);
    grassMesh.setColorAt(i, grassPalette[Math.floor(Math.random() * grassPalette.length)]);
  }
  if (grassMesh.instanceColor) {
    grassMesh.instanceColor.needsUpdate = true;
  }
  grassMesh.instanceMatrix.needsUpdate = true;
  floraGroup.add(grassMesh);

  // ==========================================
  // 2. STYLIZED TREES (PHYSICAL COVER & SHADE)
  // ==========================================
  const trees: ArenaTree[] = [];
  const treePositions = [
    // Mid Ring skirmish trees (r ~ 32 to 42)
    { x: 30, z: 18, scale: 1.1 },
    { x: -28, z: 22, scale: 1.05 },
    { x: 22, z: -30, scale: 1.15 },
    { x: -32, z: -20, scale: 1.0 },
    { x: 0, z: 38, scale: 1.2 },
    { x: 0, z: -38, scale: 1.1 },
    // Outer Ring perimeter trees (r ~ 60 to 74)
    { x: 62, z: 28, scale: 1.25 },
    { x: -58, z: 34, scale: 1.2 },
    { x: 55, z: -42, scale: 1.3 },
    { x: -64, z: -26, scale: 1.15 },
    { x: 26, z: 66, scale: 1.2 },
    { x: -30, z: -65, scale: 1.25 },
  ];

  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x451a03, // Rich mahogany bark
    roughness: 0.9,
    metalness: 0.1,
  });

  const canopyMats = [
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85, metalness: 0.05 }), // Deep base foliage
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8, metalness: 0.05 }),  // Mid emerald
    new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75, metalness: 0.05 }), // Sunlit top foliage
  ];

  const fruitMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

  treePositions.forEach((tp, idx) => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(tp.x, 0, tp.z);
    treeGroup.scale.set(tp.scale, tp.scale, tp.scale);

    // A. Trunk with roots
    const trunkGeo = new THREE.CylinderGeometry(0.75, 1.35, 7.5, 8);
    const trunkMesh = new THREE.Mesh(trunkGeo, trunkMat);
    trunkMesh.position.y = 3.75;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Root buttresses
    for (let r = 0; r < 4; r++) {
      const rAngle = (r * Math.PI * 2) / 4 + 0.3;
      const rootGeo = new THREE.ConeGeometry(0.55, 2.2, 5);
      const rootMesh = new THREE.Mesh(rootGeo, trunkMat);
      rootMesh.position.set(Math.cos(rAngle) * 1.05, 0.7, Math.sin(rAngle) * 1.05);
      rootMesh.rotation.z = Math.cos(rAngle) * -0.4;
      rootMesh.rotation.x = Math.sin(rAngle) * 0.4;
      rootMesh.castShadow = true;
      treeGroup.add(rootMesh);
    }

    // B. Tiered stylized canopy
    const c1Geo = new THREE.DodecahedronGeometry(4.4, 1);
    const c1Mesh = new THREE.Mesh(c1Geo, canopyMats[0]);
    c1Mesh.position.y = 7.0;
    c1Mesh.scale.set(1.1, 0.8, 1.1);
    c1Mesh.castShadow = true;
    c1Mesh.receiveShadow = true;
    treeGroup.add(c1Mesh);

    const c2Geo = new THREE.DodecahedronGeometry(3.5, 1);
    const c2Mesh = new THREE.Mesh(c2Geo, canopyMats[1]);
    c2Mesh.position.y = 9.8;
    c2Mesh.scale.set(1.0, 0.85, 1.0);
    c2Mesh.castShadow = true;
    c2Mesh.receiveShadow = true;
    treeGroup.add(c2Mesh);

    const c3Geo = new THREE.DodecahedronGeometry(2.5, 1);
    const c3Mesh = new THREE.Mesh(c3Geo, canopyMats[2]);
    c3Mesh.position.y = 12.2;
    c3Mesh.castShadow = true;
    c3Mesh.receiveShadow = true;
    treeGroup.add(c3Mesh);

    // C. Glowing cyber-fruits / blossoms
    for (let f = 0; f < 5; f++) {
      const fAngle = (f * Math.PI * 2) / 5;
      const fruitGeo = new THREE.SphereGeometry(0.3, 6, 6);
      const fruitMesh = new THREE.Mesh(fruitGeo, fruitMat);
      fruitMesh.position.set(
        Math.cos(fAngle) * 3.2,
        6.5 + (f % 3) * 1.5,
        Math.sin(fAngle) * 3.2
      );
      treeGroup.add(fruitMesh);
    }

    floraGroup.add(treeGroup);

    trees.push({
      id: `tree-${idx}`,
      x: tp.x,
      z: tp.z,
      collisionRadius: 1.5 * tp.scale,
      trunkRadius: 1.6 * tp.scale,
      trunkHeight: 14 * tp.scale,
      group: treeGroup,
    });
  });

  // ==========================================
  // 3. TACTICAL HIDING BUSHES (STEALTH COVER)
  // ==========================================
  const bushes: ArenaBush[] = [];
  const bushPositions = [
    // Near center skirmish zones
    { x: 14, z: 12, radius: 3.6 },
    { x: -15, z: 14, radius: 3.5 },
    { x: 12, z: -16, radius: 3.8 },
    { x: -14, z: -15, radius: 3.4 },
    // Mid zone ambush clusters
    { x: 40, z: 5, radius: 4.2 },
    { x: -38, z: 6, radius: 4.0 },
    { x: 8, z: 42, radius: 3.8 },
    { x: -6, z: -42, radius: 3.8 },
    { x: 28, z: 35, radius: 4.0 },
    { x: -32, z: 36, radius: 3.6 },
    { x: 34, z: -32, radius: 4.1 },
    { x: -35, z: -34, radius: 3.7 },
    // Outer perimeter thickets
    { x: 58, z: -15, radius: 4.4 },
    { x: -60, z: 12, radius: 4.2 },
    { x: 18, z: -62, radius: 4.0 },
    { x: -20, z: 64, radius: 4.3 },
  ];

  const bushMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a, // Vibrant lush shrub green
    roughness: 0.88,
    metalness: 0.05,
  });

  const bushTopMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, // Bright spring foliage highlights
    roughness: 0.82,
    metalness: 0.05,
  });

  const berryMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e }); // Bright ruby berries

  bushPositions.forEach((bp, idx) => {
    const bushGroup = new THREE.Group();
    bushGroup.position.set(bp.x, 0, bp.z);

    const foliageMeshes: THREE.Mesh[] = [];

    // Main center foliage dome
    const mainGeo = new THREE.SphereGeometry(bp.radius * 0.72, 9, 8);
    const mainMesh = new THREE.Mesh(mainGeo, bushMat);
    mainMesh.position.y = bp.radius * 0.48;
    mainMesh.scale.set(1.0, 0.75, 1.0);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    bushGroup.add(mainMesh);
    foliageMeshes.push(mainMesh);

    // 4 Satellite overlapping foliage spheres to make an organic natural thicket
    const satCount = 4;
    for (let s = 0; s < satCount; s++) {
      const sAngle = (s * Math.PI * 2) / satCount + Math.random() * 0.5;
      const sDist = bp.radius * 0.38;
      const sRadius = bp.radius * (0.42 + Math.random() * 0.15);
      const satGeo = new THREE.SphereGeometry(sRadius, 8, 7);
      const satMesh = new THREE.Mesh(satGeo, s % 2 === 0 ? bushMat : bushTopMat);
      satMesh.position.set(
        Math.cos(sAngle) * sDist,
        sRadius * 0.65,
        Math.sin(sAngle) * sDist
      );
      satMesh.scale.set(1.0, 0.72, 1.0);
      satMesh.castShadow = true;
      satMesh.receiveShadow = true;
      bushGroup.add(satMesh);
      foliageMeshes.push(satMesh);
    }

    // Ruby & sapphire wild berries nestled in the bush
    for (let b = 0; b < 6; b++) {
      const bAngle = (b * Math.PI * 2) / 6;
      const bDist = bp.radius * 0.55;
      const berryGeo = new THREE.SphereGeometry(0.24, 6, 6);
      const berryMesh = new THREE.Mesh(berryGeo, berryMat);
      berryMesh.position.set(
        Math.cos(bAngle) * bDist,
        bp.radius * 0.52 + (b % 2) * 0.3,
        Math.sin(bAngle) * bDist
      );
      bushGroup.add(berryMesh);
    }

    floraGroup.add(bushGroup);

    bushes.push({
      id: `bush-${idx}`,
      x: bp.x,
      z: bp.z,
      radius: bp.radius,
      group: bushGroup,
      foliageMeshes,
      originalScaleY: 1.0,
    });
  });

  return {
    trees,
    bushes,
    grassMesh,
    floraGroup,
    update: (dt: number, time: number) => {
      // Gentle wind breeze sway on trees and bushes
      trees.forEach((t, i) => {
        t.group.rotation.z = Math.sin(time * 1.8 + i * 0.7) * 0.025;
        t.group.rotation.x = Math.cos(time * 1.4 + i * 0.9) * 0.02;
      });
      bushes.forEach((b, i) => {
        b.group.scale.y = 1.0 + Math.sin(time * 2.2 + i) * 0.025;
      });
    },
    dispose: () => {
      grassGeo.dispose();
      grassMat.dispose();
      trunkMat.dispose();
      canopyMats.forEach((m) => m.dispose());
      fruitMat.dispose();
      bushMat.dispose();
      bushTopMat.dispose();
      berryMat.dispose();
    },
  };
}
