import * as THREE from 'three';
import { BattleCreature, WeaponSkillType } from '../types/creature';

export interface WeaponSkillMeta {
  type: WeaponSkillType;
  name: string;
  icon: string;
  category: 'Melee' | 'Ranged' | 'Mystic' | 'Heavy Artillery';
  description: string;
  primaryAttackName: string;
  specialSkillName: string;
  primaryColor: string;
}

export const WEAPON_SKILL_METAS: Record<WeaponSkillType, WeaponSkillMeta> = {
  swords: {
    type: 'swords',
    name: 'Dual Energon Blades',
    icon: '⚔️',
    category: 'Melee',
    description: 'Twin high-frequency energon katanas delivering high-speed crescent arc slashes.',
    primaryAttackName: 'Crescent Blade Arc',
    specialSkillName: 'Whirlwind Blade Tempest',
    primaryColor: '#38BDF8',
  },
  flamethrower: {
    type: 'flamethrower',
    name: 'Molten Flamethrower',
    icon: '🔥',
    category: 'Ranged',
    description: 'Continuous torrent of roaring plasma magma flame droplets that ignite enemies with burn DoT.',
    primaryAttackName: 'Magma Flame Torrent',
    specialSkillName: 'Inferno Magma Geyser',
    primaryColor: '#F97316',
  },
  double_guns: {
    type: 'double_guns',
    name: 'Dual Pulse Blasters',
    icon: '🔫',
    category: 'Ranged',
    description: 'Twin arm-mounted rapid blasters delivering alternating high-velocity energy rounds.',
    primaryAttackName: 'Alternating Dual Fire',
    specialSkillName: 'Bulletstorm Barrage',
    primaryColor: '#EC4899',
  },
  mage_spell: {
    type: 'mage_spell',
    name: 'Arcane Singularity Focus',
    icon: '🔮',
    category: 'Mystic',
    description: 'Mystical cosmic catalyst channeling pulsating astral orbs and gravitational singularities.',
    primaryAttackName: 'Astral Magic Orb',
    specialSkillName: 'Cosmic Singularity Collapse',
    primaryColor: '#A855F7',
  },
  fighter: {
    type: 'fighter',
    name: 'Heavy Power Knuckles',
    icon: '🥋',
    category: 'Melee',
    description: 'Hydraulic steel knuckles that unleash shattering kinetic shockwaves upon close impact.',
    primaryAttackName: 'Kinetic Shock Lunge',
    specialSkillName: 'Titan Breaker Pummel',
    primaryColor: '#EAB308',
  },
  archer_bow: {
    type: 'archer_bow',
    name: 'Photon Compound Bow',
    icon: '🏹',
    category: 'Ranged',
    description: 'Precision compound rail-bow launching supersonic piercing light arrows with laser trails.',
    primaryAttackName: 'Piercing Photon Arrow',
    specialSkillName: 'Supersonic Arrow Volley',
    primaryColor: '#22C55E',
  },
  magic_fist: {
    type: 'magic_fist',
    name: 'Spectral Magic Fist',
    icon: '🥊',
    category: 'Mystic',
    description: 'Supercharged glowing spectral fist projectile that hurtles forward and batters targets back.',
    primaryAttackName: 'Rocket Magic Fist',
    specialSkillName: 'Gigaton Megafist Slam',
    primaryColor: '#F59E0B',
  },
  electric_stun_gun: {
    type: 'electric_stun_gun',
    name: 'Tesla Shock Stunner',
    icon: '⚡',
    category: 'Ranged',
    description: 'High-voltage electric arc emitter that crackles with electricity and paralyzes cybernetics.',
    primaryAttackName: 'High-Voltage Spark Bolt',
    specialSkillName: 'Chain Lightning EMP Overload',
    primaryColor: '#FACC15',
  },
  launcher: {
    type: 'launcher',
    name: 'Heavy Missile Launcher',
    icon: '🚀',
    category: 'Heavy Artillery',
    description: 'Pod-mounted artillery system firing explosive warhead missiles that cause crater shockwaves.',
    primaryAttackName: 'High-Explosive Warhead',
    specialSkillName: 'Cluster Warhead Barrage',
    primaryColor: '#EF4444',
  },
  disk_thrower: {
    type: 'disk_thrower',
    name: 'Plasma Disk Thrower',
    icon: '🥏',
    category: 'Ranged',
    description: 'High-rpm circular saw chakram launcher firing spinning plasma disks that slice and ricochet.',
    primaryAttackName: 'Spinning Razor Chakram',
    specialSkillName: 'Triple Hyper-Chakram Swarm',
    primaryColor: '#06B6D4',
  },
  laser_gun: {
    type: 'laser_gun',
    name: 'Continuous Laser Cannon',
    icon: '🔆',
    category: 'Ranged',
    description: 'High-output optic railgun firing continuous concentrated beam rods that pierce multiple targets.',
    primaryAttackName: 'Focused Laser Beam',
    specialSkillName: 'Orbital Death Ray',
    primaryColor: '#6366F1',
  },
};

