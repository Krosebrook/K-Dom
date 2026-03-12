/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import { BuildingType, KingdomStats, AIGoal, NewsItem, TileData, AdvisorPersona } from '../types';
import { BUILDINGS, getBuildingConfig, getUpgradeCost } from '../constants';

interface UIOverlayProps {
  stats: KingdomStats;
  selectedTool: BuildingType;
  onSelectTool: (type: BuildingType) => void;
  currentGoal: AIGoal | null;
  newsFeed: NewsItem[];
  onClaimReward: () => void;
  isGeneratingGoal: boolean;
  aiEnabled: boolean;
  advisorPersona: AdvisorPersona;
  onConscript: () => void;
  onPromote: () => void;
  selectedTile: TileData | null;
  onToggleGate: () => void;
  onToggleLock: () => void;
  onFillMoat: () => void;
  onRotate: () => void;
  rotation: number;
  onUpgrade: () => void;
  onChatOpen: () => void;
}

const civicTools = [
  BuildingType.None, 
  BuildingType.Path,
  BuildingType.Hovel,
  BuildingType.Market,
  BuildingType.Farm,
  BuildingType.Keep,
];

const militaryTools = [
  BuildingType.Barracks,
  BuildingType.Wall,
  BuildingType.Gatehouse,
  BuildingType.Tower,
  BuildingType.Moat,
  BuildingType.Drawbridge,
];

const ToolButton: React.FC<{
  type: BuildingType;
  isSelected: boolean;
  onClick: () => void;
  gold: number;
}> = ({ type, isSelected, onClick, gold }) => {
  const config = getBuildingConfig(type);
  const canAfford = gold >= config.cost;
  const isBulldoze = type === BuildingType.None;
  
  return (
    <button
      onClick={onClick}
      disabled={!isBulldoze && !canAfford}
      className={`
        relative flex flex-col items-center justify-center rounded-xl border transition-all shadow-sm flex-shrink-0
        w-14 h-14 md:w-16 md:h-16
        ${isSelected ? 'border-white bg-white/10 scale-105 z-10' : 'border-white/10 bg-black/40 hover:bg-white/5'}
        ${!isBulldoze && !canAfford ? 'opacity-40 cursor-not-allowed grayscale' : 'cursor-pointer pointer-events-auto'}
      `}
    >
      <div className="w-6 h-6 md:w-7 md:h-7 rounded-md mb-1 border border-white/20 shadow-inner flex items-center justify-center overflow-hidden" style={{ backgroundColor: isBulldoze ? 'transparent' : config.color }}>
        {isBulldoze && <div className="w-full h-full bg-red-500/80 text-white flex justify-center items-center font-bold text-lg">✕</div>}
      </div>
      <span className="text-[8px] md:text-[9px] font-bold text-stone-300 uppercase tracking-widest leading-none text-center px-1 font-mono">{config.name}</span>
    </button>
  );
};

