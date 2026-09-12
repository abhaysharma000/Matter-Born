import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  Flame, 
  Zap, 
  Leaf, 
  Snowflake, 
  Cpu, 
  Moon, 
  Mountain, 
  Swords, 
  Shield, 
  Heart, 
  Gauge, 
  RefreshCw, 
  Play, 
  X, 
  Check, 
  Layers, 
  Eye, 
  Wand2,
  SwitchCamera,
  Smartphone,
  AlertCircle,
  Focus,
  Tag,
  Sliders,
  ChevronRight,
  Info,
  ArrowRight,
  Box,
  Activity
} from 'lucide-react';
import * as THREE from 'three';
import { BattleCreature, CreatureElement } from '../../types/creature';
import { OBJECT_PRESETS, ObjectPresetSample } from '../../data/creaturePresets';
import { Creature3DBuilder } from '../../game3d/Creature3DBuilder';
import { analyzeImageFileOrBase64 } from '../../utils/imageAnalysis';
import { deriveCombatDna } from '../../utils/combatDnaDerivation';
import { CombatDnaBlueprintView } from './CombatDnaBlueprintView';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { ExplorationDiscoveryContext } from '../../types/exploration';
import { Compass, ShieldCheck } from 'lucide-react';

interface CreatureMorphModalProps {
  onCreatureReady: (creature: BattleCreature) => void;
  onClose?: () => void;
  explorationContext?: ExplorationDiscoveryContext | null;
}

