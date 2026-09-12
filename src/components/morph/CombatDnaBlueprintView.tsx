import React from 'react';
import { 
  Shield, 
  Swords, 
  Gauge, 
  ArrowRight, 
  Activity, 
  Zap, 
  Layers, 
  Anchor, 
  Wind,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { BattleCreature, CombatDNA } from '../../types/creature';
import { deriveCombatDna } from '../../utils/combatDnaDerivation';

interface CombatDnaBlueprintViewProps {
  creature: Partial<BattleCreature>;
  variant?: 'compact' | 'full';
  showComparisonHint?: boolean;
}

export const CombatDnaBlueprintView: React.FC<CombatDnaBlueprintViewProps> = ({
  creature,
  variant = 'full',
  showComparisonHint = true,
}) => {
  const combatDna: CombatDNA = creature.combatDna || deriveCombatDna(creature);
  const objName = creature.originalObject || creature.name || 'Real-World Object';
  const matName = creature.materialPhysics?.materialName || creature.visualTransmutation?.surfaceMaterial || 'Physical Material';
  const scaleTier = creature.objectComplexity?.scaleTier || 'medium';

  // Format percentage helper
  const pct = (val: number) => Math.round(val * 100);

  // Metric color helper
  const getMetricColor = (val: number) => {
    if (val >= 0.70) return 'text-emerald-700 bg-emerald-50 border-emerald-300';
    if (val <= 0.35) return 'text-amber-700 bg-amber-50 border-amber-300';
    return 'text-[#14532D] bg-[#F4F9F4] border-[#BCD8C3]';
  };

  const getBarColor = (val: number) => {
    if (val >= 0.70) return 'bg-emerald-600';
    if (val <= 0.35) return 'bg-amber-500';
    return 'bg-[#2D6A4F]';
  };

  return (
    <div className="p-4 rounded-xl bg-[#F4F9F4] border border-[#BCD8C3] space-y-3.5 text-xs text-[#143823]">
      
      {/* Header Banner: Real Object to Combat DNA */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-[#CFE2D3]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-700 text-white shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-black text-sm text-[#14532D]">
                PHYSICAL DNA → COMBAT MECHANICS
              </span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-mono font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 uppercase">
                Combat DNA 3.0
              </span>
            </div>
            <p className="text-[11px] text-[#4D6957]">
              Causal mechanical derivation based on real-world mass, traction, and material density
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-[#587563] block">Combat Archetype</span>
          <span className="text-xs font-black text-emerald-900 capitalize">
            {combatDna.massClass >= 0.75 ? 'Heavy Juggernaut' :
             combatDna.mobility >= 0.75 ? 'Evasive Speedster' :
             combatDna.rangedPower >= 0.70 ? 'Precision Artillerist' :
             combatDna.regenerationRate >= 0.60 ? 'Biomimetic Regenerator' : 'Balanced Skirmisher'}
          </span>
        </div>
      </div>

      {/* Causal Chain: REAL OBJECT → PHYSICAL PROPERTY → COMBAT EFFECT */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-black uppercase text-[#4D6957]">
          <span className="flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-emerald-700" />
            <span>Causal Physics Derivation Chain:</span>
          </span>
          <span className="text-[10px] font-normal text-[#587563] font-mono">
            Origin: {objName} ({matName})
          </span>
        </div>

        <div className="space-y-1.5">
          {combatDna.derivedMechanics && combatDna.derivedMechanics.length > 0 ? (
            combatDna.derivedMechanics.slice(0, variant === 'compact' ? 3 : 5).map((m, idx) => (
              <div 
                key={idx} 
                className="p-2.5 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:border-emerald-400 transition-colors"
              >
                {/* Physical Property */}
                <div className="flex items-center gap-1.5 min-w-[32%]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                  <span className="font-bold text-[#143823] text-[11px]">{m.physicalProperty}</span>
                </div>

                <ArrowRight className="hidden sm:block w-3.5 h-3.5 text-emerald-600 shrink-0" />

                {/* Derived Mechanic */}
                <div className="min-w-[28%] text-emerald-900 font-medium text-[11px]">
                  <span className="font-semibold text-emerald-950">{m.mechanic}:</span>{' '}
                  <span className="text-[#3D5A47]">{m.gameplayEffect}</span>
                </div>

                {/* Numerical Impact Badge */}
                <div className="self-end sm:self-auto shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black border ${
                    m.magnitude >= 0 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {m.magnitude >= 0 ? `+${Math.round(m.magnitude * 100)}%` : `${Math.round(m.magnitude * 100)}%`}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-2 rounded bg-[#E8F2EA] text-[#4D6957] italic text-[11px]">
              Calibrated standard physical kinematics derived from {objName} geometry.
            </div>
          )}
        </div>
      </div>

      {/* Six Live Physical Combat DNA Gauges */}
      <div className="space-y-1.5 pt-1">
        <div className="text-[11px] font-black uppercase text-[#4D6957]">
          Deterministic Combat Multipliers:
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          
          {/* Mobility */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Wind className="w-3 h-3 text-emerald-700" />
                <span>Arena Mobility</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.mobility)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.mobility)}`} style={{ width: `${pct(combatDna.mobility)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.mobility >= 0.70 ? 'High ground stride' : combatDna.mobility <= 0.40 ? 'Heavy low stride' : 'Standard stride'}
            </span>
          </div>

          {/* Traction */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Anchor className="w-3 h-3 text-blue-700" />
                <span>Ground Traction</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.traction)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.traction)}`} style={{ width: `${pct(combatDna.traction)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.traction >= 0.75 ? 'Zero-slip tight turns' : 'Standard ground grip'}
            </span>
          </div>

          {/* Knockback Resistance */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Shield className="w-3 h-3 text-indigo-700" />
                <span>Knockback Poise</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.knockbackResistance)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.knockbackResistance)}`} style={{ width: `${pct(combatDna.knockbackResistance)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.knockbackResistance >= 0.75 ? 'Resists pushback' : 'Vulnerable to push'}
            </span>
          </div>

          {/* Acceleration / Dash Cooldown */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Gauge className="w-3 h-3 text-amber-700" />
                <span>Dash Acceleration</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.acceleration)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.acceleration)}`} style={{ width: `${pct(combatDna.acceleration)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.acceleration >= 0.70 ? 'Fast 1.4s dash reset' : 'Standard 1.8s reset'}
            </span>
          </div>

          {/* Impact Force */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Swords className="w-3 h-3 text-rose-700" />
                <span>Impact Shockwave</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.meleePower)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.meleePower)}`} style={{ width: `${pct(combatDna.meleePower)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.meleePower >= 0.75 ? 'Heavy enemy knockback' : 'Standard impact'}
            </span>
          </div>

          {/* Armor Absorption */}
          <div className="p-2 rounded-lg bg-[#E8F2EA] border border-[#CFE2D3] space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-[#4D6957] flex items-center gap-1">
                <Zap className="w-3 h-3 text-teal-700" />
                <span>Armor Absorption</span>
              </span>
              <span className="font-mono font-bold text-[#143823]">{pct(combatDna.defense)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#D1E3D5] overflow-hidden">
              <div className={`h-full rounded-full ${getBarColor(combatDna.defense)}`} style={{ width: `${pct(combatDna.defense)}%` }} />
            </div>
            <span className="text-[9px] text-[#587563] block truncate">
              {combatDna.defense >= 0.75 ? '-25% kinetic damage' : 'Standard resistance'}
            </span>
          </div>

        </div>
      </div>

      {/* Tactical Summary & Contrast Notice */}
      {combatDna.tacticalSummary && (
        <div className="p-2.5 rounded-lg bg-[#E8F2EA] border border-emerald-300/80 flex items-start gap-2">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-[11px] space-y-0.5">
            <span className="font-bold text-[#14532D]">Tactical Execution Strategy:</span>
            <p className="text-[#3D5A47] leading-relaxed">{combatDna.tacticalSummary}</p>
          </div>
        </div>
      )}

      {/* Real-World Contrast Callout: Sneaker vs Metal Object */}
      {showComparisonHint && (
        <div className="p-2.5 rounded-lg bg-[#E8F2EA] border border-[#BCD8C3] text-[10px] space-y-1">
          <div className="flex items-center justify-between font-bold text-[#14532D]">
            <span>PHYSICAL DIFFERENTIATION BENCHMARK:</span>
            <span className="font-mono text-[#4D6957]">Rubber vs Iron Mechanics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[#3D5A47]">
            <div className="p-1.5 rounded bg-[#F4F9F4] border border-[#CFE2D3]">
              <span className="font-bold text-[#143823]">Sneaker / Athletic Footwear:</span> High traction (0.85-0.95), swift dash cooldown, high cornering control, but vulnerable to knockback displacement due to low mass.
            </div>
            <div className="p-1.5 rounded bg-[#F4F9F4] border border-[#CFE2D3]">
              <span className="font-bold text-[#143823]">Cast Iron / Heavy Engine:</span> Massive knockback resistance (0.85-0.95), heavy impact force, high armor absorption, but slower acceleration and wider turn radius.
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
