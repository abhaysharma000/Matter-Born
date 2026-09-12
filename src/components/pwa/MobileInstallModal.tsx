import React, { useState } from 'react';
import { Smartphone, Download, X, Share2, PlusSquare, Copy, Check, QrCode, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface MobileInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileInstallModal: React.FC<MobileInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isIOS, isAndroid, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'guide' | 'qr'>(isIOS || isAndroid ? 'guide' : 'qr');

  if (!isOpen) return null;

  const currentUrl = window.location.href.split('#')[0];
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(currentUrl)}&bgcolor=0f172a&color=38bdf8`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleNativeInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn select-none">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6 space-y-4 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto text-left">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shrink-0 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-slate-950 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="font-heading font-black text-white text-lg leading-tight">
              Install on Mobile Phone
            </h3>
            <p className="text-xs text-slate-400">
              Run full-screen like a native app with zero lag
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => setActiveTab('guide')}
            className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Installation Guide</span>
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'qr'
                ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR / Link</span>
          </button>
        </div>

        {/* Tab 1: Installation Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-3.5">
            {/* Direct Android / Chrome One-Tap Install if available */}
            {isInstallable && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/60 to-blue-950/60 border border-cyan-500/40 text-center space-y-2">
                <div className="text-xs font-bold text-cyan-300 flex items-center justify-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>One-Tap Direct Install Available!</span>
                </div>
                <button
                  onClick={handleNativeInstall}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>INSTALL APPLICATION NOW</span>
                </button>
              </div>
            )}

            {/* iOS Safari Steps */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  iPhone / iPad (Apple Safari)
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  iOS
                </span>
              </div>
              <ol className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Open this website in <strong>Safari</strong> browser on your iPhone.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Tap the <strong className="text-cyan-400 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 inline" /> Share</strong> button in the bottom Safari toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-cyan-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Scroll down the menu and tap <strong className="text-amber-300 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
            </div>

            {/* Android Chrome Steps */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Android (Google Chrome / Samsung Internet)
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                  Android
                </span>
              </div>
              <ol className="space-y-2 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Open this website in <strong>Google Chrome</strong> on your phone.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Tap the <strong>three dots (⋮)</strong> menu in the top-right corner.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-800 text-emerald-300 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}

        {/* Tab 2: QR Code & Link Transfer */}
        {activeTab === 'qr' && (
          <div className="space-y-3.5 text-center">
            <p className="text-xs text-slate-300">
              Point your phone's camera at this QR code to open the game instantly on mobile:
            </p>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 inline-block shadow-inner">
              <img
                src={qrUrl}
                alt="Scan to open on phone"
                className="w-48 h-48 mx-auto rounded-xl border border-slate-800"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={currentUrl}
                className="flex-1 px-2.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono truncate"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Perks Footer */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
          <span>⚡ Hardware Accelerated 3D</span>
          <span>📸 Native Camera Shutter</span>
          <span>📱 Fullscreen Standalone</span>
        </div>

      </div>
    </div>
  );
};