export const CreatureMorphModal: React.FC<CreatureMorphModalProps> = ({
  onCreatureReady,
  onClose,
  explorationContext,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'camera' | 'upload' | 'presets'>('camera');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [shutterFlash, setShutterFlash] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [promptHint, setPromptHint] = useState('');
  
  // AI Object Analysis 2.0 staged states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [stagedCreature, setStagedCreature] = useState<BattleCreature | null>(null);
  const [customObjectName, setCustomObjectName] = useState('');

  const [isMorphing, setIsMorphing] = useState(false);
  const [morphStep, setMorphStep] = useState('');
  const [generatedCreature, setGeneratedCreature] = useState<BattleCreature | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);
  const threeCleanupRef = useRef<(() => void) | null>(null);

  // Initialize camera when camera tab is active
  useEffect(() => {
    if (activeInputTab === 'camera' && !capturedPhoto) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [activeInputTab, capturedPhoto, facingMode]);

  const startCamera = async (facing: 'environment' | 'user' = facingMode) => {
    setIsCameraLoading(true);
    setCameraError(null);

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam API is unavailable in this browser view. Tap "Use Phone Camera" below or upload a photo!');
      setCameraActive(false);
      setIsCameraLoading(false);
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (idealErr) {
        console.warn('Ideal facing mode constraint failed, trying basic video:', idealErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraActive(true);
            setIsCameraLoading(false);
          }).catch((playErr) => {
            console.warn('Video play error on metadata load:', playErr);
            setCameraActive(true);
            setIsCameraLoading(false);
          });
        };
        videoRef.current.play().then(() => {
          setCameraActive(true);
          setIsCameraLoading(false);
        }).catch(() => {});
      } else {
        setCameraActive(true);
        setIsCameraLoading(false);
      }
    } catch (err: any) {
      console.warn('Camera access error or unsupported in environment:', err);
      let errorMsg = 'Camera access not available or blocked.';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Tap "Take Photo with Phone Camera" below or grant permission in your browser!';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this device. You can upload an image or choose an object preset!';
      }
      setCameraError(errorMsg);
      setCameraActive(false);
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleFacingMode = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
  };

  // Perform AI Object Recognition 2.0 on the captured photo
  const analyzeCapturedImage = async (imageBase64: string, hintOverride?: string) => {
    setIsAnalyzing(true);
    setAnalysisStatus('Scanning image foreground, material textures & palette...');
    try {
      const clientAnalyzed = await analyzeImageFileOrBase64(imageBase64);
      setAnalysisStatus('Synthesizing Object DNA & Physical Traits...');

      const res = await fetch('/api/creature/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          promptHint: hintOverride !== undefined ? hintOverride : promptHint,
          clientAnalyzed,
        }),
      });

      const data = await res.json();
      if (data.success && data.creature) {
        const creature: BattleCreature = {
          ...data.creature,
          id: `creature-${Date.now()}`,
          capturedImageUrl: imageBase64,
          createdAt: Date.now(),
        };
        setStagedCreature(creature);
        setCustomObjectName(
          creature.objectDna?.objectIdentity?.canonicalName ||
          creature.originalObject ||
          creature.name
        );
      } else {
        throw new Error(data.errorMsg || 'Failed to analyze object DNA');
      }
    } catch (err) {
      console.warn('Analysis fallback:', err);
      const template = OBJECT_PRESETS[0].defaultCreature;
      const fallbackCreature: BattleCreature = {
        ...template,
        id: `creature-${Date.now()}`,
        capturedImageUrl: imageBase64,
        originalObject: hintOverride || promptHint || 'Ambient Real-World Artifact',
        name: hintOverride ? `Titan ${hintOverride}` : 'Iron-Aegis Sentinel',
        createdAt: Date.now(),
      };
      setStagedCreature(fallbackCreature);
      setCustomObjectName(fallbackCreature.originalObject);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    setShutterFlash(true);
    setTimeout(() => setShutterFlash(false), 180);
    try {
      sound.playClick();
    } catch {}

    const width = video.videoWidth || video.clientWidth || 640;
    const height = video.videoHeight || video.clientHeight || 480;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedPhoto(base64);
      stopCamera();
      analyzeCapturedImage(base64);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedPhoto(base64);
      analyzeCapturedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (preset: ObjectPresetSample) => {
    setCapturedPhoto(preset.imagePlaceholder);
    setPromptHint(preset.name);
    analyzeCapturedImage(preset.imagePlaceholder, preset.name);
  };

  // Final Transformation confirmation
  const confirmTransformation = () => {
    if (!stagedCreature) return;
    setIsMorphing(true);
    setMorphStep('Materializing Cybertronian Chassis & Armor Plates...');

    try {
      sound.playCapture(0.2);
    } catch {}

    const effectiveObject = customObjectName || stagedCreature.originalObject;
    const derivedDna = stagedCreature.combatDna || deriveCombatDna({
      ...stagedCreature,
      originalObject: effectiveObject,
    });

    const updatedCreature: BattleCreature = {
      ...stagedCreature,
      originalObject: effectiveObject,
      combatDna: derivedDna,
      name: stagedCreature.name,
      objectDna: stagedCreature.objectDna ? {
        ...stagedCreature.objectDna,
        objectIdentity: {
          ...stagedCreature.objectDna.objectIdentity,
          canonicalName: effectiveObject || stagedCreature.objectDna.objectIdentity.canonicalName,
        },
      } : undefined,
    };

    setTimeout(() => {
      setGeneratedCreature(updatedCreature);
      setIsMorphing(false);
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    }, 600);
  };

  // 3D Creature Interactive Preview in Reveal Screen
  useEffect(() => {
    if (!generatedCreature || !previewCanvasRef.current) return;

    if (threeCleanupRef.current) {
      threeCleanupRef.current();
    }

    const container = previewCanvasRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 260;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.6, 6.8);
    camera.lookAt(0, 2.0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 10, 7);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const model = Creature3DBuilder.buildCreature(generatedCreature);
    scene.add(model.root);

    let animId: number;
    const renderLoop = () => {
      const t = performance.now() * 0.001;
      model.root.rotation.y = t * 1.0;
      model.updateAnimation(t, true, false, false);
      renderer.render(scene, camera);
      animId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const cleanup = () => {
      cancelAnimationFrame(animId);
      model.dispose();
      renderer.dispose();
    };
    threeCleanupRef.current = cleanup;

    return cleanup;
  }, [generatedCreature]);

  const getElementBadge = (el: CreatureElement) => {
    switch (el) {
      case 'fire':
        return <span className="flex items-center gap-1 text-xs font-bold text-orange-600"><Flame className="w-3.5 h-3.5" /> Fire</span>;
      case 'electric':
        return <span className="flex items-center gap-1 text-xs font-bold text-amber-600"><Zap className="w-3.5 h-3.5" /> Electric</span>;
      case 'nature':
        return <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><Leaf className="w-3.5 h-3.5" /> Nature</span>;
      case 'ice':
        return <span className="flex items-center gap-1 text-xs font-bold text-cyan-600"><Snowflake className="w-3.5 h-3.5" /> Ice</span>;
      case 'cyber':
        return <span className="flex items-center gap-1 text-xs font-bold text-fuchsia-600"><Cpu className="w-3.5 h-3.5" /> Cyber</span>;
      case 'void':
        return <span className="flex items-center gap-1 text-xs font-bold text-purple-600"><Moon className="w-3.5 h-3.5" /> Void</span>;
      case 'rock':
      default:
        return <span className="flex items-center gap-1 text-xs font-bold text-stone-600"><Mountain className="w-3.5 h-3.5" /> Earth/Rock</span>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] p-4 sm:p-7 space-y-4 sm:space-y-6 shadow-2xl relative my-auto max-h-[94vh] overflow-y-auto text-[#143823]">
        
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 rounded-lg bg-[#E8F2EA] hover:bg-[#DFEDE2] text-[#4D6957] hover:text-[#143823] z-10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="text-center space-y-1 sm:space-y-1.5">
          {explorationContext ? (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white border border-emerald-500/50 shadow-md text-left mb-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-400 text-amber-950">
                    <Compass className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                      Real-World Expedition Perk Active ({explorationContext.tier})
                    </span>
                    <h4 className="font-heading font-black text-sm text-white">
                      {explorationContext.milestoneTitle} • {explorationContext.distanceMeters}m Explored
                    </h4>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded-md border border-emerald-600/40">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Stationary Verified</span>
                </div>
              </div>
              <p className="text-xs text-emerald-200 mt-1.5 pt-1.5 border-t border-emerald-700/50">
                <strong className="text-amber-300">{explorationContext.bonusTitle}:</strong> {explorationContext.bonusDescription}
              </p>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold uppercase tracking-wider">
              <Wand2 className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
              <span>Object Recognition 2.0 Chamber</span>
            </div>
          )}
          <h2 className="text-xl sm:text-3xl font-black font-heading text-[#143823] leading-tight">
            Photograph Any Real Object → Battle Mech
          </h2>
          <p className="text-xs sm:text-sm text-[#4D6957] max-w-lg mx-auto">
            Photograph any physical item. Multimodal AI extracts its matter, geometry, and signature features before morphing into an authentic 3D fighter!
          </p>
        </div>

        {/* Phase 1: Capture or Select Object */}
        {!generatedCreature && !isMorphing && (
          <div className="space-y-4">
            
            {/* Input Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 rounded-xl bg-[#DFEFE2] border border-[#BCD8C3]">
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('camera');
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'camera'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span><span className="hidden xs:inline">Live </span>Camera</span>
              </button>
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('upload');
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'upload'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span><span className="hidden xs:inline">Upload </span>Photo</span>
              </button>
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('presets');
                }}
                className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'presets'
                    ? 'bg-emerald-700 text-white shadow-xs font-bold'
                    : 'text-[#4D6957] hover:text-[#143823]'
                }`}
              >
                <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span><span className="hidden xs:inline">Object </span>Presets</span>
              </button>
            </div>

            {/* Hidden Native Camera Input for instant mobile camera shutter access */}
            <input
              ref={nativeCameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Camera Viewfinder */}
            {activeInputTab === 'camera' && !capturedPhoto && (
              <div className="space-y-3">
                <div className="relative aspect-video rounded-xl bg-stone-900 border-2 border-emerald-600/40 overflow-hidden flex items-center justify-center">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      cameraActive ? 'opacity-100' : 'opacity-0'
                    }`}
                  />

                  {/* Camera Loading or Error Fallback Overlay */}
                  {(!cameraActive || isCameraLoading) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-stone-900/90 z-10 space-y-3">
                      {isCameraLoading ? (
                        <>
                          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm font-bold text-white">Starting Camera Sensor...</p>
                          <p className="text-xs text-stone-300">Connecting to device camera stream</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                          <p className="text-xs sm:text-sm text-stone-200 max-w-sm">
                            {cameraError || 'Camera stream is blocked or unavailable in this window.'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startCamera(facingMode)}
                              className="px-3.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Retry Stream</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => nativeCameraInputRef.current?.click()}
                              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                            >
                              <Smartphone className="w-3.5 h-3.5" />
                              <span>Use Phone Camera App</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Shutter Flash Animation Overlay */}
                  <div
                    className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 z-20 ${
                      shutterFlash ? 'opacity-90' : 'opacity-0'
                    }`}
                  />

                  {/* Live Viewfinder Overlays & Controls */}
                  {cameraActive && (
                    <>
                      <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-auto z-10">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#F4F9F4]/95 backdrop-blur-md border border-emerald-400 text-emerald-950 text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>OBJECT SENSOR ({facingMode === 'environment' ? 'REAR' : 'FRONT'})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={toggleFacingMode}
                            title="Flip Camera (Front/Rear)"
                            className="px-2.5 py-1.5 rounded-lg bg-[#F4F9F4]/95 backdrop-blur-md border border-[#BCD8C3] hover:border-emerald-600 text-[#143823] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <SwitchCamera className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Flip</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            title="Take Photo with Device Camera"
                            className="px-2.5 py-1.5 rounded-lg bg-[#F4F9F4]/95 backdrop-blur-md border border-[#BCD8C3] hover:border-emerald-600 text-[#143823] text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Phone App</span>
                          </button>
                        </div>
                      </div>

                      <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400/30 m-6 rounded-lg flex items-center justify-center">
                        <div className="w-14 h-14 border-2 border-dashed border-emerald-400/60 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                        </div>
                        <div className="absolute bottom-2 text-[10px] uppercase font-bold tracking-wider text-white bg-black/60 px-2 py-0.5 rounded">
                          Center Physical Object
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Shutter Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    disabled={!cameraActive}
                    className={`py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition-all ${
                      cameraActive
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-700/20 active:scale-98 cursor-pointer'
                        : 'bg-[#DFEFE2] text-stone-400 cursor-not-allowed border border-[#BCD8C3]'
                    }`}
                  >
                    <Camera className="w-5 h-5 text-emerald-100" />
                    <span>CAPTURE SNAPSHOT</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="py-3.5 px-4 rounded-xl bg-[#E8F2EA] hover:bg-[#DFEDE2] border border-[#BCD8C3] hover:border-emerald-600 text-[#143823] font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5 text-emerald-700" />
                    <span>USE PHONE CAMERA APP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Upload View */}
            {activeInputTab === 'upload' && !capturedPhoto && (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-[#BCD8C3] hover:border-emerald-600 bg-[#E8F2EA] cursor-pointer p-6 transition-colors">
                  <Upload className="w-10 h-10 text-emerald-700 mb-2" />
                  <span className="text-sm font-bold text-[#143823]">Click or Drag & Drop Any Object Photo</span>
                  <span className="text-xs text-[#4D6957] mt-1">Accepts JPG, PNG, WEBP from your phone or device</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Presets Grid */}
            {activeInputTab === 'presets' && !capturedPhoto && (
              <div className="space-y-2">
                <p className="text-xs text-[#4D6957]">
                  Select an everyday real-world object to analyze:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {OBJECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] hover:border-emerald-600 text-left transition-all hover:scale-[1.02] flex items-center gap-2.5 group shadow-xs cursor-pointer"
                    >
                      <span className="text-2xl">{preset.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-[#143823] truncate group-hover:text-emerald-700">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-[#587563] truncate">
                          {preset.category}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Object Analysis 2.0 In-Progress Card */}
            {isAnalyzing && (
              <div className="p-6 rounded-xl bg-[#E8F2EA] border border-emerald-300 text-center space-y-3 animate-fadeIn">
                <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <div className="text-sm font-black text-[#143823]">AI OBJECT RECOGNITION 2.0</div>
                  <div className="text-xs text-emerald-800 font-mono font-medium">{analysisStatus}</div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* AI ANALYSIS UI (PRE-TRANSFORMATION INSPECTION) */}
            {/* ======================================================== */}
            {capturedPhoto && !isAnalyzing && stagedCreature && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Photo & Identity Banner */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#E8F2EA] border border-[#BCD8C3] flex flex-col sm:flex-row gap-3.5 items-start">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-[#BCD8C3] bg-stone-900">
                    <img src={capturedPhoto} alt="Analyzed" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setStagedCreature(null);
                        if (activeInputTab === 'camera') startCamera(facingMode);
                      }}
                      className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white flex items-center gap-1 hover:bg-black transition-colors"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Retake
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase">
                        AI Recognised
                      </span>
                      {stagedCreature.objectDna?.objectIdentity?.recognitionConfidence !== undefined && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          stagedCreature.objectDna.objectIdentity.recognitionConfidence >= 0.8
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {Math.round(stagedCreature.objectDna.objectIdentity.recognitionConfidence * 100)}% Confidence
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-[#587563]">
                        {stagedCreature.objectDna?.objectIdentity?.objectCategory || 'Physical Artifact'}
                      </span>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-bold text-[#587563] block">
                        Detected Physical Object (Editable)
                      </label>
                      <div className="flex items-center gap-2 mt-0.5">
                        <input
                          type="text"
                          value={customObjectName}
                          onChange={(e) => setCustomObjectName(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-[#F4F9F4] border border-[#BCD8C3] text-sm font-black text-[#143823] focus:outline-none focus:border-emerald-600"
                        />
                        <button
                          type="button"
                          onClick={() => analyzeCapturedImage(capturedPhoto, customObjectName)}
                          title="Re-analyze with updated hint"
                          className="px-2.5 py-1.5 rounded-lg bg-[#DFEFE2] hover:bg-[#BCD8C3] text-xs font-bold text-[#143823] flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span className="hidden sm:inline">Re-Scan</span>
                        </button>
                      </div>
                    </div>

                    {/* Alternative Interpretations Chips */}
                    {stagedCreature.objectDna?.objectIdentity?.alternativeInterpretations && stagedCreature.objectDna.objectIdentity.alternativeInterpretations.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-[#587563] font-bold">Alternatives:</span>
                        {stagedCreature.objectDna.objectIdentity.alternativeInterpretations.map((alt, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setCustomObjectName(alt);
                              analyzeCapturedImage(capturedPhoto, alt);
                            }}
                            className="px-2 py-0.5 rounded-md bg-[#F4F9F4] border border-[#CFE2D3] hover:border-emerald-600 text-[10px] font-medium text-[#143823] transition-colors cursor-pointer"
                          >
                            {alt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Physical Matter & Material Properties Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#587563]">Material</div>
                    <div className="text-xs font-black text-[#143823] truncate">
                      {stagedCreature.objectDna?.physicalIdentity?.materialCandidates?.[0] || stagedCreature.materialPhysics?.materialName || 'Polymer Alloy'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#587563]">Scale Tier</div>
                    <div className="text-xs font-black text-emerald-800 uppercase">
                      {stagedCreature.objectDna?.physicalIdentity?.estimatedSizeClass || stagedCreature.objectComplexity?.scaleTier || 'Medium'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#587563]">Rigidity</div>
                    <div className="text-xs font-black text-[#143823] capitalize">
                      {stagedCreature.objectDna?.physicalIdentity?.rigidity || 'semi-rigid'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#587563]">Combat Class</div>
                    <div className="text-xs font-black text-emerald-800">
                      {stagedCreature.objectDna?.gameplayIdentity?.suggestedClass || stagedCreature.robotClass || 'Warrior'}
                    </div>
                  </div>
                </div>

                {/* Signature Features Detected */}
                {((stagedCreature.objectDna?.signatureFeatures && stagedCreature.objectDna.signatureFeatures.length > 0) ||
                  (stagedCreature.objectDna?.visualFingerprint?.signatureFeatures && stagedCreature.objectDna.visualFingerprint.signatureFeatures.length > 0)) && (
                  <div className="p-3 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#143823]">
                      <Focus className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Signature Visual Features Detected</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(stagedCreature.objectDna?.signatureFeatures || stagedCreature.objectDna?.visualFingerprint?.signatureFeatures || []).map((feat, i) => (
                        <span key={i} className="px-2 py-0.5 rounded-md bg-[#F4F9F4] border border-emerald-300 text-[11px] font-medium text-emerald-950 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gameplay Consequence Buffs */}
                {stagedCreature.objectDna?.gameplayIdentity?.propertyConsequences && stagedCreature.objectDna.gameplayIdentity.propertyConsequences.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
                    <div className="text-[10px] uppercase font-bold text-emerald-900 flex items-center gap-1">
                      <Shield className="w-3 h-3 text-emerald-700" />
                      <span>Physical Property Consequences:</span>
                    </div>
                    <div className="text-xs text-[#4D6957]">
                      {stagedCreature.objectDna.gameplayIdentity.propertyConsequences.map(pc => `${pc.property}: ${pc.effect}`).join(" • ")}
                    </div>
                  </div>
                )}

                {/* Visual Transmutation Blueprint Preview */}
                {(() => {
                  const stagedVt = stagedCreature.visualTransmutation || stagedCreature.objectDna?.visualTransmutation || stagedCreature.visualParams?.visualTransmutation;
                  if (!stagedVt) return null;
                  return (
                    <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-emerald-300/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-black text-[#143823]">
                          <Box className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Visual Transmutation 2.0 Blueprint</span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F4F9F4] border border-emerald-300 text-emerald-900 font-bold uppercase">
                          {stagedVt.silhouette.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-1.5 rounded bg-[#F4F9F4] border border-[#CFE2D3]">
                          <span className="text-[10px] uppercase font-bold text-[#587563] block">Chassis Silhouette</span>
                          <span className="font-bold text-[#143823] capitalize truncate block">{stagedVt.silhouette.replace('_', ' ')}</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#F4F9F4] border border-[#CFE2D3]">
                          <span className="text-[10px] uppercase font-bold text-[#587563] block">PBR Surface Finish</span>
                          <span className="font-bold text-[#143823] capitalize truncate block">{stagedVt.surfaceMaterial}</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#F4F9F4] border border-[#CFE2D3] col-span-2 sm:col-span-1">
                          <span className="text-[10px] uppercase font-bold text-[#587563] block">Metallic / Roughness</span>
                          <span className="font-bold text-[#143823] font-mono">
                            {Math.round(stagedVt.metallic * 100)}% / {Math.round(stagedVt.roughness * 100)}%
                          </span>
                        </div>
                      </div>

                      {stagedVt.transmutationMappings && stagedVt.transmutationMappings.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[10px] uppercase font-bold text-[#587563]">Planned Geometry Transmutations:</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {stagedVt.transmutationMappings.slice(0, 4).map((m, idx) => (
                              <div key={idx} className="p-1.5 rounded-lg bg-[#F4F9F4] border border-[#BCD8C3] text-[10px] flex items-center justify-between">
                                <span className="font-medium text-[#143823] truncate max-w-[46%]">{m.originalFeature}</span>
                                <ArrowRight className="w-3 h-3 text-emerald-600 shrink-0 mx-1" />
                                <span className="font-bold text-emerald-900 truncate max-w-[48%] text-right">{m.robotFeature}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Combat DNA 3.0: Physical Properties to Combat Mechanics Preview */}
                <CombatDnaBlueprintView creature={stagedCreature} variant="compact" />

                {/* Final Trigger Transformation CTA */}
                <button
                  onClick={confirmTransformation}
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-700/25 active:scale-98 transition-all cursor-pointer"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                  <span>TRANSFORM INTO 3D BATTLE ROBOT</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 2: Morphing Loading Matrix */}
        {isMorphing && (
          <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-600/30 border-t-emerald-600 animate-spin" />
              <div className="absolute inset-3 rounded-full border-4 border-amber-600/30 border-b-amber-600 animate-spin [animation-direction:reverse]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                ⚡
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black font-heading text-[#143823]">
                ROBOT TRANSFORMATION IN PROGRESS
              </h3>
              <p className="text-xs text-emerald-800 font-mono font-bold animate-pulse">
                {morphStep}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#587563]">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Synthesizing Object DNA via Gemini Multimodal AI</span>
            </div>
          </div>
        )}

        {/* Phase 3: Creature Reveal & 3D Interactive Inspection */}
        {generatedCreature && !isMorphing && (
          <div className="space-y-5 animate-fadeIn">
            
            {/* Creature Identity Header */}
            <div className="p-4 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {generatedCreature.faction && (
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase border ${
                      generatedCreature.faction === 'Decepticon' 
                        ? 'bg-purple-100 border-purple-300 text-purple-900' 
                        : 'bg-red-100 border-red-300 text-red-900'
                    }`}>
                      {generatedCreature.faction === 'Decepticon' ? '⚔️ DECEPTICON' : '🛡️ AUTOBOT'}
                    </span>
                  )}
                  {generatedCreature.robotClass && (
                    <span className="px-2 py-0.5 rounded-md bg-[#F4F9F4] border border-[#BCD8C3] text-[#143823] text-xs font-black uppercase">
                      {generatedCreature.robotClass}
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 border border-emerald-300 text-emerald-900 font-black text-xs uppercase">
                    {generatedCreature.rarity}
                  </span>
                  {getElementBadge(generatedCreature.element)}
                </div>

                <span className="text-[11px] font-bold text-emerald-900 font-mono bg-emerald-100/90 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>VISUAL TRANSMUTATION 2.0</span>
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-black font-heading text-[#143823]">
                  {generatedCreature.name}
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  Transformed from: <strong>{generatedCreature.originalObject}</strong>
                </p>
                <p className="text-xs text-[#4D6957] italic mt-1 line-clamp-2">
                  "{generatedCreature.lore}"
                </p>
              </div>
            </div>

            {/* Visual Transmutation 2.0: Side-by-Side Causal Lineage */}
            {(() => {
              const vt = generatedCreature.visualTransmutation || generatedCreature.objectDna?.visualTransmutation || generatedCreature.visualParams?.visualTransmutation;
              return (
                <div className="p-4 rounded-xl bg-[#E8F2EA] border border-emerald-300/90 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-950 font-mono">
                        Visual Lineage Comparison
                      </span>
                    </div>
                    {vt?.silhouette && (
                      <span className="text-[10px] font-bold text-emerald-900 font-mono bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 uppercase">
                        {vt.silhouette.replace('_', ' ')} CHASSIS
                      </span>
                    )}
                  </div>

                  {/* Split Visual Viewport */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                    {/* Real Physical Object Card */}
                    <div className="relative rounded-xl border border-[#BCD8C3] bg-stone-900 overflow-hidden flex flex-col justify-between min-h-[220px]">
                      {capturedPhoto ? (
                        <img src={capturedPhoto} alt={generatedCreature.originalObject} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-stone-500 text-xs">Physical Image Source</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/50 pointer-events-none" />
                      
                      <div className="relative z-10 p-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20">
                          SCANNED OBJECT
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-wider">
                          ORIGIN
                        </span>
                      </div>

                      <div className="relative z-10 p-2.5 space-y-1">
                        <div className="text-sm font-black text-white drop-shadow-sm truncate">
                          {generatedCreature.originalObject}
                        </div>
                        {/* Signature Visual Features Found */}
                        <div className="flex flex-wrap gap-1">
                          {(vt?.signatureFeatures || generatedCreature.objectDna?.signatureFeatures || [generatedCreature.objectFeature]).slice(0, 3).map((feat, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-black/60 backdrop-blur-xs text-[9px] font-medium text-emerald-300 border border-emerald-400/40">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3D Battle Mech Viewport */}
                    <div className="relative rounded-xl border border-emerald-300/80 bg-gradient-to-b from-[#E0EFE3] to-[#CFE5D3] overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div ref={previewCanvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
                      
                      <div className="relative z-10 p-2.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2 py-0.5 rounded bg-emerald-950/80 backdrop-blur-xs text-emerald-100 text-[10px] font-bold border border-emerald-500/30">
                          CYBERTRONIAN MECH
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider">
                          LIVE 3D
                        </span>
                      </div>

                      <div className="relative z-10 p-2.5 space-y-0.5 pointer-events-none bg-gradient-to-t from-[#E8F2EA]/95 via-[#E8F2EA]/70 to-transparent">
                        <div className="text-sm font-black text-[#143823] truncate">
                          {generatedCreature.name}
                        </div>
                        <div className="text-[10px] text-emerald-800 font-medium flex items-center gap-1">
                          <Eye className="w-3 h-3 text-emerald-600" />
                          <span>360° Real-Time View (Drag to rotate)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Visual Transmutation Blueprint */}
                  {vt && (
                    <div className="p-3 rounded-lg bg-[#F4F9F4] border border-[#BCD8C3] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-950 flex items-center gap-1">
                          <Box className="w-3 h-3 text-emerald-700" />
                          <span>Transmutation Blueprint & Lineage:</span>
                        </span>
                        <span className="text-[10px] text-[#4D6957] font-mono">
                          Proportions: W:{vt.bodyProportions?.width || 1} • H:{vt.bodyProportions?.height || 1} • D:{vt.bodyProportions?.depth || 1}
                        </span>
                      </div>

                      {/* Physical PBR & Silhouette properties */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                        <div className="p-1.5 rounded bg-[#E8F2EA] border border-[#CFE2D3]">
                          <span className="text-[9px] uppercase font-bold text-[#587563] block">Silhouette Armor</span>
                          <span className="font-bold text-[#143823] capitalize truncate block">{vt.silhouette.replace('_', ' ')}</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#E8F2EA] border border-[#CFE2D3]">
                          <span className="text-[9px] uppercase font-bold text-[#587563] block">PBR Surface</span>
                          <span className="font-bold text-[#143823] capitalize truncate block">{vt.surfaceMaterial}</span>
                        </div>
                        <div className="p-1.5 rounded bg-[#E8F2EA] border border-[#CFE2D3] col-span-2 sm:col-span-1">
                          <span className="text-[9px] uppercase font-bold text-[#587563] block">Metallic / Roughness</span>
                          <span className="font-bold text-[#143823] font-mono">
                            {Math.round(vt.metallic * 100)}% / {Math.round(vt.roughness * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* Feature Mappings Table */}
                      {vt.transmutationMappings && vt.transmutationMappings.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <div className="text-[9px] uppercase font-bold text-[#587563]">Physical-to-Mech Mechanical Mappings:</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {vt.transmutationMappings.map((m, idx) => (
                              <div key={idx} className="p-2 rounded-md bg-[#E8F2EA] border border-[#CFE2D3] text-[10px] space-y-0.5">
                                <div className="flex items-center justify-between font-bold">
                                  <span className="text-[#143823] truncate max-w-[46%]">{m.originalFeature}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-emerald-600 shrink-0 mx-1" />
                                  <span className="text-emerald-900 truncate max-w-[48%] text-right">{m.robotFeature}</span>
                                </div>
                                <div className="text-[9px] text-[#4D6957] italic truncate">
                                  {m.visualEffect}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Object DNA 2.0 Signature Features & Real-World Mass Tier Card */}
            {generatedCreature.objectComplexity && (
              <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-emerald-300/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex flex-col items-center justify-center font-black text-[10px] uppercase shadow-xs shrink-0">
                    <span>{generatedCreature.objectComplexity.scaleTier === 'colossal' ? 'TITAN' :
                           generatedCreature.objectComplexity.scaleTier === 'large' ? 'HEAVY' :
                           generatedCreature.objectComplexity.scaleTier === 'micro' ? 'SCOUT' : 'WARRIOR'}</span>
                    <span className="text-[8px] opacity-80">{generatedCreature.objectComplexity.scaleTier}</span>
                  </div>
                  <div>
                    <div className="text-xs font-black text-[#14532D] flex items-center gap-1.5 flex-wrap">
                      <span>{generatedCreature.objectComplexity.tierLabel}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                        {generatedCreature.objectComplexity.statMultiplier}x Stat Multiplier
                      </span>
                    </div>
                    <div className="text-[11px] text-[#4D6957] mt-0.5">
                      {generatedCreature.objectComplexity.physicalMassDesc} • Structural Complexity: <strong>{generatedCreature.objectComplexity.complexityScore}/100</strong>
                    </div>
                  </div>
                </div>

                <div className="self-end sm:self-auto text-right pl-2 border-t sm:border-t-0 sm:border-l border-[#CFE2D3] pt-1 sm:pt-0">
                  <div className="text-[10px] uppercase font-bold text-[#587563]">Combat Power</div>
                  <div className="text-base font-black text-emerald-900 font-mono">⚡ {generatedCreature.objectComplexity.powerRating}</div>
                </div>
              </div>
            )}

            {/* Combat DNA 3.0: Full Physical Mechanics Derivation Blueprint */}
            <CombatDnaBlueprintView creature={generatedCreature} variant="full" />

            {/* Stats Matrix */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-600" />
                  <span>HP</span>
                </div>
                <div className="text-lg font-black text-[#143823]">{generatedCreature.stats.hp}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
                  <Swords className="w-3.5 h-3.5 text-amber-600" />
                  <span>Attack</span>
                </div>
                <div className="text-lg font-black text-[#143823]">{generatedCreature.stats.attack}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Defense</span>
                </div>
                <div className="text-lg font-black text-[#143823]">{generatedCreature.stats.defense}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#E8F2EA] border border-[#CFE2D3] text-center space-y-0.5">
                <div className="text-[10px] uppercase font-bold text-[#4D6957] flex items-center justify-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Speed</span>
                </div>
                <div className="text-lg font-black text-[#143823]">{generatedCreature.stats.speed}</div>
              </div>
            </div>

            {/* Special Ability Card */}
            <div className="p-3.5 rounded-xl bg-[#E8F2EA] border border-emerald-200 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-700 text-white shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-[#143823]">
                    {generatedCreature.specialAbility.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F4F9F4] border border-emerald-200 text-emerald-900 font-mono">
                    {generatedCreature.specialAbility.cooldown}s CD
                  </span>
                  <span className="text-[10px] text-amber-800 font-bold">
                    {generatedCreature.specialAbility.damage} DMG
                  </span>
                </div>
                <p className="text-xs text-[#4D6957]">
                  {generatedCreature.specialAbility.description}
                </p>
              </div>
            </div>

            {/* Battle Entry Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                onClick={() => {
                  setGeneratedCreature(null);
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                }}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-[#E8F2EA] hover:bg-[#DFEDE2] border border-[#BCD8C3] text-[#143823] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Scan Another Object</span>
              </button>

              <button
                onClick={() => {
                  const finalCreature: BattleCreature = {
                    ...generatedCreature,
                    ...(explorationContext
                      ? {
                          explorationDistanceMeters: explorationContext.distanceMeters,
                          explorationTier: explorationContext.tier,
                          explorationBonusTitle: explorationContext.bonusTitle,
                          explorationBonusPerk: explorationContext.bonusDescription,
                        }
                      : {}),
                  };
                  onCreatureReady(finalCreature);
                }}
                className="w-full sm:flex-1 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>ENTER 3D BATTLE ARENA</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

