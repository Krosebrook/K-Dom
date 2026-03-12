/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { GameEvent } from '../types';

interface EventModalProps {
  event: GameEvent;
  onChoice: (choiceIndex: number) => void;
}

const EventModal: React.FC<EventModalProps> = ({ event, onChoice }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="bg-[#151619] text-stone-100 max-w-lg w-full rounded-2xl border border-white/10 shadow-2xl overflow-hidden relative">
        
        {/* Decorative Header */}
        <div className="bg-white/5 p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xl font-bold uppercase tracking-widest text-white font-mono">{event.title}</h2>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-400 font-mono">!</div>
        </div>

        {/* Content */}
        <div className="p-8">
            <p className="text-base text-stone-300 italic mb-8 leading-relaxed font-serif">
                "{event.description}"
            </p>

            <div className="space-y-3">
                {event.choices.map((choice, idx) => (
                    <button
                        key={idx}
                        onClick={() => onChoice(idx)}
                        className="w-full text-left p-5 rounded-xl bg-[#1a1b1e] hover:bg-white/5 border border-white/5 hover:border-white/20 transition-all group relative overflow-hidden"
                    >
                        <div className="relative z-10 flex justify-between items-center">
                            <span className="font-bold text-stone-200 group-hover:text-white transition-colors">{choice.text}</span>
                            {choice.costGold && choice.costGold > 0 && (
                                <span className="text-rose-400 font-mono text-xs font-bold bg-rose-500/10 px-2 py-1 rounded-md">-{choice.costGold}g</span>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-white/5 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-300"></div>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