/**
 * Intelligently determines the creature's weapon and skill archetype
 */
export function getCreatureWeaponType(creature: BattleCreature): WeaponSkillType {
  if (creature.primaryWeapon && WEAPON_SKILL_METAS[creature.primaryWeapon]) {
    return creature.primaryWeapon;
  }

  // Check robotClass
  const rClass = creature.robotClass;
  if (rClass === 'Mage') return 'mage_spell';
  if (rClass === 'Archer') return 'archer_bow';
  if (rClass === 'Magic Fist') return 'magic_fist';
  if (rClass === 'Fighter') return 'fighter';

  // Analyze keywords in name, ability, originalObject, and features
  const text = `${creature.name} ${creature.originalObject} ${creature.objectFeature} ${creature.specialAbility?.name || ''} ${creature.specialAbility?.description || ''} ${creature.specialAbility?.vfxType || ''}`.toLowerCase();

  if (text.includes('flame') || text.includes('fire') || text.includes('magma') || text.includes('scorch') || text.includes('burn') || text.includes('lighter') || text.includes('torch')) {
    return 'flamethrower';
  }
  if (text.includes('sword') || text.includes('blade') || text.includes('katana') || text.includes('saber') || text.includes('slash') || text.includes('windblade') || text.includes('cutter')) {
    return 'swords';
  }
  if (text.includes('double') || text.includes('dual') || text.includes('twin') || text.includes('pistol') || text.includes('barricade')) {
    return 'double_guns';
  }
  if (text.includes('bow') || text.includes('arrow') || text.includes('archer') || text.includes('seeker') || text.includes('starscream') || text.includes('sniper')) {
    return 'archer_bow';
  }
  if (text.includes('fist') || text.includes('punch') || text.includes('brawl') || text.includes('gauntlet') || text.includes('optimus')) {
    return 'magic_fist';
  }
  if (text.includes('electric') || text.includes('stun') || text.includes('taser') || text.includes('shock') || text.includes('stinger') || text.includes('volt') || text.includes('bumble')) {
    return 'electric_stun_gun';
  }
  if (text.includes('launch') || text.includes('rocket') || text.includes('missile') || text.includes('mortar') || text.includes('artillery') || text.includes('iron-buster')) {
    return 'launcher';
  }
  if (text.includes('disk') || text.includes('disc') || text.includes('chakram') || text.includes('saw') || text.includes('data-blaster') || text.includes('slate')) {
    return 'disk_thrower';
  }
  if (text.includes('laser') || text.includes('beam') || text.includes('railgun') || text.includes('cyclops') || text.includes('shock-blast') || text.includes('particle')) {
    return 'laser_gun';
  }
  if (text.includes('mage') || text.includes('magic') || text.includes('arcane') || text.includes('singularity') || text.includes('sound-wave') || text.includes('dark')) {
    return 'mage_spell';
  }

  // Deterministic fallback based on creature id/name hash
  const hash = Math.abs((creature.id || creature.name || 'robot').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0));
  const keys: WeaponSkillType[] = [
    'swords',
    'flamethrower',
    'double_guns',
    'mage_spell',
    'fighter',
    'archer_bow',
    'magic_fist',
    'electric_stun_gun',
    'launcher',
    'disk_thrower',
    'laser_gun',
  ];
  return keys[hash % keys.length];
}

