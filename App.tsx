/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { Grid, TileData, BuildingType, KingdomStats, AIGoal, NewsItem, AdvisorPersona, GameEvent, SaveData, Season, ChatMessage, FloatingText } from './types';
import { GRID_SIZE, BUILDINGS, TICK_RATE_MS, INITIAL_GOLD, SAVE_KEY, getBuildingConfig, DAYS_PER_SEASON, SEASON_ORDER, getUpgradeCost } from './constants';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import EventModal from './components/EventModal';
import AdvisorChat from './components/AdvisorChat';
import { generateKingdomGoal, generateTownCrierEvent, generateGameEvent, chatWithAdvisor } from './services/geminiService';

const IsoMap = lazy(() => import('./components/IsoMap'));

const createInitialGrid = (): Grid => {
  const grid: Grid = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    const row: TileData[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      row.push({ x, y, buildingType: BuildingType.None, level: 1 });
    }
    grid.push(row);
  }
  return grid;
};

const propagateWater = (startGrid: Grid, startX: number, startY: number): Grid => {
    const newGrid = startGrid.map(row => row.map(tile => ({ ...tile })));
    const queue: {x: number, y: number}[] = [];
    const isEdge = startX === 0 || startX === GRID_SIZE - 1 || startY === 0 || startY === GRID_SIZE - 1;
    let adjacentSource = false;
    const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    for (const [dx, dy] of dirs) {
        const nx = startX + dx; const ny = startY + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE && newGrid[ny][nx].isWet) adjacentSource = true;
    }
    const target = newGrid[startY][startX];
    if (isEdge || adjacentSource) {
        if (target.buildingType === BuildingType.Moat || target.buildingType === BuildingType.Drawbridge) {
            target.isWet = true; queue.push({ x: startX, y: startY });
        }
    }
    while (queue.length > 0) {
        const { x, y } = queue.shift()!;
        for (const [dx, dy] of dirs) {
            const nx = x + dx; const ny = y + dy;
            if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
                const neighbor = newGrid[ny][nx];
                if ((neighbor.buildingType === BuildingType.Moat || neighbor.buildingType === BuildingType.Drawbridge) && !neighbor.isWet) {
                    neighbor.isWet = true; queue.push({ x: nx, y: ny });
                }
            }
        }
    }
    return newGrid;
};

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [persona, setPersona] = useState<AdvisorPersona>(AdvisorPersona.Balanced);
  const [grid, setGrid] = useState<Grid>(createInitialGrid);
  const [stats, setStats] = useState<KingdomStats>({ 
      gold: INITIAL_GOLD, subjects: 0, soldiers: 0, officers: 0, defense: 0, day: 1, 
      happiness: 100, season: Season.Spring 
  });
  const [selectedTool, setSelectedTool] = useState<BuildingType>(BuildingType.Path);
  const [selectedTilePos, setSelectedTilePos] = useState<{x: number, y: number} | null>(null);
  const [currentGoal, setCurrentGoal] = useState<AIGoal | null>(null);
  const [isGeneratingGoal, setIsGeneratingGoal] = useState(false);
  const [newsFeed, setNewsFeed] = useState<NewsItem[]>([]);
  const [previewRotation, setPreviewRotation] = useState(0);
  const [timeOfDay, setTimeOfDay] = useState(0.2); // 0..1 Cycle
  const [activeEvent, setActiveEvent] = useState<GameEvent | null>(null);
  
  // Chat & UI State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);

  const gridRef = useRef(grid);
  const statsRef = useRef(stats);
  const toolRef = useRef(selectedTool);
  const rotRef = useRef(previewRotation);
  const personaRef = useRef(persona);

  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { toolRef.current = selectedTool; }, [selectedTool]);
  useEffect(() => { rotRef.current = previewRotation; }, [previewRotation]);
  useEffect(() => { personaRef.current = persona; }, [persona]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key.toLowerCase() === 'r') {
            setPreviewRotation(prev => (prev + 1) % 4);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save Logic
  const saveGame = useCallback(() => {
      if (!gameStarted) return;
      const data: SaveData = {
          grid: gridRef.current,
          stats: statsRef.current,
          persona: personaRef.current,
          version: 1
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }, [gameStarted]);

  // Auto-Save Interval
  useEffect(() => {
      if (gameStarted) {
          const interval = setInterval(saveGame, 5000);
          return () => clearInterval(interval);
      }
  }, [gameStarted, saveGame]);

  // Floating Text Loop (Decay)
  useEffect(() => {
      if (!gameStarted) return;
      const interval = setInterval(() => {
          setFloatingTexts(prev => prev.map(ft => ({ ...ft, life: ft.life - 0.05 })).filter(ft => ft.life > 0));
      }, 50);
      return () => clearInterval(interval);
  }, [gameStarted]);

  const loadGame = () => {
      try {
          const raw = localStorage.getItem(SAVE_KEY);
          if (raw) {
              const data = JSON.parse(raw) as SaveData;
              setGrid(data.grid);
              setStats(data.stats);
              setPersona(data.persona || AdvisorPersona.Balanced);
              setGameStarted(true);
          }
      } catch (e) {
          console.error("Failed to load save", e);
      }
  };

  const hasSave = !!localStorage.getItem(SAVE_KEY);

  const addNewsItem = useCallback((item: NewsItem) => setNewsFeed(prev => [...prev.slice(-12), item]), []);
  const spawnFloatingText = useCallback((x: number, y: number, text: string, color: string) => {
      setFloatingTexts(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, x, y, text, color, life: 1.0 }]);
  }, []);

  const fetchNewGoal = useCallback(async () => {
    if (isGeneratingGoal || !aiEnabled) return;
    setIsGeneratingGoal(true);
    const newGoal = await generateKingdomGoal(statsRef.current, gridRef.current, personaRef.current);
    if (newGoal) setCurrentGoal(newGoal);
    setIsGeneratingGoal(false);
  }, [isGeneratingGoal, aiEnabled]);

  const triggerRandomEvent = useCallback(async () => {
      if (!aiEnabled || activeEvent) return;
      const event = await generateGameEvent(statsRef.current);
      if (event) setActiveEvent(event);
  }, [aiEnabled, activeEvent]);

  useEffect(() => {
    if (gameStarted && aiEnabled) {
        fetchNewGoal();
        
        // News Tick
        const newsInterval = setInterval(async () => {
            const news = await generateTownCrierEvent(statsRef.current);
            if (news) addNewsItem(news);
        }, 45000); 

        // Event Tick (Rare)
        const eventInterval = setInterval(() => {
            if (Math.random() > 0.7) triggerRandomEvent();
        }, 60000);

        return () => {
            clearInterval(newsInterval);
            clearInterval(eventInterval);
        };
    }
  }, [gameStarted, aiEnabled, fetchNewGoal, addNewsItem, triggerRandomEvent]);

  // Main Simulation Loop
  useEffect(() => {
    if (!gameStarted) return;
    const interval = setInterval(() => {
      // Time Cycle
      setTimeOfDay(prev => (prev + 0.005) % 1);

      let income = 0; let popGrowth = 0; let def = 0; 
      let counts: Record<string, number> = {};
      let totalHousing = 0;
      
      gridRef.current.flat().forEach(t => {
        if (t.buildingType !== BuildingType.None) {
          const cfg = getBuildingConfig(t.buildingType);
          const lvl = t.level || 1;
          const multi = lvl; // Linear scaling for now
          
          let tileIncome = cfg.incomeGen * multi;
          // Seasonal Effects
          if (t.buildingType === BuildingType.Farm && statsRef.current.season === Season.Winter) tileIncome *= 0.2;
          if (t.buildingType === BuildingType.Farm && statsRef.current.season === Season.Autumn) tileIncome *= 1.5;

          income += tileIncome; 
          popGrowth += cfg.popGen * multi; 
          def += (cfg.defense || 0) * multi;
          
          if (t.buildingType === BuildingType.Hovel) totalHousing += 10 * multi;
          
          if (t.isWet) def += 5;
          counts[t.buildingType] = (counts[t.buildingType] || 0) + 1;
        }
      });
      
      const wallCount = counts[BuildingType.Wall] || 0;
      const garrisonBonus = Math.min(wallCount, statsRef.current.soldiers) * 10;
      def += statsRef.current.soldiers * 2 + statsRef.current.officers * 15 + garrisonBonus;
      
      const maxPop = totalHousing + 5;
      
      setStats(prev => {
        // Season Logic
        const seasonIdx = Math.floor(prev.day / DAYS_PER_SEASON) % 4;
        const season = SEASON_ORDER[seasonIdx];

        // Happiness Logic
        const popRatio = prev.subjects / (maxPop || 1);
        let targetHappiness = 100;
        if (popRatio > 0.9) targetHappiness -= 20; // Crowding
        if (prev.gold < 100) targetHappiness -= 10; // Poverty
        if (prev.defense < prev.subjects / 2) targetHappiness -= 10; // Fear
        if (season === Season.Winter) targetHappiness -= 5;
        
        const nextHappiness = Math.round(prev.happiness * 0.95 + targetHappiness * 0.05); // Lerp
        
        // Pop Growth affected by happiness
        let actualPopGrowth = popGrowth;
        if (nextHappiness < 50) actualPopGrowth = -1; // People leave
        
        let nPop = Math.min(maxPop, Math.max(0, prev.subjects + actualPopGrowth));
        const nextStats = { ...prev, gold: prev.gold + income, subjects: nPop, day: prev.day + 1, defense: def, season, happiness: nextHappiness };
        
        if (currentGoal && !currentGoal.completed) {
            let met = false;
            switch(currentGoal.targetType) {
                case 'gold': met = nextStats.gold >= currentGoal.targetValue; break;
                case 'subjects': met = nextStats.subjects >= currentGoal.targetValue; break;
                case 'defense': met = nextStats.defense >= currentGoal.targetValue; break;
                case 'soldiers': met = nextStats.soldiers >= currentGoal.targetValue; break;
                case 'building_count': 
                    if (currentGoal.buildingType) met = (counts[currentGoal.buildingType] || 0) >= currentGoal.targetValue;
                    break;
            }
            if (met) setCurrentGoal({ ...currentGoal, completed: true });
        }
        return nextStats;
      });
    }, TICK_RATE_MS);
    return () => clearInterval(interval);
  }, [gameStarted, currentGoal]);

  const handleTileClick = useCallback((x: number, y: number) => {
    const tool = toolRef.current;
    const cfg = getBuildingConfig(tool);
    const tile = gridRef.current[y][x];

    if (tool === BuildingType.None) {
        if (tile.buildingType !== BuildingType.None) {
            setGrid(prev => prev.map(r => r.map(c => (c.x === x && c.y === y) ? { x, y, buildingType: BuildingType.None, level: 1 } : c)));
            setStats(prev => ({ ...prev, gold: Math.max(0, prev.gold - 5) }));
            spawnFloatingText(x, y, "-5g", "#ef4444");
        }
        return;
    }

    if (tile.buildingType === BuildingType.None) {
        if (statsRef.current.gold >= cfg.cost) {
            setStats(prev => ({ ...prev, gold: prev.gold - cfg.cost }));
            spawnFloatingText(x, y, `-${cfg.cost}g`, "#f59e0b");
            let newGrid = gridRef.current.map(r => r.map(c => (c.x === x && c.y === y) ? { 
                ...c, 
                buildingType: tool, 
                rotation: rotRef.current, 
                isOpen: true,
                level: 1
            } : c));
            
            if (tool === BuildingType.Moat || tool === BuildingType.Drawbridge) {
                newGrid = propagateWater(newGrid, x, y);
            }
            
            setGrid(newGrid);
            setSelectedTilePos({x, y});
        } else {
            addNewsItem({ id: `error-${Date.now()}`, text: "Our coffers are empty, sire!", type: 'negative' });
        }
    } else {
        setSelectedTilePos({x, y});
    }
  }, [addNewsItem, spawnFloatingText]);

  const handleUpgrade = () => {
      if (!selectedTilePos) return;
      const tile = gridRef.current[selectedTilePos.y][selectedTilePos.x];
      const cost = getUpgradeCost(tile.buildingType, tile.level || 1);
      
      if (statsRef.current.gold >= cost) {
          setStats(prev => ({ ...prev, gold: prev.gold - cost }));
          spawnFloatingText(tile.x, tile.y, "UPGRADED!", "#10b981");
          setGrid(prev => prev.map(r => r.map(c => (c.x === tile.x && c.y === tile.y) ? { ...c, level: (c.level || 1) + 1 } : c)));
      } else {
          addNewsItem({ id: `error-${Date.now()}`, text: "Not enough gold to upgrade.", type: 'negative' });
      }
  };

  const handleChatSend = async (msg: string) => {
      const userMsg: ChatMessage = { role: 'user', text: msg };
      setChatHistory(prev => [...prev, userMsg]);
      setChatLoading(true);
      
      const response = await chatWithAdvisor([...chatHistory, userMsg], statsRef.current, personaRef.current);
      
      setChatHistory(prev => [...prev, { role: 'advisor', text: response }]);
      setChatLoading(false);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-sky-950 font-serif">
      <Suspense fallback={
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] text-stone-300 font-mono z-0">
          <div className="w-12 h-12 border-4 border-stone-700 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="text-sm tracking-widest uppercase">Loading Realm...</p>
        </div>
      }>
        <IsoMap 
          grid={grid} 
          onTileClick={handleTileClick} 
          hoveredTool={selectedTool} 
          previewRotation={previewRotation} 
          timeOfDay={timeOfDay}
          season={stats.season}
          floatingTexts={floatingTexts}
        />
      </Suspense>
      
      {!gameStarted && (
          <StartScreen 
            onStart={(ai, p) => { setAiEnabled(ai); setPersona(p); setGameStarted(true); }} 
            hasSave={hasSave}
            onContinue={loadGame}
          />
      )}
      
      {gameStarted && activeEvent && (
          <EventModal 
            event={activeEvent} 
            onChoice={(idx) => {
                const choice = activeEvent.choices[idx];
                setStats(prev => ({ ...prev, gold: prev.gold - (choice.costGold || 0) }));
                addNewsItem({ id: `evt-res-${Date.now()}`, text: choice.outcomeText, type: 'neutral' });
                setActiveEvent(null);
            }} 
          />
      )}
      
      {gameStarted && chatOpen && (
          <AdvisorChat 
             history={chatHistory}
             onSend={handleChatSend}
             isLoading={chatLoading}
             onClose={() => setChatOpen(false)}
             persona={persona}
          />
      )}

      {gameStarted && (
        <UIOverlay 
          stats={stats} 
          selectedTool={selectedTool} 
          onSelectTool={setSelectedTool} 
          currentGoal={currentGoal} 
          newsFeed={newsFeed}
          onClaimReward={() => { 
              setStats(prev => ({ ...prev, gold: prev.gold + (currentGoal?.reward || 0) })); 
              spawnFloatingText(GRID_SIZE/2, GRID_SIZE/2, `+${currentGoal?.reward}g`, "#fbbf24");
              setCurrentGoal(null); 
              fetchNewGoal(); 
          }}
          isGeneratingGoal={isGeneratingGoal} 
          aiEnabled={aiEnabled} 
          advisorPersona={persona}
          onConscript={() => setStats(prev => ({...prev, gold: prev.gold - 50, subjects: Math.max(0, prev.subjects - 1), soldiers: prev.soldiers + 1}))}
          onPromote={() => setStats(prev => ({...prev, gold: prev.gold - 100, soldiers: Math.max(0, prev.soldiers - 1), officers: prev.officers + 1}))}
          selectedTile={selectedTilePos ? grid[selectedTilePos.y][selectedTilePos.x] : null}
          onToggleGate={() => { 
              if (!selectedTilePos) return; 
              setGrid(prev => prev.map(r => r.map(c => (c.x === selectedTilePos.x && c.y === selectedTilePos.y) ? {...c, isOpen: !c.isOpen} : c))); 
          }}
          onToggleLock={() => { 
              if (!selectedTilePos) return; 
              setGrid(prev => prev.map(r => r.map(c => (c.x === selectedTilePos.x && c.y === selectedTilePos.y) ? {...c, isLocked: !c.isLocked} : c))); 
          }}
          onFillMoat={() => { 
              if (selectedTilePos) setGrid(prev => propagateWater(prev, selectedTilePos.x, selectedTilePos.y)); 
          }}
          onRotate={() => setPreviewRotation(prev => (prev + 1) % 4)}
          rotation={previewRotation}
          onUpgrade={handleUpgrade}
          onChatOpen={() => setChatOpen(true)}
        />
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

export default App;
