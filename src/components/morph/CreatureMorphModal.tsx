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
  Activity,
  Key
} from 'lucide-react';
import * as THREE from 'three';
import { BattleCreature, CreatureElement } from '../../types/creature';
import { OBJECT_PRESETS, ObjectPresetSample } from '../../data/creaturePresets';
import { Creature3DBuilder } from '../../game3d/Creature3DBuilder';
import { analyzeImageFileOrBase64, deriveCreatureStatsFromComplexityAndDistance } from '../../utils/imageAnalysis';
import { deriveCombatDna } from '../../utils/combatDnaDerivation';
import { CombatDnaBlueprintView } from './CombatDnaBlueprintView';
import { sound } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { ExplorationDiscoveryContext } from '../../types/exploration';
import { Compass, ShieldCheck } from 'lucide-react';
import { applyExplorationPowerToCreature } from '../../utils/explorationPowerScaling';
import { recognizeAndGenerateCreature, getUserGeminiApiKey, saveUserGeminiApiKey } from '../../utils/geminiVisionRecognizer';

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
  
  // Gemini API Key management
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState(() => getUserGeminiApiKey());
  const [keySavedFeedback, setKeySavedFeedback] = useState(false);
  
  // AI Object Analysis 2.0 staged states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState('');
  const [stagedCreature, setStagedCreature] = useState<BattleCreature | null>(null);
  const [customObjectName, setCustomObjectName] = useState('');
  const [customRobotName, setCustomRobotName] = useState('');

  const [isMorphing, setIsMorphing] = useState(false);
  const [morphStep, setMorphStep] = useState('');
  const [generatedCreature, setGeneratedCreature] = useState<BattleCreature | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showAdvancedSpecs, setShowAdvancedSpecs] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const previewCanvasRef = useRef<HTMLDivElement | null>(null);
  const threeCleanupRef = useRef<(() => void) | null>(null);
  const stagedCanvasRef = useRef<HTMLDivElement | null>(null);
  const stagedThreeCleanupRef = useRef<(() => void) | null>(null);

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

  // Perform AI Object Recognition 2.0 on the captured photo with Gemini Multimodal Vision
  const analyzeCapturedImage = async (imageBase64: string, hintOverride?: string) => {
    setIsAnalyzing(true);
    setAnalysisStatus('Scanning image foreground, material textures & palette...');
    try {
      const clientAnalyzed = await analyzeImageFileOrBase64(imageBase64);
      setAnalysisStatus('Gemini Vision is identifying real-world object & transmuting robot...');

      const distanceMeters = explorationContext?.distanceMeters || 0;
      const effectiveHint = hintOverride !== undefined ? hintOverride : promptHint;

      const { creature } = await recognizeAndGenerateCreature(
        imageBase64,
        effectiveHint,
        clientAnalyzed,
        distanceMeters
      );

      setStagedCreature(creature);
      const recognizedObj =
        creature.objectDna?.objectIdentity?.canonicalName ||
        creature.originalObject ||
        creature.name;
      setCustomObjectName(recognizedObj);
      setCustomRobotName(creature.name || `Robot ${recognizedObj}`);
    } catch (err) {
      console.error('Recognition error:', err);
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

    const effectiveObject = (customObjectName && customObjectName.trim()) ? customObjectName.trim() : stagedCreature.originalObject;
    const effectiveRobotName = (customRobotName && customRobotName.trim()) ? customRobotName.trim() : stagedCreature.name;
    const derivedDna = stagedCreature.combatDna || deriveCombatDna({
      ...stagedCreature,
      name: effectiveRobotName,
      originalObject: effectiveObject,
    });

    const updatedCreature: BattleCreature = {
      ...stagedCreature,
      name: effectiveRobotName,
      originalObject: effectiveObject,
      combatDna: derivedDna,
      objectDna: stagedCreature.objectDna ? {
        ...stagedCreature.objectDna,
        objectIdentity: {
          ...stagedCreature.objectDna.objectIdentity,
          canonicalName: effectiveObject || stagedCreature.objectDna.objectIdentity.canonicalName,
        },
      } : undefined,
    };

    const finalCreature = explorationContext
      ? applyExplorationPowerToCreature(
          updatedCreature,
          explorationContext.distanceMeters,
          explorationContext.expeditionId
        )
      : updatedCreature;

    setTimeout(() => {
      setGeneratedCreature(finalCreature);
      setIsMorphing(false);
      confetti({ particleCount: 90, spread: 90, origin: { y: 0.6 } });
    }, 600);
  };

  // 3D Staged Robot Interactive Live Preview (Before Confirming Transformation)
  useEffect(() => {
    if (!stagedCreature || !stagedCanvasRef.current) return;

    if (stagedThreeCleanupRef.current) {
      stagedThreeCleanupRef.current();
    }

    const container = stagedCanvasRef.current;
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 180;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.5, 6.4);
    camera.lookAt(0, 1.9, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Three-point balanced studio lighting to bring out authentic object colors
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xa5c8ff, 0.9);
    fillLight.position.set(-5, 6, -5);
    scene.add(fillLight);
    const bottomLight = new THREE.DirectionalLight(0xffedd5, 0.5);
    bottomLight.position.set(0, -4, 4);
    scene.add(bottomLight);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));

    const model = Creature3DBuilder.buildCreature(stagedCreature);
    scene.add(model.root);

    let animId: number;
    const renderLoop = () => {
      const t = performance.now() * 0.001;
      model.root.rotation.y = t * 0.85;
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
    stagedThreeCleanupRef.current = cleanup;

    return cleanup;
  }, [stagedCreature]);

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

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(5, 10, 7);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xa5c8ff, 0.9);
    fillLight.position.set(-5, 6, -5);
    scene.add(fillLight);
    const bottomLight = new THREE.DirectionalLight(0xffedd5, 0.5);
    bottomLight.position.set(0, -4, 4);
    scene.add(bottomLight);
    scene.add(new THREE.AmbientLight(0xffffff, 1.1));

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
        return <span className="flex items-center gap-1 text-xs font-bold text-orange-400"><Flame className="w-3.5 h-3.5" /> Fire</span>;
      case 'electric':
        return <span className="flex items-center gap-1 text-xs font-bold text-amber-400"><Zap className="w-3.5 h-3.5" /> Electric</span>;
      case 'nature':
        return <span className="flex items-center gap-1 text-xs font-bold text-emerald-400"><Leaf className="w-3.5 h-3.5" /> Nature</span>;
      case 'ice':
        return <span className="flex items-center gap-1 text-xs font-bold text-cyan-400"><Snowflake className="w-3.5 h-3.5" /> Ice</span>;
      case 'cyber':
        return <span className="flex items-center gap-1 text-xs font-bold text-fuchsia-400"><Cpu className="w-3.5 h-3.5" /> Cyber</span>;
      case 'void':
        return <span className="flex items-center gap-1 text-xs font-bold text-purple-400"><Moon className="w-3.5 h-3.5" /> Void</span>;
      case 'rock':
      default:
        return <span className="flex items-center gap-1 text-xs font-bold text-stone-300"><Mountain className="w-3.5 h-3.5" /> Earth/Rock</span>;
    }
  };

  const handleUseThisRobot = () => {
    if (!generatedCreature) return;
    const finalCreature: BattleCreature = generatedCreature.explorationMetadata
      ? generatedCreature
      : {
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
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-xl rounded-2xl bg-[#071610] border border-[#184635] shadow-2xl relative flex flex-col max-h-[85dvh] sm:max-h-[88dvh] overflow-hidden text-white">
        
        {/* Pinned Top Bar / Header */}
        <div className="shrink-0 p-3.5 sm:p-5 border-b border-[#184635]/80 bg-[#071610]/95 relative z-10">
          {/* Key Settings Button */}
          <div className="absolute top-3 right-12 sm:top-4 sm:right-14 z-10">
            <button
              type="button"
              onClick={() => setShowKeyModal(true)}
              title="Google Gemini AI Key Settings"
              className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                getUserGeminiApiKey()
                  ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-300 shadow-xs'
                  : 'bg-[#0E281E] border-[#1C4D3A] text-[#6DAA8E] hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{getUserGeminiApiKey() ? 'AI Key Active' : 'API Key'}</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] text-[#6DAA8E] hover:text-white z-10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          {/* Header text */}
          <div className="text-center space-y-1.5 pr-8 pl-2">
            {explorationContext ? (
              <div className="p-2.5 rounded-xl bg-[#091B14] text-white border border-[#2BE29E]/40 shadow-md text-left mb-1.5">
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
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#2BE29E] bg-[#0E281E] px-2 py-1 rounded-md border border-[#1C4D3A]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#2BE29E]" />
                    <span>Stationary Verified</span>
                  </div>
                </div>
                <p className="text-xs text-emerald-200 mt-1 pt-1 border-t border-[#184635]">
                  <strong className="text-amber-300">{explorationContext.bonusTitle}:</strong> {explorationContext.bonusDescription}
                </p>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E281E] border border-[#2BE29E]/40 text-[#2BE29E] text-xs font-black uppercase tracking-wider">
                <Wand2 className="w-3.5 h-3.5 text-[#2BE29E] animate-pulse" />
                <span>ROBOT SCANNER</span>
              </div>
            )}
            <h2 className="text-lg sm:text-2xl font-black font-heading text-white tracking-wide">
              {generatedCreature && !isMorphing ? '3D Robot Ready for Battle!' : 'Scan Real Object → Battle Robot'}
            </h2>
            <p className="text-xs sm:text-sm text-[#A1D2BC] max-w-lg mx-auto">
              {generatedCreature && !isMorphing
                ? 'Your custom robot has been synthesized. Tap "Use This Robot" below to enter the arena!'
                : 'Photograph any everyday item. AI analyzes its shape, material, and powers to forge a unique 3D battle robot!'}
            </p>

            {/* Gemini API Key is embedded and active */}
          </div>
        </div>

        {/* Gemini API Key Configuration Modal Overlay */}
        {showKeyModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-md p-5 rounded-2xl bg-[#091B14] border border-[#2BE29E]/40 shadow-2xl space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-[#143B2C] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Google Gemini AI Key</h3>
                    <p className="text-[10px] text-[#6DAA8E]">For deep visual multimodal object recognition</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg bg-[#071610] text-[#6DAA8E] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] uppercase font-bold text-[#2BE29E] block">
                  Paste Google Gemini API Key
                </label>
                <input
                  type="text"
                  value={geminiKeyInput}
                  onChange={(e) => setGeminiKeyInput(e.target.value)}
                  placeholder="Paste your Gemini API key here..."
                  className="w-full px-3 py-2 rounded-xl bg-[#071610] border border-[#1C4D3A] focus:border-[#2BE29E] text-xs font-mono text-white focus:outline-none"
                />
                {geminiKeyInput && geminiKeyInput.trim().length < 10 && (
                  <div className="p-2 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[10px] leading-relaxed">
                    ⚠️ <strong>Invalid Key:</strong> API key is too short. Please paste a valid Google Gemini API key.
                  </div>
                )}
                {geminiKeyInput && geminiKeyInput.trim().length >= 10 && (
                  <div className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Valid API Key Format ✓</span>
                  </div>
                )}
                <p className="text-[10px] text-[#A1D2BC] leading-relaxed">
                  Get your free permanent API key at <strong className="text-[#2BE29E]">aistudio.google.com</strong>.
                  Keys activate immediately and have generous free tier limits for multimodal vision.
                </p>
              </div>

              {keySavedFeedback && (
                <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>API Key saved & activated!</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                {geminiKeyInput && (
                  <button
                    type="button"
                    onClick={() => {
                      saveUserGeminiApiKey('');
                      setGeminiKeyInput('');
                      setKeySavedFeedback(true);
                      setTimeout(() => setKeySavedFeedback(false), 2000);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#071610] hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Clear Key
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    saveUserGeminiApiKey(geminiKeyInput);
                    setKeySavedFeedback(true);
                    setTimeout(() => {
                      setKeySavedFeedback(false);
                      setShowKeyModal(false);
                    }, 1000);
                  }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Save & Activate Key
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Content Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 overscroll-contain">

        {/* Phase 1: Capture or Select Object */}
        {!generatedCreature && !isMorphing && (
          <div className="space-y-4">
            
            {/* Input Selection Tabs */}
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1.5 rounded-xl bg-[#091B14] border border-[#143B2C]">
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('camera');
                }}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'camera'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md font-black'
                    : 'text-[#6DAA8E] hover:text-white'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span><span className="hidden xs:inline">Live </span>Camera</span>
              </button>
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('upload');
                }}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'upload'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md font-black'
                    : 'text-[#6DAA8E] hover:text-white'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span><span className="hidden xs:inline">Upload </span>Photo</span>
              </button>
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  setActiveInputTab('presets');
                }}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer ${
                  activeInputTab === 'presets'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-md font-black'
                    : 'text-[#6DAA8E] hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
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
                <div className="relative aspect-video rounded-xl bg-[#091B14] border-2 border-[#184635] overflow-hidden flex items-center justify-center">
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[#071610]/95 z-10 space-y-3">
                      {isCameraLoading ? (
                        <>
                          <div className="w-10 h-10 border-4 border-[#2BE29E] border-t-transparent rounded-full animate-spin mx-auto" />
                          <p className="text-sm font-bold text-white">Starting Camera Sensor...</p>
                          <p className="text-xs text-[#6DAA8E]">Connecting to device camera stream</p>
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
                          <p className="text-xs sm:text-sm text-[#A1D2BC] max-w-sm">
                            {cameraError || 'Camera stream is blocked or unavailable in this window.'}
                          </p>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => startCamera(facingMode)}
                              className="px-3.5 py-2 rounded-lg bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] text-[#2BE29E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#071610]/90 backdrop-blur-md border border-[#2BE29E]/40 text-[#2BE29E] text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-[#2BE29E] animate-pulse" />
                          <span>OBJECT SENSOR ({facingMode === 'environment' ? 'REAR' : 'FRONT'})</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={toggleFacingMode}
                            title="Flip Camera (Front/Rear)"
                            className="px-2.5 py-1.5 rounded-lg bg-[#091B14]/90 backdrop-blur-md border border-[#1C4D3A] hover:border-[#2BE29E] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <SwitchCamera className="w-3.5 h-3.5 text-[#2BE29E]" />
                            <span>Flip</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            title="Take Photo with Device Camera"
                            className="px-2.5 py-1.5 rounded-lg bg-[#091B14]/90 backdrop-blur-md border border-[#1C4D3A] hover:border-[#2BE29E] text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          >
                            <Smartphone className="w-3.5 h-3.5 text-[#2BE29E]" />
                            <span>Phone App</span>
                          </button>
                        </div>
                      </div>

                      <div className="absolute inset-0 pointer-events-none border-2 border-[#2BE29E]/30 m-6 rounded-lg flex items-center justify-center">
                        <div className="w-14 h-14 border-2 border-dashed border-[#2BE29E]/60 rounded-full flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-[#2BE29E] rounded-full animate-ping" />
                        </div>
                        <div className="absolute bottom-2 text-[10px] uppercase font-bold tracking-wider text-white bg-black/75 border border-white/10 px-2.5 py-0.5 rounded">
                          Point at Any Object
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
                    className={`py-3.5 px-4 rounded-xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all ${
                      cameraActive
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-98 cursor-pointer shadow-emerald-900/40'
                        : 'bg-[#0E281E] text-stone-500 cursor-not-allowed border border-[#184635]'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                    <span>TAKE PHOTO</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="py-3.5 px-4 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] hover:border-[#2BE29E] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5 text-[#2BE29E]" />
                    <span>USE PHONE CAMERA APP</span>
                  </button>
                </div>
              </div>
            )}

            {/* Upload View */}
            {activeInputTab === 'upload' && !capturedPhoto && (
              <div className="space-y-3">
                <label className="flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed border-[#1C4D3A] hover:border-[#2BE29E] bg-[#091B14] cursor-pointer p-6 transition-colors">
                  <Upload className="w-10 h-10 text-[#2BE29E] mb-2" />
                  <span className="text-sm font-bold text-white">Click or Drag & Drop Any Object Photo</span>
                  <span className="text-xs text-[#6DAA8E] mt-1">Accepts JPG, PNG, WEBP from your phone or device</span>
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
                <p className="text-xs text-[#6DAA8E]">
                  Choose any everyday object to test right now:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
                  {OBJECT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className="p-3 rounded-xl bg-[#091B14] border border-[#143B2C] hover:border-[#2BE29E] text-left transition-all hover:scale-[1.02] flex items-center gap-2.5 group shadow-xs cursor-pointer"
                    >
                      <span className="text-2xl">{preset.icon}</span>
                      <div className="overflow-hidden">
                        <div className="text-xs font-bold text-white truncate group-hover:text-[#2BE29E]">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-[#6DAA8E] truncate">
                          {preset.category}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* AI Object Analysis In-Progress Card */}
            {isAnalyzing && (
              <div className="p-8 rounded-2xl bg-[#091B14] border border-[#184635] text-center space-y-4 animate-fadeIn">
                <div className="w-10 h-10 border-4 border-[#2BE29E] border-t-transparent rounded-full animate-spin mx-auto" />
                <div className="space-y-1">
                  <div className="text-sm font-black text-white tracking-wider">AI OBJECT RECOGNITION</div>
                  <div className="text-xs text-[#2BE29E] font-mono font-medium">{analysisStatus}</div>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* AI ANALYSIS UI (PRE-TRANSFORMATION INSPECTION) */}
            {/* ======================================================== */}
            {capturedPhoto && !isAnalyzing && stagedCreature && (
              <div className="space-y-4 animate-fadeIn">
                
                {/* Photo & Identity Banner */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-[#091B14] border border-[#143B2C] flex flex-col sm:flex-row gap-3.5 items-start">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-lg overflow-hidden shrink-0 border border-[#184635] bg-[#071610]">
                    <img src={capturedPhoto} alt="Analyzed" className="w-full h-full object-cover" />
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setStagedCreature(null);
                        if (activeInputTab === 'camera') startCamera(facingMode);
                      }}
                      className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/75 text-[10px] font-bold text-white flex items-center gap-1 hover:bg-black transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-2.5 h-2.5" /> Retake
                    </button>
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        AI Identified
                      </span>
                      {stagedCreature.objectDna?.objectIdentity?.recognitionConfidence !== undefined && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-[#0E281E] text-[#2BE29E] border-[#2BE29E]/40">
                          {Math.round(stagedCreature.objectDna.objectIdentity.recognitionConfidence * 100)}% Match
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-[#6DAA8E]">
                        {stagedCreature.objectDna?.objectIdentity?.objectCategory || 'Physical Artifact'}
                      </span>
                    </div>

                    {/* Auto-Detected Physical Object */}
                    <div>
                      <div className="text-[10px] uppercase font-mono font-bold text-[#6DAA8E] flex items-center gap-1">
                        <span>Real-World Scanned Object:</span>
                      </div>
                      <div className="text-base sm:text-lg font-black text-white leading-tight mt-0.5">
                        {stagedCreature.originalObject || stagedCreature.objectDna?.objectIdentity?.canonicalName || 'Real-World Item'}
                      </div>
                    </div>

                    {/* Auto-Forged Transformer Codename */}
                    <div className="p-2.5 rounded-xl bg-[#071610] border border-[#2BE29E]/40 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[9px] uppercase font-bold text-[#6DAA8E]">Forged Transformer Mech</div>
                        <div className="text-sm font-black text-[#2BE29E] truncate">
                          {stagedCreature.name}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold">
                          {stagedCreature.robotClass || 'Warrior'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#0E281E] text-white border border-[#1C4D3A] font-bold">
                          {stagedCreature.faction === 'Decepticon' ? '⚔️ Decepticon' : '🛡️ Autobot'}
                        </span>
                      </div>
                    </div>

                    {stagedCreature.objectFeature && (
                      <div className="text-[11px] text-[#A1D2BC] italic">
                        "{stagedCreature.objectFeature}"
                      </div>
                    )}
                  </div>
                </div>

                {/* Autonomous Physical 3D Silhouette Archetype */}
                <div className="p-3.5 rounded-xl bg-[#091B14] border border-[#2BE29E]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">
                        {stagedCreature.visualParams?.shapeArchetype === 'cylinder' ? '🧴' :
                         stagedCreature.visualParams?.shapeArchetype === 'sheet_slab' ? '📱' :
                         stagedCreature.visualParams?.shapeArchetype === 'sphere_round' ? '⚽' : '📦'}
                      </span>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-wider text-[#2BE29E] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#2BE29E]" />
                          <span>Autonomous 3D Silhouette Assigned</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            Vision Contour Lock
                          </span>
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {stagedCreature.visualParams?.shapeArchetype === 'cylinder' ? 'Cylindrical Vessel & Canister Chassis' :
                           stagedCreature.visualParams?.shapeArchetype === 'sheet_slab' ? 'Ultra-Slim Flat Tech Slab Chassis' :
                           stagedCreature.visualParams?.shapeArchetype === 'sphere_round' ? 'Spherical Orb & Orbital Core Chassis' :
                           'Heavy Cuboid Armor Box Chassis'}
                        </div>
                        <div className="text-[10px] text-[#6DAA8E]">
                          {stagedCreature.visualParams?.shapeArchetype === 'cylinder' ? 'Constructed with pressurized coolant cylinders, collar threads & nozzle vents' :
                           stagedCreature.visualParams?.shapeArchetype === 'sheet_slab' ? 'Constructed with high-tech display screen chestplate & folding data panels' :
                           stagedCreature.visualParams?.shapeArchetype === 'sphere_round' ? 'Constructed with gyroscopic orbital rings, spherical power core & round pauldrons' :
                           'Constructed with angular deflection armor, heavy shock struts & reinforced bulkheads'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Autonomous Extracted Photo Colors & Live 3D Preview */}
                <div className="p-3.5 rounded-xl bg-[#091B14] border border-[#2BE29E]/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎨</span>
                      <div>
                        <div className="text-[10px] uppercase font-black tracking-wider text-[#2BE29E] flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-[#2BE29E]" />
                          <span>Extracted Object Color Palette</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            Applied to 3D Model
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white">
                          Colors picked directly from your scanned object photo
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Auto-Extracted Color Chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded-lg bg-[#071610] border border-[#143B2C] flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg border-2 border-white/40 shadow-sm shrink-0" 
                        style={{ backgroundColor: stagedCreature.visualParams?.primaryColor }} 
                      />
                      <div className="overflow-hidden">
                        <div className="text-[9px] uppercase font-bold text-[#6DAA8E]">Primary Armor</div>
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {stagedCreature.visualParams?.primaryColor}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-[#071610] border border-[#143B2C] flex items-center gap-2">
                      <div 
                        className="w-7 h-7 rounded-lg border-2 border-white/40 shadow-sm shrink-0" 
                        style={{ backgroundColor: stagedCreature.visualParams?.secondaryColor }} 
                      />
                      <div className="overflow-hidden">
                        <div className="text-[9px] uppercase font-bold text-[#6DAA8E]">Trim & Joints</div>
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {stagedCreature.visualParams?.secondaryColor}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-[#071610] border border-[#143B2C] flex items-center gap-2 col-span-2 sm:col-span-1">
                      <div 
                        className="w-7 h-7 rounded-lg border-2 border-white/40 shadow-sm shrink-0" 
                        style={{ backgroundColor: stagedCreature.visualParams?.glowColor || '#00E5FF' }} 
                      />
                      <div className="overflow-hidden">
                        <div className="text-[9px] uppercase font-bold text-[#6DAA8E]">Energon Core</div>
                        <div className="text-xs font-mono font-bold text-white truncate">
                          {stagedCreature.visualParams?.glowColor || '#00E5FF'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Live 3D Staged Robot Preview Window */}
                  <div className="rounded-xl bg-[#040C08] border border-[#143B2C] p-2 flex flex-col items-center">
                    <div className="text-[10px] uppercase font-mono font-bold text-[#6DAA8E] mb-1 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Live 3D Robot Preview (Exact Shape & Color Rendered)</span>
                    </div>
                    <div
                      ref={stagedCanvasRef}
                      className="w-full h-48 rounded-lg overflow-hidden flex items-center justify-center relative"
                    />
                  </div>
                </div>

                {/* Physical Matter & Material Properties Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 rounded-lg bg-[#091B14] border border-[#143B2C] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Material</div>
                    <div className="text-xs font-black text-white truncate">
                      {stagedCreature.objectDna?.physicalIdentity?.materialCandidates?.[0] || stagedCreature.materialPhysics?.materialName || 'Polymer Alloy'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#091B14] border border-[#143B2C] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Size Class</div>
                    <div className="text-xs font-black text-[#2BE29E] uppercase">
                      {stagedCreature.objectDna?.physicalIdentity?.estimatedSizeClass || stagedCreature.objectComplexity?.scaleTier || 'Medium'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#091B14] border border-[#143B2C] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Rigidity</div>
                    <div className="text-xs font-black text-white capitalize">
                      {stagedCreature.objectDna?.physicalIdentity?.rigidity || 'semi-rigid'}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-[#091B14] border border-[#143B2C] text-center">
                    <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Combat Role</div>
                    <div className="text-xs font-black text-[#2BE29E]">
                      {stagedCreature.objectDna?.gameplayIdentity?.suggestedClass || stagedCreature.robotClass || 'Warrior'}
                    </div>
                  </div>
                </div>

                {/* Dynamic State Calibration: Object Complexity & Distance Matrix */}
                <div className="p-3.5 rounded-xl bg-[#091B14] border border-emerald-500/40 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#143B2C]">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-emerald-600 text-white shadow-xs">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span>Dynamic State Calibration</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                            Unique Object DNA
                          </span>
                        </div>
                        <div className="text-xs font-black text-white flex items-center gap-2">
                          <span>
                            {stagedCreature.objectComplexity?.tierLabel || stagedCreature.objectDna?.gameplayIdentity?.combatTier || 'COMBAT UNIT'}
                          </span>
                          <span className="text-[11px] font-mono text-[#2BE29E]">
                            Complexity: {stagedCreature.objectComplexity?.complexityScore || 60}/100
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Distance Power Tier</div>
                      <div className="text-xs font-black text-amber-400 font-mono flex items-center gap-1 justify-end">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span>{explorationContext?.distanceMeters || stagedCreature.distanceExplored || 0}m Range</span>
                      </div>
                    </div>
                  </div>

                  {/* Live Stats Preview */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-[#071610] border border-[#184635]">
                      <div className="text-[10px] font-bold text-rose-400">HP</div>
                      <div className="text-sm font-black text-white font-mono">{stagedCreature.stats?.hp || 520}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#071610] border border-[#184635]">
                      <div className="text-[10px] font-bold text-amber-400">ATK</div>
                      <div className="text-sm font-black text-white font-mono">{stagedCreature.stats?.attack || 88}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#071610] border border-[#184635]">
                      <div className="text-[10px] font-bold text-emerald-400">DEF</div>
                      <div className="text-sm font-black text-white font-mono">{stagedCreature.stats?.defense || 64}</div>
                    </div>
                    <div className="p-2 rounded-lg bg-[#071610] border border-[#184635]">
                      <div className="text-[10px] font-bold text-cyan-400">SPD</div>
                      <div className="text-sm font-black text-white font-mono">{stagedCreature.stats?.speed || 13}</div>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#A1D2BC] italic text-center">
                    Stats dynamically scale according to object complexity in the image and distance from your starting position.
                  </p>
                </div>

              </div>
            )}
          </div>
        )}

        {/* Phase 2: Morphing Loading Matrix */}
        {isMorphing && (
          <div className="py-12 flex flex-col items-center justify-center space-y-5 text-center">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 rounded-full border-4 border-[#2BE29E]/30 border-t-[#2BE29E] animate-spin" />
              <div className="absolute inset-3 rounded-full border-4 border-amber-400/30 border-b-amber-400 animate-spin [animation-direction:reverse]" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl animate-pulse">
                ⚡
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black font-heading text-white">
                CREATING YOUR 3D ROBOT
              </h3>
              <p className="text-xs text-[#2BE29E] font-mono font-bold animate-pulse">
                {morphStep}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#6DAA8E]">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Synthesizing Object DNA & 3D Combat Model...</span>
            </div>
          </div>
        )}

        {/* Phase 3: Creature Reveal & 3D Interactive Inspection */}
        {generatedCreature && !isMorphing && (
          <div className="space-y-4 animate-fadeIn">
            
            {/* Robot Identity Header */}
            <div className="p-4 rounded-xl bg-[#091B14] border border-[#143B2C] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {generatedCreature.faction && (
                    <span className={`px-2.5 py-0.5 rounded-md text-xs font-black uppercase border ${
                      generatedCreature.faction === 'Decepticon' 
                        ? 'bg-purple-950/80 border-purple-600/50 text-purple-300' 
                        : 'bg-red-950/80 border-red-600/50 text-red-300'
                    }`}>
                      {generatedCreature.faction === 'Decepticon' ? '⚔️ DECEPTICON' : '🛡️ AUTOBOT'}
                    </span>
                  )}
                  {generatedCreature.robotClass && (
                    <span className="px-2 py-0.5 rounded-md bg-[#0E281E] border border-[#1C4D3A] text-[#2BE29E] text-xs font-black uppercase">
                      {generatedCreature.robotClass}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-[#0E281E] border border-amber-500/40 text-amber-400 font-black text-xs uppercase">
                    {generatedCreature.rarity}
                  </span>
                  {getElementBadge(generatedCreature.element)}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#2BE29E] font-mono bg-[#0E281E] px-2.5 py-1 rounded-full border border-[#2BE29E]/30 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>3D BATTLE READY</span>
                  </span>
                  <button
                    onClick={handleUseThisRobot}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
                  >
                    <Play className="w-3.5 h-3.5 fill-slate-950" />
                    <span>USE ROBOT</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-2xl sm:text-3xl font-black font-heading text-white tracking-wide">
                  {generatedCreature.name}
                </h3>
                <p className="text-xs text-[#6DAA8E] font-medium mt-0.5">
                  Forged from: <strong className="text-white">{generatedCreature.originalObject}</strong>
                </p>
                <p className="text-xs text-[#A1D2BC] italic mt-1 line-clamp-2">
                  "{generatedCreature.lore}"
                </p>
              </div>
            </div>

            {/* Split Visual Viewport: Scanned Physical Object + 3D Interactive Robot */}
            {(() => {
              const vt = generatedCreature.visualTransmutation || generatedCreature.objectDna?.visualTransmutation || generatedCreature.visualParams?.visualTransmutation;
              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
                    {/* Real Physical Object Card */}
                    <div className="relative rounded-xl border border-[#184635] bg-[#071610] overflow-hidden flex flex-col justify-between min-h-[220px]">
                      {capturedPhoto ? (
                        <img src={capturedPhoto} alt={generatedCreature.originalObject} className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-stone-500 text-xs">Physical Image Source</div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071610] via-black/30 to-black/60 pointer-events-none" />
                      
                      <div className="relative z-10 p-2.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-black/80 backdrop-blur-xs text-white text-[10px] font-bold border border-white/20">
                          SCANNED OBJECT
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600/90 text-white text-[10px] font-black uppercase tracking-wider">
                          SOURCE
                        </span>
                      </div>

                      <div className="relative z-10 p-2.5 space-y-1">
                        <div className="text-sm font-black text-white drop-shadow-sm truncate">
                          {generatedCreature.originalObject}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(vt?.signatureFeatures || generatedCreature.objectDna?.signatureFeatures || [generatedCreature.objectFeature]).slice(0, 3).map((feat, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-[#071610]/80 backdrop-blur-xs text-[9px] font-medium text-[#2BE29E] border border-[#2BE29E]/30">
                              {feat}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3D Battle Mech Viewport */}
                    <div className="relative rounded-xl border border-[#1C4D3A] hover:border-[#2BE29E]/60 bg-gradient-to-b from-[#0B231A] to-[#06140D] overflow-hidden flex flex-col justify-between min-h-[220px]">
                      <div ref={previewCanvasRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />
                      
                      <div className="relative z-10 p-2.5 flex items-center justify-between pointer-events-none">
                        <span className="px-2 py-0.5 rounded bg-[#071610]/90 backdrop-blur-xs text-[#2BE29E] text-[10px] font-bold border border-[#2BE29E]/40">
                          3D ROBOT PREVIEW
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                          INTERACTIVE
                        </span>
                      </div>

                      <div className="relative z-10 p-2.5 space-y-1 pointer-events-auto bg-gradient-to-t from-[#06140D] via-[#06140D]/90 to-transparent">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={generatedCreature.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setGeneratedCreature((prev) => prev ? { ...prev, name: val } : null);
                            }}
                            className="text-base font-black text-white bg-black/50 border border-[#2BE29E]/50 focus:border-[#2BE29E] rounded-md px-2.5 py-1 w-full outline-none focus:ring-1 focus:ring-[#2BE29E]"
                            placeholder="Robot Name"
                            title="Tap to change your robot's name"
                          />
                        </div>
                        <div className="text-[10px] text-[#2BE29E] font-medium flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3 text-[#2BE29E]" />
                            <span>Drag model to rotate</span>
                          </span>
                          <span className="text-[#6DAA8E]">Tap name above to edit</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Core Stats Matrix (Child-Friendly & High Contrast: Health, Damage, Fire Rate, Special Power) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-[#091B14] border border-[#143B2C] text-center space-y-0.5">
                <div className="text-[11px] uppercase font-bold text-[#6DAA8E] flex items-center justify-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>Health</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{generatedCreature.stats.hp}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#091B14] border border-[#143B2C] text-center space-y-0.5">
                <div className="text-[11px] uppercase font-bold text-[#6DAA8E] flex items-center justify-center gap-1">
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  <span>Damage</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{generatedCreature.stats.attack}</div>
              </div>

              <div className="p-3 rounded-xl bg-[#091B14] border border-[#143B2C] text-center space-y-0.5">
                <div className="text-[11px] uppercase font-bold text-[#6DAA8E] flex items-center justify-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fire Rate</span>
                </div>
                <div className="text-xl font-black text-white font-mono">
                  {(1000 / (generatedCreature.combatDna?.baseCooldownMs || 600)).toFixed(1)}/s
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#091B14] border border-[#143B2C] text-center space-y-0.5">
                <div className="text-[11px] uppercase font-bold text-[#6DAA8E] flex items-center justify-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Defense</span>
                </div>
                <div className="text-xl font-black text-white font-mono">{generatedCreature.stats.defense}</div>
              </div>
            </div>

            {/* Special Power Card */}
            <div className="p-3.5 rounded-xl bg-[#091B14] border border-[#184635] flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0 shadow-xs">
                <Zap className="w-5 h-5" />
              </div>
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">
                      {generatedCreature.specialAbility.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#071610] border border-[#1C4D3A] text-[#2BE29E] font-mono">
                      {generatedCreature.specialAbility.cooldown}s CD
                    </span>
                  </div>
                  <span className="text-xs text-amber-400 font-bold font-mono">
                    ⚡ {generatedCreature.specialAbility.damage} DMG
                  </span>
                </div>
                <p className="text-xs text-[#A1D2BC]">
                  {generatedCreature.specialAbility.description}
                </p>
              </div>
            </div>

            {/* Collapsible Tech Specs Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAdvancedSpecs(!showAdvancedSpecs)}
                className="w-full py-2 px-3 rounded-lg bg-[#0E281E]/60 hover:bg-[#0E281E] border border-[#143B2C] text-xs font-bold text-[#6DAA8E] hover:text-[#2BE29E] flex items-center justify-between transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-[#2BE29E]" />
                  <span>Advanced Tech Specs & Blueprints</span>
                </span>
                <span className="text-[11px] font-mono">{showAdvancedSpecs ? '▲ Hide Specs' : '▼ Show Specs'}</span>
              </button>
            </div>

            {/* Collapsible Advanced Details */}
            {showAdvancedSpecs && (
              <div className="space-y-3 pt-1 animate-fadeIn">
                {/* Object Complexity / Mass Tier */}
                {generatedCreature.objectComplexity && (
                  <div className="p-3.5 rounded-xl bg-[#091B14] border border-[#184635] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex flex-col items-center justify-center font-black text-[10px] uppercase shadow-xs shrink-0">
                        <span>{generatedCreature.objectComplexity.scaleTier === 'colossal' ? 'TITAN' :
                               generatedCreature.objectComplexity.scaleTier === 'large' ? 'HEAVY' :
                               generatedCreature.objectComplexity.scaleTier === 'micro' ? 'SCOUT' : 'WARRIOR'}</span>
                        <span className="text-[8px] opacity-80">{generatedCreature.objectComplexity.scaleTier}</span>
                      </div>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5 flex-wrap">
                          <span>{generatedCreature.objectComplexity.tierLabel}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#0E281E] text-[#2BE29E] font-bold border border-[#2BE29E]/40">
                            {generatedCreature.objectComplexity.statMultiplier}x Multiplier
                          </span>
                        </div>
                        <div className="text-[11px] text-[#6DAA8E] mt-0.5">
                          {generatedCreature.objectComplexity.physicalMassDesc} • Complexity: <strong className="text-white">{generatedCreature.objectComplexity.complexityScore}/100</strong>
                        </div>
                      </div>
                    </div>

                    <div className="self-end sm:self-auto text-right pl-2 border-t sm:border-t-0 sm:border-l border-[#143B2C] pt-1 sm:pt-0">
                      <div className="text-[10px] uppercase font-bold text-[#6DAA8E]">Combat Power</div>
                      <div className="text-base font-black text-[#2BE29E] font-mono">⚡ {generatedCreature.objectComplexity.powerRating}</div>
                    </div>
                  </div>
                )}

                {/* Expedition Forge Scaling Breakdown */}
                {generatedCreature.explorationMetadata && (
                  <div className="p-4 rounded-xl bg-[#091B14] text-white border border-emerald-500/40 shadow-md space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#143B2C]">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-amber-400 text-amber-950 shadow-xs">
                          <Compass className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                            Expedition Forge Calibration
                          </div>
                          <h4 className="font-heading font-black text-sm text-white flex items-center gap-2">
                            <span>{generatedCreature.explorationMetadata.scanTierLabel}</span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-[#2BE29E] border border-emerald-500/40">
                              +{generatedCreature.explorationMetadata.scanPowerBonusPercent}% Bonus
                            </span>
                          </h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#6DAA8E]">Exploration Range</span>
                        <div className="text-sm font-black font-mono text-white">{generatedCreature.explorationMetadata.distanceMeters}m</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 text-center">
                      <div className="p-1.5 rounded-lg bg-white/5 border border-[#184635]">
                        <div className="text-[9px] font-bold text-[#2BE29E]">HP BOOST</div>
                        <div className="text-xs font-black text-white font-mono">+{generatedCreature.explorationMetadata.statBuffs.hpBuff}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5 border border-[#184635]">
                        <div className="text-[9px] font-bold text-amber-300">ATK BOOST</div>
                        <div className="text-xs font-black text-white font-mono">+{generatedCreature.explorationMetadata.statBuffs.attackBuff}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5 border border-[#184635]">
                        <div className="text-[9px] font-bold text-blue-300">DEF BOOST</div>
                        <div className="text-xs font-black text-white font-mono">+{generatedCreature.explorationMetadata.statBuffs.defenseBuff}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5 border border-[#184635]">
                        <div className="text-[9px] font-bold text-teal-300">SPD BOOST</div>
                        <div className="text-xs font-black text-white font-mono">+{generatedCreature.explorationMetadata.statBuffs.speedBuff}</div>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white/5 border border-[#184635] col-span-2 sm:col-span-1">
                        <div className="text-[9px] font-bold text-purple-300">SPECIAL DMG</div>
                        <div className="text-xs font-black text-white font-mono">+{generatedCreature.explorationMetadata.statBuffs.abilityDamageBuff}</div>
                      </div>
                    </div>

                    {generatedCreature.explorationMetadata.perkApplied && (
                      <div className="p-2 rounded-lg bg-[#0E281E] border border-[#1C4D3A] text-xs">
                        <span className="font-bold text-amber-300">Signature Trait Perk: </span>
                        <span className="font-semibold text-white">{generatedCreature.explorationMetadata.perkApplied.name}</span>
                        <p className="text-[11px] text-[#6DAA8E] mt-0.5">{generatedCreature.explorationMetadata.perkApplied.description}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Combat DNA Blueprint */}
                <CombatDnaBlueprintView creature={generatedCreature} variant="full" />
              </div>
            )}

            {/* End of Phase 3 scrollable body */}
          </div>
        )}

        </div>

        {/* ======================================================== */}
        {/* DOCKED STICKY FOOTER (ALWAYS 100% VISIBLE, NEVER CUT OFF) */}
        {/* ======================================================== */}
        {(generatedCreature && !isMorphing) ? (
          <div className="shrink-0 bg-[#071610]/98 backdrop-blur-md border-t border-[#184635] p-3 sm:p-4 pb-[max(0.85rem,env(safe-area-inset-bottom,16px))] shadow-[0_-10px_25px_rgba(0,0,0,0.8)] z-20">
            <div className="flex items-center gap-2.5 max-w-xl mx-auto">
              <button
                onClick={() => {
                  setGeneratedCreature(null);
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                }}
                className="px-4 py-3.5 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] hover:border-[#2BE29E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-[#2BE29E]" />
                <span className="hidden sm:inline">Scan Another</span>
                <span className="sm:hidden">New Scan</span>
              </button>

              <button
                onClick={handleUseThisRobot}
                className="flex-1 py-3.5 sm:py-4 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-5 h-5 fill-slate-950" />
                <span>USE THIS ROBOT</span>
              </button>
            </div>
          </div>
        ) : (stagedCreature && !generatedCreature && !isMorphing) ? (
          <div className="shrink-0 bg-[#071610]/98 backdrop-blur-md border-t border-[#184635] p-3 sm:p-4 pb-[max(0.85rem,env(safe-area-inset-bottom,16px))] shadow-[0_-10px_25px_rgba(0,0,0,0.8)] z-20">
            <div className="flex items-center gap-2.5 max-w-xl mx-auto">
              <button
                onClick={() => {
                  setCapturedPhoto(null);
                  setStagedCreature(null);
                  if (activeInputTab === 'camera') startCamera(facingMode);
                }}
                className="px-4 py-3.5 rounded-xl bg-[#0E281E] hover:bg-[#143B2C] border border-[#1C4D3A] hover:border-[#2BE29E] text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4 text-[#2BE29E]" />
                <span>Retake</span>
              </button>

              <button
                onClick={confirmTransformation}
                className="flex-1 py-3.5 sm:py-4 px-5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/40 active:scale-[0.98] transition-all cursor-pointer uppercase tracking-wider"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>FORGE INTO 3D BATTLE ROBOT</span>
              </button>
            </div>
          </div>
        ) : null}

      </div>
    </div>
  );
};

