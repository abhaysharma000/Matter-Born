import React, { useState } from 'react';
import { MessageSquare, Send, X, Bot, Sparkles, User, Layers, ShieldCheck, Flame } from 'lucide-react';
import { BattleCreature, RealWorldEnvironment } from '../../types/creature';

interface CreatureChatModalProps {
  creature: BattleCreature;
  environment?: RealWorldEnvironment;
  onClose: () => void;
}

interface ChatMessage {
  sender: 'player' | 'creature';
  text: string;
}

export const CreatureChatModal: React.FC<CreatureChatModalProps> = ({
  creature,
  environment,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: 'creature',
      text: `Greetings, Master! I was awakened from your real-world ${creature.originalObject}. My ${creature.materialPhysics?.materialName || 'physical core'} is ready for combat. What are your orders?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'player', text: userText }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/creature/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creature,
          userMessage: userText,
          environmentName: environment?.name || 'Standard 3D Arena',
        }),
      });

      if (!res.ok) throw new Error('Failed to reach creature');
      const data = await res.json();
      setMessages((prev) => [...prev, { sender: 'creature', text: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'creature',
          text: `*Rumbles firmly* My ${creature.originalObject} instincts are primed! In this arena, watch our flanks and use my ${creature.specialAbility.name} when rivals bunch up!`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    `How does your ${creature.originalObject} material help in battle?`,
    `What is our strategy in this environment?`,
    `Tell me about your special skill [${creature.specialAbility.name}].`,
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl bg-[#F4F9F4] border border-[#CFE2D3] flex flex-col h-[560px] max-h-[90vh] shadow-2xl overflow-hidden text-[#143823]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#E8F2EA] border-b border-[#CFE2D3]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-700 flex items-center justify-center text-white font-bold shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-black text-[#143823] text-sm">{creature.name}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  {creature.rarity}
                </span>
              </div>
              <div className="text-[11px] text-[#4D6957]">
                Morphed from <strong className="text-emerald-800">{creature.originalObject}</strong> ({creature.materialPhysics?.materialName})
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#DFEDE2] hover:bg-[#CFE2D3] text-[#4D6957] hover:text-[#143823] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Physical Traits Banner */}
        {creature.materialPhysics && (
          <div className="px-4 py-2 bg-[#DFEFE2] border-b border-[#BCD8C3] flex items-center justify-between text-[11px] text-[#4D6957]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-amber-800 font-mono font-bold">
                <Flame className="w-3 h-3 text-amber-600" /> Heat: {creature.materialPhysics.heatResistance}%
              </span>
              <span className="flex items-center gap-1 text-teal-800 font-mono font-bold">
                <Sparkles className="w-3 h-3 text-teal-600" /> Elec: {creature.materialPhysics.electricalConductivity}%
              </span>
            </div>
            <div className="text-emerald-800 font-medium truncate max-w-[180px]">
              {creature.materialPhysics.counterStrengths?.[0] || 'Real-World Material Defense'}
            </div>
          </div>
        )}

        {/* Message Logs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex gap-2.5 ${m.sender === 'player' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'creature' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center shrink-0 text-emerald-800 text-xs">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  m.sender === 'player'
                    ? 'bg-emerald-700 text-white rounded-br-none shadow-md'
                    : 'bg-[#E8F2EA] border border-[#CFE2D3] text-[#143823] rounded-bl-none shadow-xs'
                }`}
              >
                {m.text}
              </div>

              {m.sender === 'player' && (
                <div className="w-7 h-7 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-800 text-xs">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-2 text-xs text-[#587563] italic">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
              <span>{creature.name} is formulating response...</span>
            </div>
          )}
        </div>

        {/* Quick Prompts */}
        <div className="px-3 py-1.5 bg-[#E8F2EA] border-t border-[#CFE2D3] flex gap-1.5 overflow-x-auto text-[11px] scrollbar-none">
          {quickPrompts.map((p, i) => (
            <button
              key={i}
              onClick={() => {
                setInput(p);
              }}
              className="px-2.5 py-1 rounded-full bg-[#F4F9F4] hover:bg-[#DFEDE2] border border-[#BCD8C3] text-[#143823] whitespace-nowrap transition-colors shadow-xs"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-[#E8F2EA] border-t border-[#CFE2D3] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Talk to ${creature.name}...`}
            className="flex-1 px-3 py-2 rounded-xl bg-[#F4F9F4] border border-[#BCD8C3] text-[#143823] text-xs placeholder:text-[#587563] focus:outline-none focus:border-emerald-600"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1 transition-all shadow-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
};
