import React, { useState } from 'react';
import { Smartphone, Download } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { MobileInstallModal } from './MobileInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Suppress when already installed & running in standalone mode
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const handled = await install();
      if (!handled) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 hover:text-white text-xs font-bold transition-all shadow-sm active:scale-95 ${className}`}
        title="Install on Mobile Phone (Android & iPhone)"
      >
        <Smartphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        {variant === 'full' ? (
          <span>Install on Mobile</span>
        ) : (
          <span><span className="hidden sm:inline">Install </span>App</span>
        )}
      </button>

      <MobileInstallModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
