import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BattleCreature } from '../../types/creature';
import { Creature3DBuilder, Creature3DModel } from '../../game3d/Creature3DBuilder';
import { Sparkles, Camera, Shield, Swords, Zap, Heart } from 'lucide-react';
import confetti from 'canvas-confetti';

interface LobbyPetStageProps {
  creature: BattleCreature;
  onSnapNew: () => void;
  onPlayBattle: () => void;
}

export const LobbyPetStage: React.FC<LobbyPetStageProps> = ({
  creature,
  onSnapNew,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const animRef = useRef<number | null>(null);
  const [isWalkingMode, setIsWalkingMode] = useState<boolean>(true);
  const isWalkingRef = useRef<boolean>(true);

  useEffect(() => {
    isWalkingRef.current = isWalkingMode;
  }, [isWalkingMode]);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 380;
    const height = container.clientHeight || 320;

    // Scene & Camera adjusted for complete full body framing
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    dirLight.position.set(4, 7, 5);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0xa7f3d0, 0.85);
    backLight.position.set(-4, 3, -4);
    scene.add(backLight);

    // Dark Futuristic Sci-Fi Pedestal with glowing emerald accent
    const pedestalGroup = new THREE.Group();
    const pedGeo = new THREE.CylinderGeometry(2.0, 2.1, 0.25, 32);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x0c251c,
      roughness: 0.35,
      metalness: 0.75,
    });
    const pedestalMesh = new THREE.Mesh(pedGeo, pedMat);
    pedestalMesh.position.y = -0.125;
    pedestalMesh.receiveShadow = true;
    pedestalGroup.add(pedestalMesh);

    // Glowing Neon Emerald Accent Ring on floor edge
    const ringGeo = new THREE.TorusGeometry(2.02, 0.04, 16, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      metalness: 0.2,
      roughness: 0.2,
      emissive: 0x059669,
      emissiveIntensity: 0.85,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.005;
    pedestalGroup.add(ringMesh);

    scene.add(pedestalGroup);

    // Build 3D Creature (Standing directly on top of pedestal floor)
    const creatureModel: Creature3DModel = Creature3DBuilder.buildCreature(creature);
    scene.add(creatureModel.root);

    // Dynamic Full-Body Bounding Box Camera Framing:
    // Guarantees 100% visibility of entire robot (from tallest crest/antennas down to magnetic footplates)
    const frameCameraToModel = () => {
      const bbox = new THREE.Box3().setFromObject(creatureModel.root);
      bbox.expandByObject(pedestalGroup);

      const size = new THREE.Vector3();
      bbox.getSize(size);
      const center = new THREE.Vector3();
      bbox.getCenter(center);

      // Model vertical extent
      const modelTop = bbox.max.y;
      const modelBottom = Math.min(-0.25, bbox.min.y);
      const totalH = modelTop - modelBottom;

      // Look at vertical center of the mech body
      const targetY = (modelTop + modelBottom) * 0.48;

      const fovRad = (camera.fov * Math.PI) / 180;
      const currentW = container.clientWidth || width;
      const currentH = container.clientHeight || height;
      const aspect = currentW / currentH;
      const hFovRad = 2 * Math.atan(Math.tan(fovRad / 2) * aspect);

      // Generous 1.55x padding margin to ensure breathing room above the head and around wings/weapons
      const distV = ((totalH * 0.5) * 1.55) / Math.tan(fovRad / 2);
      const distH = ((size.x * 0.5) * 1.55) / Math.tan(hFovRad / 2);
      const optimalDist = Math.max(distV, distH, 9.6);

      camera.position.set(0, targetY + 0.35, optimalDist);
      camera.lookAt(0, targetY, 0);
    };

    frameCameraToModel();

    let isAttackingAnim = false;
    let attackTimer = 0;

    // Interactive 360° Drag-to-Rotate Control
    let isDragging = false;
    let previousX = 0;
    let rotationAngle = 0;
    let dragDistance = 0;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragDistance = 0;
      previousX = e.clientX;
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousX;
      dragDistance += Math.abs(deltaX);
      rotationAngle += deltaX * 0.012;
      previousX = e.clientX;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (isDragging && dragDistance < 5) {
        // Crisp tap: trigger battle strike animation
        isAttackingAnim = true;
        attackTimer = 0.6;
        confetti({ particleCount: 25, spread: 55, origin: { y: 0.65 } });
      }
      isDragging = false;
      try {
        (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      if (isAttackingAnim) {
        attackTimer -= delta;
        if (attackTimer <= 0) {
          isAttackingAnim = false;
        }
      }

      // Smooth idle turntable rotation when not dragging
      if (!isDragging) {
        rotationAngle += 0.005;
      }
      creatureModel.root.rotation.y = rotationAngle;

      // Update model animations (walks on top of platform floor or stands in guard stance)
      creatureModel.updateAnimation(elapsedTime, isWalkingRef.current, isAttackingAnim, false);

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      frameCameraToModel();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      creatureModel.dispose();
      pedGeo.dispose();
      pedMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [creature]);

  const isDecepticon = creature.faction === 'Decepticon';

  return (
    <div className="relative w-full rounded-3xl bg-[#F4F8F5] border border-[#CBDED2] p-4 sm:p-5 flex flex-col justify-between overflow-hidden shadow-xl">
      {/* Background ambient sci-fi glow */}
      <div className="absolute inset-0 bg-radial from-emerald-500/8 via-transparent to-transparent pointer-events-none" />
      
      {/* Top Info Bar */}
      <div className="w-full flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          {creature.faction && (
            <span className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider ${
              isDecepticon
                ? 'bg-purple-100 text-purple-900 border border-purple-300'
                : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
            }`}>
              {creature.faction}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-[#E2EFE5] text-[#0E3323] border border-[#B9D5C4] capitalize">
            {creature.element}
          </span>
        </div>

        <button
          onClick={onSnapNew}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors cursor-pointer shadow-sm active:scale-95"
          title="Snap a photo to morph a new robot"
        >
          <Camera className="w-3.5 h-3.5 text-white" />
          <span>Scan New</span>
        </button>
      </div>

      {/* Central 3D Interactive Stage */}
      <div className="relative w-full h-[420px] sm:h-[480px] my-1">
        <div 
          ref={mountRef} 
          className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center"
        />

        {/* Walk / Standby Stance Toggle */}
        <div className="absolute bottom-2 right-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsWalkingMode(!isWalkingMode);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E2EFE5]/90 hover:bg-[#D4E4D8] border border-[#CADCD0] text-[11px] font-bold text-[#0E3323] shadow-xs transition-colors cursor-pointer backdrop-blur-md"
            title="Toggle walking locomotion on platform"
          >
            <span className={`w-2 h-2 rounded-full ${isWalkingMode ? 'bg-emerald-600 animate-pulse' : 'bg-stone-400'}`} />
            <span>{isWalkingMode ? 'Walking' : 'Standby'}</span>
          </button>
        </div>
      </div>

      {/* Creature Identity & Origin */}
      <div className="w-full z-10 text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-black font-heading text-[#0E3323] tracking-wide">
          {creature.name}
        </h2>
        {creature.originalObject && (
          <p className="text-xs text-[#3E6953]">
            From: <span className="text-emerald-700 font-bold">{creature.originalObject}</span>
          </p>
        )}
      </div>

    </div>
  );
};
