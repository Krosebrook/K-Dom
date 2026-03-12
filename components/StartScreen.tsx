/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { AdvisorPersona } from '../types';
import { PERSONA_DESCRIPTIONS } from '../constants';

interface StartScreenProps {
  onStart: (aiEnabled: boolean, persona: AdvisorPersona) => void;
  hasSave: boolean;
  onContinue: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onStart, hasSave, onContinue }) => {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [selectedPersona, setSelectedPersona] = useState<AdvisorPersona>(AdvisorPersona.Balanced);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-50 text-stone-100 font-sans p-6 bg-black/80 backdrop-blur-md">
      <div className="max-w-md w-full bg-[#151619] p-10 rounded-2xl shadow-2xl relative overflow-hidden animate-fade-in border border-white/10">
        
        <div className="relative z-10 text-center">
            <h1 className="text-6xl font-black mb-2 text-white tracking-tighter drop-shadow-lg font-serif">
              K-Dom
            </h1>
            <p className="text-stone-400 mb-8 text-xs font-bold uppercase tracking-[0.2em] font-mono">
              A Medieval Realm Simulator
            </p>

            {hasSave && (
                <div className="mb-8">
                    <button 
                        onClick={onContinue}
                        className="w-full py-4 bg-white hover:bg-stone-200 text-black font-bold rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm"
                    >
                        Continue Reign
                    </button>
                    <div className="flex items-center gap-4 text-[10px] text-stone-500 justify-center mt-6 font-mono uppercase tracking-widest">
                        <span className="h-px bg-stone-800 w-full"></span>
                        <span>OR</span>
                        <span className="h-px bg-stone-800 w-full"></span>
                    </div>
                </div>
            )}

            <div className="space-y-4 mb-10">
                {/* AI Toggle */}
                <div className="bg-[#1a1b1e] p-5 rounded-xl border border-white/5 hover:border-white/10 transition-colors text-left">
                    <label className="flex items-center justify-between cursor-pointer group">
                        <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-sm text-stone-200 group-hover:text-white transition-colors flex items-center gap-2 font-mono uppercase tracking-wider">
                            Royal AI Advisor
                            {aiEnabled && <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></span>}
                        </span>
                        <span className="text-[11px] text-stone-500 group-hover:text-stone-400 transition-colors">
                            Enable generative quests & events
                        </span>
                        </div>
                        <div className="relative flex-shrink-0 ml-4">
                        <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={aiEnabled}
                            onChange={(e) => setAiEnabled(e.target.checked)}
                        />
                        <div className="w-12 h-6 bg-stone-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500/40 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-stone-400 after:border-stone-400 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 peer-checked:after:bg-white"></div>
                        </div>
                    </label>
                </div>

                {/* Persona Selector */}
                {aiEnabled && (
                    <div className="bg-[#1a1b1e] p-5 rounded-xl border border-white/5 text-left">
                        <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-[0.15em] mb-3 font-mono">Select Advisor Persona</span>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.values(AdvisorPersona).map((persona) => (
                                <button
                                    key={persona}
                                    onClick={() => setSelectedPersona(persona)}
                                    className={`px-3 py-2.5 text-xs font-bold rounded-lg border transition-all ${selectedPersona === persona ? 'bg-white text-black border-white shadow-md' : 'bg-stone-800/50 text-stone-400 border-white/5 hover:bg-stone-800 hover:text-stone-300'}`}
                                >
                                    {persona}
                                </button>
                            ))}
                        </div>
                        <p className="mt-3 text-[11px] text-stone-500 h-4">{PERSONA_DESCRIPTIONS[selectedPersona]}</p>
                    </div>
                )}
            </div>

            <button 
            onClick={() => onStart(aiEnabled, selectedPersona)}
            className="w-full py-4 bg-transparent hover:bg-white/5 text-white font-bold rounded-xl border border-white/20 hover:border-white/40 transition-all text-sm tracking-widest uppercase"
            >
            New Kingdom
            </button>

            <div className="mt-8 text-center">
                <a 
                    href="https://x.com/ammaar" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-2 text-xs text-stone-600 hover:text-amber-500 transition-colors font-mono group"
                >
                    <span>Forged by</span>
                    <span className="font-bold group-hover:underline decoration-amber-500/50 underline-offset-2">@ammaar</span>
                </a>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;