const UIOverlay: React.FC<UIOverlayProps> = ({
  stats,
  selectedTool,
  onSelectTool,
  currentGoal,
  newsFeed,
  onClaimReward,
  isGeneratingGoal,
  aiEnabled,
  advisorPersona,
  onConscript,
  onPromote,
  selectedTile,
  onToggleGate,
  onToggleLock,
  onFillMoat,
  onRotate,
  rotation,
  onUpgrade,
  onChatOpen
}) => {
  const newsRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<'civic'|'military'>('civic');

  useEffect(() => {
    if (newsRef.current) newsRef.current.scrollTop = newsRef.current.scrollHeight;
  }, [newsFeed]);

  const conscriptCost = 50;
  const promoteCost = 100;
  const showInspector = selectedTile && selectedTile.buildingType !== BuildingType.None && selectedTile.buildingType !== BuildingType.Path;
  const upgradeCost = showInspector ? getUpgradeCost(selectedTile.buildingType, selectedTile.level || 1) : 0;
  
  const canUpgrade = showInspector && [BuildingType.Hovel, BuildingType.Market, BuildingType.Farm, BuildingType.Barracks, BuildingType.Tower].includes(selectedTile.buildingType);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 font-sans z-10 text-stone-100">
      
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-start pointer-events-auto gap-4 w-full max-w-full">
        <div className="bg-[#151619]/90 p-4 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex flex-wrap gap-x-6 gap-y-3 items-center w-full md:w-auto">
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] font-mono">Treasury</span>
            <span className="text-2xl md:text-3xl font-light text-white font-mono">{stats.gold.toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] font-mono">Subjects</span>
            <span className="text-xl md:text-2xl font-light text-stone-300 font-mono">{stats.subjects}</span>
          </div>
           <div className="flex flex-col">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] font-mono">Happiness</span>
            <span className={`text-xl md:text-2xl font-light font-mono ${stats.happiness > 80 ? 'text-emerald-400' : stats.happiness < 40 ? 'text-rose-400' : 'text-amber-400'}`}>{stats.happiness}%</span>
          </div>
           <div className="flex flex-col border-l border-white/10 pl-6 ml-2">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] font-mono">Season</span>
            <span className={`text-xl md:text-2xl font-light font-mono ${stats.season === 'Winter' ? 'text-sky-300' : stats.season === 'Autumn' ? 'text-orange-400' : 'text-emerald-400'}`}>{stats.season}</span>
          </div>
           <div className="flex flex-col">
            <span className="text-[9px] text-stone-500 uppercase font-bold tracking-[0.2em] font-mono">Day</span>
            <span className="text-xl md:text-2xl font-light text-stone-300 font-mono">{stats.day}</span>
          </div>
        </div>

        {/* AI Goal Panel */}
        <div className={`w-full md:w-80 bg-[#151619]/90 text-stone-100 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl overflow-hidden ${!aiEnabled ? 'opacity-50 grayscale' : ''}`}>
           <div className="bg-white/5 px-5 py-3 border-b border-white/5 flex justify-between items-center">
            <span className="font-bold uppercase text-[10px] tracking-[0.2em] font-mono text-stone-400">
                {aiEnabled ? `Advisor: ${advisorPersona}` : 'Advisor: Offline'}
            </span>
            <button onClick={onChatOpen} disabled={!aiEnabled} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest transition-colors">Chat</button>
          </div>
          <div className="p-4">
            {currentGoal ? (
              <>
                <p className="text-sm md:text-base font-serif italic text-stone-300 mb-4 leading-relaxed">"{currentGoal.description}"</p>
                <div className="flex justify-between items-center bg-black/40 p-3 rounded-xl border border-white/5">
                  <div className="text-[10px] text-stone-400 font-mono uppercase tracking-wider">
                    Task: <span className="text-white font-bold">
                      {currentGoal.targetType === 'building_count' 
                        ? (currentGoal.buildingType ? getBuildingConfig(currentGoal.buildingType).name : 'Structures')
                        : currentGoal.targetType} {currentGoal.targetValue}
                    </span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-bold font-mono bg-emerald-400/10 px-2.5 py-1 rounded-md">+{currentGoal.reward}g</div>
                </div>
                {currentGoal.completed && (
                  <button onClick={onClaimReward} className="mt-3 w-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold py-2.5 rounded-xl transition-all text-xs uppercase tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)]">Claim Reward</button>
                )}
              </>
            ) : <div className="text-xs text-stone-500 py-3 italic font-serif">Awaiting orders...</div>}
          </div>
        </div>
      </div>

      {/* Mid Left: Inspector & Training */}
      <div className="pointer-events-auto absolute top-1/2 -translate-y-1/2 left-4 md:left-6 flex flex-col gap-4">
          {/* Rotation Control */}
          <div className="bg-[#151619]/90 p-2 rounded-xl border border-white/10 shadow-2xl backdrop-blur-xl self-start">
             <button onClick={onRotate} className="w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-stone-300 font-light text-xl active:scale-95 transition-all" title="Rotate (R)">
                ↻
             </button>
             <div className="text-[9px] text-center text-stone-500 mt-2 uppercase font-bold tracking-widest font-mono">Rot: {rotation * 90}°</div>
          </div>

          {showInspector && selectedTile && (
            <div className="bg-[#151619]/90 p-4 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl flex flex-col gap-3 w-48 animate-fade-in">
                <div className="text-[11px] font-bold uppercase tracking-widest text-stone-300 text-center pb-2 border-b border-white/10 flex justify-between font-mono">
                    <span>{getBuildingConfig(selectedTile.buildingType).name}</span>
                    <span className="text-white bg-white/10 px-1.5 rounded">LVL {selectedTile.level || 1}</span>
                </div>
                
                {canUpgrade && (
                    <button onClick={onUpgrade} disabled={stats.gold < upgradeCost} className="bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-50 text-emerald-400 text-xs py-2.5 px-3 rounded-xl border border-emerald-500/30 flex flex-col items-center group transition-colors">
                        <span className="font-bold tracking-widest uppercase text-[10px]">Upgrade</span>
                        <span className="text-[10px] font-mono mt-0.5">-{upgradeCost}g</span>
                    </button>
                )}

                {selectedTile.buildingType === BuildingType.Moat && (
                    <button onClick={onFillMoat} disabled={selectedTile.isWet} className="bg-sky-500/10 hover:bg-sky-500/20 disabled:opacity-50 text-sky-400 text-xs py-2.5 px-3 rounded-xl border border-sky-500/30 font-bold tracking-widest uppercase text-[10px] transition-colors">
                        {selectedTile.isWet ? 'Moat Filled' : 'Fill Moat'}
                    </button>
                )}
                {(selectedTile.buildingType === BuildingType.Gatehouse || selectedTile.buildingType === BuildingType.Drawbridge) && (
                    <>
                        <button onClick={onToggleGate} className={`text-[10px] py-2.5 px-3 rounded-xl border font-bold tracking-widest uppercase transition-colors ${selectedTile.isOpen ? 'bg-white/5 text-stone-400 border-white/10' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                            {selectedTile.isOpen ? 'Close Gate' : 'Open Gate'}
                        </button>
                        <button onClick={onToggleLock} className={`text-[10px] py-2.5 px-3 rounded-xl border font-bold tracking-widest uppercase transition-colors ${selectedTile.isLocked ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-white/5 text-stone-400 border-white/10'}`}>
                            {selectedTile.isLocked ? 'Locked 🔒' : 'Unlocked 🔓'}
                        </button>
                    </>
                )}
            </div>
          )}

          {stats.defense > 0 && (
            <div className="bg-[#151619]/90 p-3 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col gap-2 w-36 md:w-48">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 text-center pb-2 border-b border-white/10 font-mono">Military</div>
                <button onClick={onConscript} disabled={stats.gold < conscriptCost || stats.subjects < 1} className="bg-white/5 hover:bg-white/10 disabled:opacity-50 text-xs py-2.5 px-2 rounded-xl border border-white/10 flex flex-col items-center transition-colors">
                    <span className="font-bold tracking-widest uppercase text-[10px] text-stone-300">Conscript</span>
                    <span className="text-[9px] text-stone-500 font-mono mt-0.5">-{conscriptCost}g, -1 Pop</span>
                </button>
                <button onClick={onPromote} disabled={stats.gold < promoteCost || stats.soldiers < 1} className="bg-amber-500/10 hover:bg-amber-500/20 disabled:opacity-50 text-xs py-2.5 px-2 rounded-xl border border-amber-500/20 flex flex-col items-center transition-colors">
                    <span className="font-bold tracking-widest uppercase text-[10px] text-amber-400">Promote Officer</span>
                    <span className="text-[9px] text-amber-500/70 font-mono mt-0.5">-{promoteCost}g, -1 Soldier</span>
                </button>
            </div>
          )}
      </div>

      {/* Bottom Bar: Navigation & News */}
      <div className="flex flex-col-reverse md:flex-row md:justify-between md:items-end pointer-events-auto mt-auto gap-4 w-full">
        <div className="flex flex-col gap-2 bg-[#151619]/90 p-3 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl w-full md:w-auto">
           <div className="flex gap-2 mb-1 px-2">
              <button onClick={() => setTab('civic')} className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all ${tab === 'civic' ? 'bg-white text-black' : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}>Civic</button>
              <button onClick={() => setTab('military')} className={`px-4 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-full transition-all ${tab === 'military' ? 'bg-white text-black' : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}>Defense</button>
           </div>
           <div className="flex gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 px-1">
            {(tab === 'civic' ? civicTools : militaryTools).map((type) => (
              <ToolButton key={type} type={type} isSelected={selectedTool === type} onClick={() => onSelectTool(type)} gold={stats.gold} />
            ))}
          </div>
        </div>

        <div className="w-full md:w-96 h-32 md:h-40 bg-[#151619]/90 text-stone-300 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden">
          <div className="bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400 border-b border-white/5 flex justify-between font-mono">
            <span>Town Crier</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></span>
          </div>
          <div ref={newsRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-[11px] md:text-xs font-serif italic no-scrollbar">
            {newsFeed.map((news) => (
              <div key={news.id} className={`border-l-2 pl-3 py-1 animate-fade-in ${news.type === 'positive' ? 'border-emerald-500 text-emerald-200' : news.type === 'negative' ? 'border-rose-500 text-rose-200' : 'border-sky-500 text-sky-200'}`}>{news.text}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOverlay;
