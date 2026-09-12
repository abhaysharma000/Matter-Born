import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldAlert, 
  Coins, 
  Gem, 
  Sparkles, 
  Check, 
  Lock, 
  Crown, 
  Flame, 
  Gift,
  ArrowRight,
  Eye
} from 'lucide-react';
import { PlatformUser, ShopItem } from '../../types/platform';
import { SHOP_ITEMS } from '../../data/platformData';
import confetti from 'canvas-confetti';

interface ArmoryShopProps {
  user: PlatformUser;
  onUpdateUser: (updatedUser: PlatformUser) => void;
}

export const ArmoryShop: React.FC<ArmoryShopProps> = ({
  user,
  onUpdateUser,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'skin' | 'trail' | 'crown'>('all');
  const [selectedItem, setSelectedItem] = useState<ShopItem>(SHOP_ITEMS[0]);
  const [notification, setNotification] = useState<string | null>(null);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Filter items
  const filteredItems = SHOP_ITEMS.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.type === selectedCategory;
  });

  // Animated canvas preview of selected skin/trail
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick += 0.03;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      // Draw subtle grid
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      const gridSize = 20;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw trailing ribbon snake effect behind the character
      const trailCount = 14;
      for (let i = trailCount; i >= 1; i--) {
        const offset = i * 8;
        const wave = Math.sin(tick * 2 - i * 0.4) * 14;
        const tx = centerX - offset - 10;
        const ty = centerY + wave;
        const alpha = Math.max(0.1, 1 - i / trailCount);

        ctx.fillStyle = selectedItem.trailColor || `${selectedItem.previewColor}66`;
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillRect(tx - 9, ty - 9, 18, 18);
      }
      ctx.globalAlpha = 1.0;

      // Draw main paper square
      const bobbing = Math.sin(tick * 3) * 4;
      const size = 38;
      const px = centerX - size / 2;
      const py = centerY - size / 2 + bobbing;

      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + size / 2 + 12, size / 1.8, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = selectedItem.previewColor;
      ctx.fillRect(px, py, size, size);

      // Border outline
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(px, py, size, size);

      // Animated Eyes looking around
      const eyeOffsetX = Math.cos(tick) * 2;
      const eyeSize = 6;
      const pupilSize = 3;

      // Left eye white
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + 10, py + 11, eyeSize, eyeSize);
      // Right eye white
      ctx.fillRect(px + 22, py + 11, eyeSize, eyeSize);

      // Pupils
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px + 12 + eyeOffsetX, py + 12, pupilSize, pupilSize);
      ctx.fillRect(px + 24 + eyeOffsetX, py + 12, pupilSize, pupilSize);

      // Crown if selected or equipped
      if (selectedItem.type === 'crown' || user.equippedCrownId === selectedItem.id) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        const crownY = py - 10;
        ctx.moveTo(centerX - 12, crownY);
        ctx.lineTo(centerX - 12, crownY - 8);
        ctx.lineTo(centerX - 6, crownY - 3);
        ctx.lineTo(centerX, crownY - 11);
        ctx.lineTo(centerX + 6, crownY - 3);
        ctx.lineTo(centerX + 12, crownY - 8);
        ctx.lineTo(centerX + 12, crownY);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [selectedItem, user.equippedCrownId]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const isItemUnlocked = (item: ShopItem) => {
    return item.priceCoins === 0 && item.priceGems === 0
      ? true
      : user.unlockedItemIds.includes(item.id);
  };

  const isItemEquipped = (item: ShopItem) => {
    if (item.type === 'skin') return user.equippedSkinId === item.id;
    if (item.type === 'trail') return user.equippedTrailId === item.id;
    if (item.type === 'crown') return user.equippedCrownId === item.id;
    return false;
  };

  const handleEquip = (item: ShopItem) => {
    let updated = { ...user };
    if (item.type === 'skin') {
      updated.equippedSkinId = item.id;
      showToast(`Equipped skin "${item.name}"`);
    } else if (item.type === 'trail') {
      updated.equippedTrailId = item.id;
      showToast(`Equipped trail "${item.name}"`);
    } else if (item.type === 'crown') {
      updated.equippedCrownId = item.id;
      showToast(`Equipped crown "${item.name}"`);
    }
    onUpdateUser(updated);
  };

  const handlePurchase = (item: ShopItem) => {
    if (item.priceCoins > 0 && user.coins < item.priceCoins) {
      showToast(`Not enough Coins! Need ${item.priceCoins - user.coins} more.`);
      return;
    }
    if (item.priceGems > 0 && user.gems < item.priceGems) {
      showToast(`Not enough Gems! Need ${item.priceGems - user.gems} more.`);
      return;
    }

    // Deduct and unlock
    const updated: PlatformUser = {
      ...user,
      coins: user.coins - item.priceCoins,
      gems: user.gems - item.priceGems,
      unlockedItemIds: [...user.unlockedItemIds, item.id],
    };

    // Auto-equip upon purchase
    if (item.type === 'skin') updated.equippedSkinId = item.id;
    if (item.type === 'trail') updated.equippedTrailId = item.id;
    if (item.type === 'crown') updated.equippedCrownId = item.id;

    onUpdateUser(updated);
    showToast(`Unlocked & equipped "${item.name}"!`);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  // Free Daily Bonus Claim
  const handleClaimBonusCrate = () => {
    const bonusCoins = 250;
    const bonusGems = 10;
    const updated = {
      ...user,
      coins: user.coins + bonusCoins,
      gems: user.gems + bonusGems,
    };
    onUpdateUser(updated);
    showToast(`Claimed daily reward: +${bonusCoins} Coins, +${bonusGems} Gems!`);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.5 } });
  };

  return (
    <div className="w-full space-y-8 pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl bg-slate-900 border border-cyan-500/60 shadow-2xl text-cyan-300 font-bold text-sm flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Header with Balance & Free Crate */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-heading text-white flex items-center gap-2.5">
            <span className="text-2xl">🛍️</span>
            <span>Monster Shop & Cosmetics</span>
          </h2>
          <p className="text-sm font-semibold text-indigo-300 mt-1">
            Unlock rare creature skins, luminous elemental aura trails, and royal champion crowns!
          </p>
        </div>

        {/* Balance & Crate Claim */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="flex items-center gap-1.5 text-sm font-black text-amber-400">
              <Coins className="w-4 h-4" />
              <span>{user.coins.toLocaleString()}</span>
            </div>
            <div className="w-[1px] h-4 bg-slate-700" />
            <div className="flex items-center gap-1.5 text-sm font-black text-cyan-400">
              <Gem className="w-4 h-4" />
              <span>{user.gems.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={handleClaimBonusCrate}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Gift className="w-4 h-4" />
            <span>DAILY CRATE</span>
          </button>
        </div>
      </div>

      {/* Main Armory Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live 2D Interactive Preview Stage */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Live Arena Avatar Preview</span>
              </span>
              <span className={`text-[11px] font-black px-2.5 py-0.5 rounded ${
                selectedItem.rarity === 'Legendary'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : selectedItem.rarity === 'Epic'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : selectedItem.rarity === 'Rare'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {selectedItem.rarity}
              </span>
            </div>

            {/* Interactive Preview Canvas */}
            <div className="relative rounded-xl bg-slate-950 border border-slate-800/80 h-56 flex items-center justify-center overflow-hidden">
              <canvas
                ref={previewCanvasRef}
                width={340}
                height={220}
                className="w-full h-full object-contain"
              />
              <div className="absolute bottom-2.5 right-3 text-[10px] text-slate-500 font-mono">
                Interactive Steer Physics
              </div>
            </div>

            {/* Item Meta Details */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-black text-xl text-white">
                  {selectedItem.name}
                </h3>
                <span className="text-xs font-semibold text-slate-400 capitalize">
                  {selectedItem.type}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedItem.description}
              </p>
            </div>

            {/* Purchase or Equip Action Button */}
            <div className="pt-2">
              {isItemEquipped(selectedItem) ? (
                <button
                  disabled
                  className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-sm flex items-center justify-center gap-2 cursor-default"
                >
                  <Check className="w-4 h-4" />
                  <span>CURRENTLY EQUIPPED</span>
                </button>
              ) : isItemUnlocked(selectedItem) ? (
                <button
                  onClick={() => handleEquip(selectedItem)}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>EQUIP TO ARENA</span>
                </button>
              ) : (
                <button
                  onClick={() => handlePurchase(selectedItem)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    UNLOCK FOR {selectedItem.priceCoins > 0 ? `${selectedItem.priceCoins} COINS` : `${selectedItem.priceGems} GEMS`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Catalog of Cosmetics */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Category Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'all', label: 'All Cosmetics' },
              { id: 'skin', label: 'Paper Skins' },
              { id: 'trail', label: 'Ribbon Trails' },
              { id: 'crown', label: 'Crowns & Crests' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Grid of Items */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
            {filteredItems.map((item) => {
              const unlocked = isItemUnlocked(item);
              const equipped = isItemEquipped(item);
              const isSelected = selectedItem.id === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden group ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Swatch color & icon */}
                  <div className="flex items-center justify-between w-full">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shadow border border-white/20"
                      style={{ backgroundColor: item.previewColor }}
                    >
                      {item.type === 'crown' ? (
                        <Crown className="w-4 h-4 text-white" />
                      ) : (
                        <div className="w-3 h-3 bg-white/80 rounded-sm" />
                      )}
                    </div>

                    {equipped ? (
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        ON
                      </span>
                    ) : !unlocked ? (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    ) : null}
                  </div>

                  <div>
                    <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">
                      {item.rarity} {item.type}
                    </div>
                  </div>

                  {/* Price tag */}
                  <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-bold">
                    {unlocked ? (
                      <span className="text-slate-400">Unlocked</span>
                    ) : item.priceCoins > 0 ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {item.priceCoins}
                      </span>
                    ) : (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Gem className="w-3 h-3" />
                        {item.priceGems}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