/**
 * Builds 3D visual mesh specifically shaped for the weapon projectile
 */
export function createWeaponProjectileMesh(
  weaponType: WeaponSkillType,
  colorHex: string,
  radius: number,
  rotationY: number
): THREE.Object3D {
  const color = new THREE.Color(colorHex);

  switch (weaponType) {
    case 'swords': {
      // Sweeping crescent blade arc mesh
      const group = new THREE.Group();
      const arcShape = new THREE.Shape();
      arcShape.absarc(0, 0, radius * 2.2, -Math.PI * 0.4, Math.PI * 0.4, false);
      arcShape.absarc(0, 0, radius * 1.6, Math.PI * 0.4, -Math.PI * 0.4, true);
      const geom = new THREE.ShapeGeometry(arcShape);
      geom.rotateX(Math.PI / 2);
      const mat = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const bladeMesh = new THREE.Mesh(geom, mat);
      bladeMesh.rotation.y = rotationY;
      group.add(bladeMesh);

      // Bright inner core
      const coreGeo = new THREE.RingGeometry(radius * 1.7, radius * 2.0, 16);
      coreGeo.rotateX(Math.PI / 2);
      const coreMesh = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      coreMesh.rotation.y = rotationY;
      group.add(coreMesh);
      return group;
    }

    case 'flamethrower': {
      // Swirling flame fireball with corona
      const group = new THREE.Group();
      const coreGeo = new THREE.SphereGeometry(radius * 1.1, 8, 8);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      const flameGeo = new THREE.DodecahedronGeometry(radius * 1.6, 1);
      const flameMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.75,
        wireframe: true,
      });
      const flameMesh = new THREE.Mesh(flameGeo, flameMat);
      group.add(flameMesh);
      return group;
    }

    case 'double_guns': {
      // High-velocity elongated laser bolt
      const boltGeo = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, radius * 2.6, 8);
      boltGeo.rotateX(Math.PI / 2);
      const boltMat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      mesh.rotation.y = rotationY;
      return mesh;
    }

    case 'mage_spell': {
      // Arcane orb with mystical orbiting satellite rings
      const group = new THREE.Group();
      const orbGeo = new THREE.SphereGeometry(radius * 1.1, 12, 12);
      const orbMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      group.add(orbMesh);

      const ringGeo = new THREE.TorusGeometry(radius * 1.7, radius * 0.15, 6, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 4;
      group.add(ringMesh);
      return group;
    }

    case 'fighter': {
      // Brawling shockwave blast
      const group = new THREE.Group();
      const sphereGeo = new THREE.SphereGeometry(radius * 1.2, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
      group.add(new THREE.Mesh(sphereGeo, sphereMat));

      const ringGeo = new THREE.RingGeometry(radius * 1.2, radius * 1.8, 12);
      ringGeo.rotateX(Math.PI / 2);
      const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide }));
      group.add(ringMesh);
      return group;
    }

    case 'archer_bow': {
      // Elongated photon arrow with arrowhead
      const group = new THREE.Group();
      const shaftGeo = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, radius * 3.4, 6);
      shaftGeo.rotateX(Math.PI / 2);
      const shaftMesh = new THREE.Mesh(shaftGeo, new THREE.MeshBasicMaterial({ color: 0x22c55e }));
      shaftMesh.rotation.y = rotationY;
      group.add(shaftMesh);

      const headGeo = new THREE.ConeGeometry(radius * 0.7, radius * 1.2, 6);
      headGeo.rotateX(-Math.PI / 2);
      const headMesh = new THREE.Mesh(headGeo, new THREE.MeshBasicMaterial({ color: 0x86efac }));
      headMesh.position.set(0, 0, radius * 1.8);
      headMesh.rotation.y = rotationY;
      group.add(headMesh);
      return group;
    }

    case 'magic_fist': {
      // Giant glowing spectral rocket fist
      const group = new THREE.Group();
      // Fist palm/knuckle block
      const palmGeo = new THREE.BoxGeometry(radius * 1.6, radius * 1.2, radius * 1.4);
      const palmMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const palmMesh = new THREE.Mesh(palmGeo, palmMat);
      palmMesh.rotation.y = rotationY;
      group.add(palmMesh);

      // Knuckle ridges
      const knuckleGeo = new THREE.CylinderGeometry(radius * 0.2, radius * 0.2, radius * 1.5, 6);
      knuckleGeo.rotateZ(Math.PI / 2);
      const knuckleMesh = new THREE.Mesh(knuckleGeo, new THREE.MeshBasicMaterial({ color: 0xfef3c7 }));
      knuckleMesh.position.set(0, radius * 0.5, radius * 0.6);
      knuckleMesh.rotation.y = rotationY;
      group.add(knuckleMesh);
      return group;
    }

    case 'electric_stun_gun': {
      // Crackling zigzag electric bolt
      const group = new THREE.Group();
      const coreGeo = new THREE.SphereGeometry(radius * 0.8, 6, 6);
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      group.add(new THREE.Mesh(coreGeo, coreMat));

      const sparkGeo = new THREE.OctahedronGeometry(radius * 1.5, 0);
      const sparkMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: true });
      group.add(new THREE.Mesh(sparkGeo, sparkMat));
      return group;
    }

    case 'launcher': {
      // Heavy rocket missile with nose cone and fins
      const group = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, radius * 2.2, 8);
      bodyGeo.rotateX(Math.PI / 2);
      const bodyMesh = new THREE.Mesh(bodyGeo, new THREE.MeshBasicMaterial({ color: 0x334155 }));
      bodyMesh.rotation.y = rotationY;
      group.add(bodyMesh);

      const noseGeo = new THREE.ConeGeometry(radius * 0.52, radius * 0.9, 8);
      noseGeo.rotateX(Math.PI / 2);
      const noseMesh = new THREE.Mesh(noseGeo, new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      noseMesh.position.set(0, 0, radius * 1.2);
      noseMesh.rotation.y = rotationY;
      group.add(noseMesh);

      // Fiery exhaust trail
      const exhaustGeo = new THREE.SphereGeometry(radius * 0.4, 6, 6);
      const exhaustMesh = new THREE.Mesh(exhaustGeo, new THREE.MeshBasicMaterial({ color: 0xf97316 }));
      exhaustMesh.position.set(0, 0, -radius * 1.1);
      exhaustMesh.rotation.y = rotationY;
      group.add(exhaustMesh);
      return group;
    }

    case 'disk_thrower': {
      // Spinning glowing razor chakram plasma disk
      const group = new THREE.Group();
      const diskGeo = new THREE.CylinderGeometry(radius * 1.5, radius * 1.5, 0.08, 16);
      const diskMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
      const diskMesh = new THREE.Mesh(diskGeo, diskMat);
      group.add(diskMesh);

      const edgeGeo = new THREE.RingGeometry(radius * 1.4, radius * 1.7, 16);
      edgeGeo.rotateX(Math.PI / 2);
      const edgeMesh = new THREE.Mesh(edgeGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      group.add(edgeMesh);
      return group;
    }

    case 'laser_gun': {
      // High-energy concentrated beam rod
      const beamGeo = new THREE.CylinderGeometry(radius * 0.4, radius * 0.4, radius * 3.8, 8);
      beamGeo.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x6366f1 });
      const mesh = new THREE.Mesh(beamGeo, beamMat);
      mesh.rotation.y = rotationY;
      return mesh;
    }

    default: {
      const geo = new THREE.SphereGeometry(radius, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color });
      return new THREE.Mesh(geo, mat);
    }
  }
}
