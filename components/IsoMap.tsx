/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MapControls, Outlines, OrthographicCamera, Cloud, Sky, Stars, Html } from '@react-three/drei';
import { EffectComposer, N8AO, TiltShift2, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { Grid, BuildingType, Season, FloatingText } from '../types';
import { GRID_SIZE, getBuildingConfig } from '../constants';

// --- Global Utilities ---

export const BlockCharacterMaterial = new CustomShaderMaterial({
  baseMaterial: THREE.MeshStandardMaterial,
  roughness: 0.6,
  metalness: 0.1,
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    void main() {
      // Simple stepped lighting effect (Cel Shading)
      // This is a basic approximation for stylized look
      float stepSize = 0.5;
      vec3 color = csm_DiffuseColor.rgb;
      csm_DiffuseColor = vec4(color, csm_DiffuseColor.a);
    }
  `,
});

const WORLD_OFFSET = GRID_SIZE / 2 - 0.5;
const gridToWorld = (x: number, y: number): [number, number, number] => [
  x - WORLD_OFFSET, 
  0, 
  y - WORLD_OFFSET
];

// --- Procedural Texture Generators ---

function createFallbackTexture(): THREE.CanvasTexture {
  const data = new Uint8Array([200, 200, 200, 255]);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  return new THREE.CanvasTexture(new OffscreenCanvas(1,1) as any); 
}

function createNoiseTexture(colorA: string, colorB: string, scale: number = 1): THREE.CanvasTexture {
  if (typeof document === 'undefined') return createFallbackTexture();
  
  const width = 256;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = colorA;
    ctx.fillRect(0, 0, width, height);
    for (let i = 0; i < 4000 * scale; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 3 + 1;
        ctx.globalAlpha = Math.random() * 0.15;
        ctx.fillStyle = colorB;
        ctx.fillRect(x, y, size, size);
    }
    for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 20 + 5;
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = colorB;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createStoneTexture(): THREE.CanvasTexture { return createNoiseTexture('#78716c', '#d6d3d1', 2); }
// Season-aware textures
function createGrassTexture(season: Season): THREE.CanvasTexture { 
    if (season === Season.Winter) return createNoiseTexture('#e2e8f0', '#cbd5e1', 1.5);
    if (season === Season.Autumn) return createNoiseTexture('#d97706', '#b45309', 1.5);
    return createNoiseTexture('#4d7c0f', '#a3e635', 1.5); 
}

function createWaterTexture(): THREE.CanvasTexture {
  if (typeof document === 'undefined') return createFallbackTexture();
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const len = Math.random() * 40 + 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
        ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Geometry constants
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 8);
const coneGeo = new THREE.ConeGeometry(1, 1, 4);
const sphereGeo = new THREE.SphereGeometry(1, 4, 4); 

// --- Component Helpers ---

const PitMesh = ({ x, y, grid, isWet, materials }: { x: number, y: number, grid: Grid, isWet?: boolean, materials: any }) => {
    const waterRef = useRef<THREE.Mesh>(null);
    const waterHeight = useRef(0);
    const conn = useMemo(() => {
        const safeGet = (r: number, c: number) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE ? grid[r][c] : null;
        const isMoatLike = (t: any) => t && (t.buildingType === BuildingType.Moat || t.buildingType === BuildingType.Drawbridge);
        return {
            up: isMoatLike(safeGet(y - 1, x)),
            down: isMoatLike(safeGet(y + 1, x)),
            left: isMoatLike(safeGet(y, x - 1)),
            right: isMoatLike(safeGet(y, x + 1)),
        };
    }, [x, y, grid]);

    useFrame((state, delta) => {
        if (isWet) {
            const targetHeight = 0.4;
            waterHeight.current = THREE.MathUtils.lerp(waterHeight.current, targetHeight, delta * 2);
            if (waterRef.current) {
                waterRef.current.scale.y = waterHeight.current;
                waterRef.current.position.y = -0.5 + waterHeight.current / 2;
                if (waterRef.current.material instanceof THREE.MeshStandardMaterial && waterRef.current.material.map) {
                    waterRef.current.material.map.offset.x -= delta * 0.05;
                }
            }
        } else {
            waterHeight.current = THREE.MathUtils.lerp(waterHeight.current, 0.05, delta * 5);
            if (waterRef.current) {
                waterRef.current.scale.y = waterHeight.current;
                waterRef.current.position.y = -0.45;
            }
        }
    });

    return (
      <group position={[0, -0.55, 0]}>
          <mesh geometry={boxGeo} material={materials.pit} scale={[1, 1, 1]} position={[0, -0.25, 0]} receiveShadow />
          {conn.up && <mesh geometry={boxGeo} material={materials.pit} scale={[0.8, 1, 0.5]} position={[0, -0.25, -0.25]} />}
          {conn.down && <mesh geometry={boxGeo} material={materials.pit} scale={[0.8, 1, 0.5]} position={[0, -0.25, 0.25]} />}
          {conn.left && <mesh geometry={boxGeo} material={materials.pit} scale={[0.5, 1, 0.8]} position={[-0.25, -0.25, 0]} />}
          {conn.right && <mesh geometry={boxGeo} material={materials.pit} scale={[0.5, 1, 0.8]} position={[0.25, -0.25, 0]} />}
          <mesh 
            ref={waterRef} 
            geometry={boxGeo} 
            material={isWet ? materials.waterWet : materials.waterDry} 
            scale={[1, 0.05, 1]} 
            position={[0, -0.45, 0]} 
            receiveShadow 
          />
      </group>
    );
};

const DrawbridgeMesh = ({ x, y, grid, isOpen, isWet, materials }: any) => {
    const bridgeRef = useRef<THREE.Group>(null);
    const angleRef = useRef(isOpen ? 0 : -1.48);
    const velRef = useRef(0);
    useFrame((_, delta) => {
        if (!bridgeRef.current) return;
        const target = isOpen ? 0 : -1.48;
        const diff = angleRef.current - target;
        velRef.current += (-100 * diff - 10 * velRef.current) * delta;
        angleRef.current += velRef.current * delta;
        if (angleRef.current > 0) {
          angleRef.current = 0;
          if (Math.abs(velRef.current) > 0.5) velRef.current *= -0.3; else velRef.current = 0;
        }
        bridgeRef.current.rotation.x = angleRef.current;
    });

    return (
        <group>
            <PitMesh x={x} y={y} grid={grid} isWet={isWet} materials={materials} />
            <group position={[0, 0, -0.45]}>
                <mesh geometry={boxGeo} material={materials.stone} scale={[0.2, 1.4, 0.25]} position={[-0.45, 0.4, 0]} castShadow />
                <mesh geometry={boxGeo} material={materials.stone} scale={[0.2, 1.4, 0.25]} position={[0.45, 0.4, 0]} castShadow />
                <mesh geometry={boxGeo} material={materials.stone} scale={[1.1, 0.3, 0.25]} position={[0, 0.95, 0]} castShadow />
                <mesh geometry={cylinderGeo} material={materials.metal} rotation={[0,0,Math.PI/2]} scale={[0.1, 1.0, 0.1]} position={[0, 0.8, 0]} />
            </group>
            <group ref={bridgeRef} position={[0, -0.25, -0.42]}>
                <mesh geometry={boxGeo} material={isWet ? materials.woodWet : materials.wood} scale={[0.85, 0.1, 0.95]} position={[0, 0, 0.475]} castShadow receiveShadow />
                <mesh geometry={boxGeo} material={materials.wood} scale={[0.08, 0.25, 0.95]} position={[-0.38, 0.15, 0.475]} castShadow />
                <mesh geometry={boxGeo} material={materials.wood} scale={[0.08, 0.25, 0.95]} position={[0.38, 0.15, 0.475]} castShadow />
                <group position={[0, 0.35, 0.85]}>
                  <mesh rotation={[0.4, 0, 0]} position={[-0.35, 0.3, -0.4]} material={materials.chain}><cylinderGeometry args={[0.015, 0.015, 1.2]} /></mesh>
                  <mesh rotation={[0.4, 0, 0]} position={[0.35, 0.3, -0.4]} material={materials.chain}><cylinderGeometry args={[0.015, 0.015, 1.2]} /></mesh>
                </group>
            </group>
        </group>
    );
};

const ProceduralBuilding = React.memo(({ type, x, y, grid, rotation = 0, isOpen, isWet, level = 1, materials }: any) => {
  const config = getBuildingConfig(type);
  const commonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: config.color, flatShading: true }), [config.color]);
  // Convert 0-3 rotation int to Radians
  const rotY = -(rotation || 0) * (Math.PI / 2);
  const scaleMod = 1 + (level - 1) * 0.15; // Building gets slightly bigger per level

  return (
    <group rotation={[0, rotY, 0]} position={[0, -0.3, 0]} scale={[scaleMod, scaleMod, scaleMod]}>
      {(() => {
        switch (type) {
          case BuildingType.Wall:
             const safeGet = (r: number, c: number) => r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE ? grid[r][c] : null;
             // TODO: Walls should connect based on world position, but for now simple local logic.
             return (
               <group>
                  <mesh geometry={boxGeo} material={materials.stone} scale={[0.4, 1.0, 1.0]} position={[0, 0.25, 0]} castShadow receiveShadow />
               </group>
             );
          case BuildingType.Tower:
             return (
                 <group>
                     <mesh geometry={cylinderGeo} material={materials.stone} scale={[0.45, 1.4, 0.45]} position={[0, 0.6, 0]} castShadow />
                     <mesh geometry={coneGeo} material={materials.wood} scale={[0.55, 0.5, 0.55]} position={[0, 1.5, 0]} castShadow />
                 </group>
             );
          case BuildingType.Keep:
             return <mesh geometry={boxGeo} material={materials.stone} scale={[0.8, 1.2, 0.8]} position={[0, 0.5, 0]} castShadow />;
          case BuildingType.Barracks:
             return <mesh geometry={boxGeo} material={materials.stone} scale={[0.8, 0.6, 0.8]} position={[0, 0.3, 0]} castShadow />;
          case BuildingType.Hovel:
             return <mesh geometry={boxGeo} material={materials.wood} scale={[0.6, 0.5, 0.6]} position={[0, 0.25, 0]} castShadow />;
          case BuildingType.Gatehouse:
             return (
                 <group>
                     <mesh geometry={boxGeo} material={materials.stone} scale={[0.3, 1.2, 0.9]} position={[-0.35, 0.5, 0]} castShadow />
                     <mesh geometry={boxGeo} material={materials.stone} scale={[0.3, 1.2, 0.9]} position={[0.35, 0.5, 0]} castShadow />
                 </group>
             );
          case BuildingType.Moat: return <PitMesh x={x} y={y} grid={grid} isWet={isWet} materials={materials} />;
          case BuildingType.Drawbridge: return <DrawbridgeMesh x={x} y={y} grid={grid} isOpen={isOpen} isWet={isWet} materials={materials} />;
          case BuildingType.Market: return <mesh geometry={boxGeo} material={commonMat} scale={[0.8, 0.4, 0.6]} position={[0, 0.2, 0]} castShadow />;
          case BuildingType.Farm: return <mesh geometry={boxGeo} material={commonMat} scale={[0.9, 0.1, 0.9]} position={[0, 0.05, 0]} receiveShadow />;
          default: return null;
        }
      })()}
    </group>
  );
});

const NatureSystem = React.memo(({ grid, materials, season }: { grid: Grid, materials: any, season: Season }) => {
    const treeRef = useRef<THREE.InstancedMesh>(null);
    const rockRef = useRef<THREE.InstancedMesh>(null);
    const decor = useMemo(() => {
        const trees: any[] = [];
        const rocks: any[] = [];
        grid.forEach((row, y) => row.forEach((tile, x) => {
            if (tile.buildingType === BuildingType.None) {
                const noise = Math.sin(x * 0.8) + Math.cos(y * 0.8);
                if (Math.random() > 0.92 && noise > 0) {
                    trees.push({ x, y, scale: 0.3 + Math.random() * 0.2, rot: Math.random() * Math.PI });
                } else if (Math.random() > 0.99) {
                    rocks.push({ x, y, scale: 0.1 + Math.random() * 0.15, rot: Math.random() * Math.PI });
                }
            }
        }));
        return { trees, rocks };
    }, []); 

    const treeColor = useMemo(() => {
        if (season === Season.Winter) return new THREE.Color('#cbd5e1');
        if (season === Season.Autumn) return new THREE.Color('#d97706');
        return new THREE.Color('#166534');
    }, [season]);

    useFrame(() => {
        if (treeRef.current) {
            const dummy = new THREE.Object3D();
            decor.trees.forEach((d, i) => {
                const [wx, _, wz] = gridToWorld(d.x, d.y);
                const heightVar = Math.sin(d.x * 0.5) * Math.cos(d.y * 0.5) * 0.1;
                dummy.position.set(wx, heightVar, wz);
                dummy.scale.set(d.scale, d.scale * 1.5, d.scale);
                dummy.rotation.set(0, d.rot, 0);
                dummy.updateMatrix();
                treeRef.current!.setMatrixAt(i, dummy.matrix);
                treeRef.current!.setColorAt(i, treeColor);
            });
            treeRef.current.instanceMatrix.needsUpdate = true;
            if (treeRef.current.instanceColor) treeRef.current.instanceColor.needsUpdate = true;
        }
        if (rockRef.current) {
            const dummy = new THREE.Object3D();
            decor.rocks.forEach((d, i) => {
                const [wx, _, wz] = gridToWorld(d.x, d.y);
                const heightVar = Math.sin(d.x * 0.5) * Math.cos(d.y * 0.5) * 0.1;
                dummy.position.set(wx, heightVar - 0.2, wz);
                dummy.scale.set(d.scale * 2, d.scale, d.scale * 2);
                dummy.rotation.set(Math.random(), d.rot, Math.random());
                dummy.updateMatrix();
                rockRef.current!.setMatrixAt(i, dummy.matrix);
            });
            rockRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <group>
            <instancedMesh ref={treeRef} args={[coneGeo, undefined, decor.trees.length]} castShadow receiveShadow>
                <meshStandardMaterial color="white" /> {/* Color set via instanceColor */}
            </instancedMesh>
            <instancedMesh ref={rockRef} args={[sphereGeo, materials.stone, decor.rocks.length]} castShadow receiveShadow />
        </group>
    );
});

// --- UNIT & AI SYSTEM ---

type UnitType = 'peasant' | 'soldier' | 'officer' | 'enemy';
type UnitState = 'idle' | 'moving' | 'attacking' | 'patrolling' | 'fleeing';
type Formation = 'line' | 'wedge' | 'circle';

interface Unit {
  id: number;
  type: UnitType;
  x: number;
  y: number;
  tx: number; // target x
  ty: number; // target y
  state: UnitState;
  hp: number;
  leaderId?: number; // For soldiers
  squadMemberIds: number[]; // For officers
  formation: Formation; // For officers
  targetId?: number; // ID of enemy unit being attacked
  targetBuilding?: {x: number, y: number}; // For enemies attacking buildings
  lastAttackTime?: number; // For visual feedback
}

import { Instances, Instance } from '@react-three/drei';

const UnitSystem = React.memo(({ grid, stats, onBuildingDestroyed }: { grid: Grid, stats?: any, onBuildingDestroyed?: (x: number, y: number) => void }) => {
    const unitsRef = useRef<Unit[]>([]);
    const [unitsState, setUnitsState] = useState<Unit[]>([]);
    
    // AI Constants
    const SIGHT_RANGE = 8;
    const ATTACK_RANGE = 1.5;
    const SPEED_MOD = 1.5;

    // Initialize Units
    useEffect(() => {
        if (unitsRef.current.length === 0) {
            let uid = 0;
            const spawn = (type: UnitType, count: number) => {
                for (let i = 0; i < count; i++) {
                    const lx = Math.random() * GRID_SIZE;
                    const ly = Math.random() * GRID_SIZE;
                    unitsRef.current.push({
                        id: uid++,
                        type,
                        x: lx, y: ly,
                        tx: lx, ty: ly,
                        state: 'idle',
                        hp: 100,
                        squadMemberIds: [],
                        formation: 'wedge'
                    });
                }
            };
            spawn('officer', stats?.officers || 0);
            spawn('soldier', stats?.soldiers || 0);
            spawn('peasant', stats?.subjects || 5);
            spawn('enemy', 4);
            setUnitsState([...unitsRef.current]);
        }
    }, [stats?.officers, stats?.soldiers, stats?.subjects]);

    // Handle spawning new units when stats change
    useEffect(() => {
        if (!stats) return;
        
        let changed = false;
        let maxId = unitsRef.current.reduce((max, u) => Math.max(max, u.id), -1);
        
        const spawnNew = (type: UnitType, count: number) => {
            const currentCount = unitsRef.current.filter(u => u.type === type).length;
            if (currentCount < count) {
                for (let i = 0; i < count - currentCount; i++) {
                    // Try to find a Barracks for soldiers/officers, Keep for peasants
                    let spawnX = Math.random() * GRID_SIZE;
                    let spawnY = Math.random() * GRID_SIZE;
                    
                    const targetBuilding = (type === 'soldier' || type === 'officer') ? BuildingType.Barracks : BuildingType.Keep;
                    const spawnPoints: {x: number, y: number}[] = [];
                    grid.forEach(row => row.forEach(tile => {
                        if (tile.buildingType === targetBuilding) {
                            spawnPoints.push({x: tile.x, y: tile.y});
                        }
                    }));
                    
                    if (spawnPoints.length > 0) {
                        const pt = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
                        spawnX = pt.x + (Math.random() - 0.5);
                        spawnY = pt.y + (Math.random() - 0.5);
                    }
                    
                    unitsRef.current.push({
                        id: ++maxId,
                        type,
                        x: spawnX, y: spawnY,
                        tx: spawnX, ty: spawnY,
                        state: 'idle',
                        hp: 100,
                        squadMemberIds: [],
                        formation: 'wedge'
                    });
                    changed = true;
                }
            }
        };
        
        spawnNew('officer', stats.officers);
        spawnNew('soldier', stats.soldiers);
        spawnNew('peasant', stats.subjects);
        
        if (changed) {
            setUnitsState([...unitsRef.current]);
        }
    }, [stats?.officers, stats?.soldiers, stats?.subjects, grid]);

    // Periodic Enemy Spawning
    useEffect(() => {
        const interval = setInterval(() => {
            if (unitsRef.current.filter(u => u.type === 'enemy').length < 5) {
                let maxId = unitsRef.current.reduce((max, u) => Math.max(max, u.id), -1);
                
                // Spawn at edges
                let spawnX = Math.random() > 0.5 ? 0 : GRID_SIZE - 1;
                let spawnY = Math.random() * GRID_SIZE;
                if (Math.random() > 0.5) {
                    spawnX = Math.random() * GRID_SIZE;
                    spawnY = Math.random() > 0.5 ? 0 : GRID_SIZE - 1;
                }
                
                unitsRef.current.push({
                    id: ++maxId,
                    type: 'enemy',
                    x: spawnX, y: spawnY,
                    tx: spawnX, ty: spawnY,
                    state: 'moving',
                    hp: 100,
                    squadMemberIds: [],
                    formation: 'wedge'
                });
                setUnitsState([...unitsRef.current]);
            }
        }, 10000); // Try to spawn an enemy every 10 seconds
        
        return () => clearInterval(interval);
    }, []);
    const patrolPoints = useMemo(() => {
        const points: {x: number, y: number}[] = [];
        grid.forEach(row => row.forEach(tile => {
            if ([BuildingType.Wall, BuildingType.Tower, BuildingType.Gatehouse, BuildingType.Keep, BuildingType.Barracks].includes(tile.buildingType)) {
                points.push({x: tile.x, y: tile.y});
            }
        }));
        return points;
    }, [grid]);

    // Helper: Find nearest unit/building
    const findNearest = (u: Unit, predicate: (other: Unit) => boolean) => {
        let minD = Infinity;
        let target: Unit | null = null;
        unitsRef.current.forEach(other => {
            if (u.id !== other.id && predicate(other)) {
                const d = Math.hypot(u.x - other.x, u.y - other.y);
                if (d < minD) { minD = d; target = other; }
            }
        });
        return { target, dist: minD };
    };

    // Helper: Calculate Formation Position
    const getFormationOffset = (index: number, type: Formation, dirX: number, dirY: number) => {
        const len = Math.hypot(dirX, dirY) || 1;
        const dx = dirX / len; const dy = dirY / len;
        const rx = -dy; const ry = dx; 
        
        if (type === 'wedge') {
            const row = Math.floor((index + 1) / 2);
            const side = index % 2 === 0 ? 1 : -1;
            return { 
                x: -dx * row * 1.5 + rx * side * row * 1.0, 
                y: -dy * row * 1.5 + ry * side * row * 1.0 
            };
        }
        const spacing = 1.2;
        const side = index % 2 === 0 ? 1 : -1;
        const offset = Math.ceil(index / 2) * spacing;
        return { x: rx * side * offset, y: ry * side * offset };
    };

    useFrame((state, delta) => {
        const t = state.clock.elapsedTime;
        const frame = state.clock.getElapsedTime() * 60;

        if (Math.floor(frame) % 20 === 0) {
            unitsRef.current.forEach(u => {
                if (u.type === 'officer') {
                    if (u.squadMemberIds.length < 4) {
                        const { target: recruit } = findNearest(u, (o) => o.type === 'soldier' && o.leaderId === undefined);
                        if (recruit && Math.hypot(u.x - recruit.x, u.y - recruit.y) < SIGHT_RANGE) {
                            recruit.leaderId = u.id;
                            u.squadMemberIds.push(recruit.id);
                        }
                    }

                    const { target: enemy, dist } = findNearest(u, (o) => o.type === 'enemy');
                    
                    if (enemy && dist < SIGHT_RANGE) {
                        u.state = 'attacking';
                        u.targetId = enemy.id;
                        u.tx = enemy.x; u.ty = enemy.y;
                    } else {
                        u.state = 'patrolling';
                        u.targetId = undefined;
                        if (Math.hypot(u.x - u.tx, u.y - u.ty) < 1) {
                            u.tx = Math.max(2, Math.min(GRID_SIZE-3, u.x + (Math.random()-0.5)*20));
                            u.ty = Math.max(2, Math.min(GRID_SIZE-3, u.y + (Math.random()-0.5)*20));
                        }
                    }
                }

                if (u.type === 'soldier') {
                    const leader = unitsRef.current.find(l => l.id === u.leaderId);
                    
                    if (leader) {
                        if (leader.state === 'attacking' && leader.targetId !== undefined) {
                            const target = unitsRef.current.find(t => t.id === leader.targetId);
                            if (target) {
                                u.tx = target.x + (Math.random()-0.5); 
                                u.ty = target.y + (Math.random()-0.5);
                                const distToTarget = Math.hypot(u.x - target.x, u.y - target.y);
                                if (distToTarget < ATTACK_RANGE) {
                                    u.state = 'attacking';
                                    u.targetId = target.id;
                                } else {
                                    u.state = 'moving';
                                    u.targetId = undefined;
                                }
                            }
                        } else {
                            const squadIndex = leader.squadMemberIds.indexOf(u.id);
                            const dirX = leader.tx - leader.x;
                            const dirY = leader.ty - leader.y;
                            const offset = getFormationOffset(squadIndex, leader.formation, dirX, dirY);
                            u.tx = leader.x + offset.x;
                            u.ty = leader.y + offset.y;
                            u.state = 'moving';
                            u.targetId = undefined;
                        }
                    } else {
                        const { target: enemy, dist } = findNearest(u, (o) => o.type === 'enemy');
                        
                        if (enemy && dist < SIGHT_RANGE) {
                            u.state = 'attacking';
                            u.targetId = enemy.id;
                            u.tx = enemy.x; u.ty = enemy.y;
                            
                            unitsRef.current.forEach(ally => {
                                if (ally.type === 'soldier' && !ally.leaderId && ally.state !== 'attacking' && ally.id !== u.id) {
                                    const d = Math.hypot(ally.x - u.x, ally.y - u.y);
                                    if (d < 5) {
                                        ally.state = 'attacking';
                                        ally.targetId = enemy.id;
                                        ally.tx = enemy.x; ally.ty = enemy.y;
                                    }
                                }
                            });
                        } else {
                             if (u.state === 'attacking') {
                                 u.state = 'patrolling';
                                 u.targetId = undefined;
                             }

                             const distToDest = Math.hypot(u.x - u.tx, u.y - u.ty);
                             if (distToDest < 0.5) {
                                 u.state = 'patrolling';
                                 
                                 if (patrolPoints.length > 0) {
                                     const pt = patrolPoints[Math.floor(Math.random() * patrolPoints.length)];
                                     u.tx = pt.x; u.ty = pt.y;
                                 } else {
                                     u.tx = Math.max(0, Math.min(GRID_SIZE, u.x + (Math.random()-0.5)*10));
                                     u.ty = Math.max(0, Math.min(GRID_SIZE, u.y + (Math.random()-0.5)*10));
                                 }
                             }
                        }
                    }
                }

                if (u.type === 'enemy') {
                    const { target: prey, dist } = findNearest(u, (o) => o.type !== 'enemy');
                    if (prey && dist < SIGHT_RANGE * 2) {
                        u.tx = prey.x; u.ty = prey.y;
                        if (dist < ATTACK_RANGE) {
                            u.state = 'attacking';
                            u.targetId = prey.id;
                            u.targetBuilding = undefined;
                        } else {
                            u.state = 'moving';
                            u.targetId = undefined;
                        }
                    } else {
                        // Find nearest building
                        let nearestBuilding: {x: number, y: number} | null = null;
                        let minDB = Infinity;
                        grid.forEach(row => row.forEach(tile => {
                            if (tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Path) {
                                const d = Math.hypot(u.x - tile.x, u.y - tile.y);
                                if (d < minDB) { minDB = d; nearestBuilding = {x: tile.x, y: tile.y}; }
                            }
                        }));
                        
                        if (nearestBuilding) {
                            u.tx = nearestBuilding.x; u.ty = nearestBuilding.y;
                            if (minDB < ATTACK_RANGE) {
                                u.state = 'attacking';
                                u.targetBuilding = nearestBuilding;
                                u.targetId = undefined;
                            } else {
                                u.state = 'moving';
                                u.targetBuilding = undefined;
                            }
                        } else {
                            // Wander
                            if (Math.hypot(u.x - u.tx, u.y - u.ty) < 1) {
                                u.tx = Math.max(0, Math.min(GRID_SIZE, u.x + (Math.random()-0.5)*10));
                                u.ty = Math.max(0, Math.min(GRID_SIZE, u.y + (Math.random()-0.5)*10));
                            }
                            u.state = 'moving';
                        }
                    }
                }
            });
            // Only update state if array length changes to avoid unnecessary re-renders
            if (unitsState.length !== unitsRef.current.length) {
                setUnitsState([...unitsRef.current]);
            }
        }

        if (Math.floor(frame) % 60 === 0) {
            // Combat logic (1 attack per second)
            let unitsDied = false;
            let damageDealt = false;
            unitsRef.current.forEach(u => {
                if (u.state === 'attacking') {
                    if (u.targetId !== undefined) {
                        const target = unitsRef.current.find(t => t.id === u.targetId);
                        if (target) {
                            const dist = Math.hypot(u.x - target.x, u.y - target.y);
                            if (dist < ATTACK_RANGE) {
                                // Deal damage
                                const damage = u.type === 'officer' ? 25 : (u.type === 'soldier' ? 15 : 10);
                                target.hp -= damage;
                                damageDealt = true;
                                
                                // Visual feedback
                                u.lastAttackTime = t;
                            }
                        } else {
                            u.state = 'idle';
                            u.targetId = undefined;
                        }
                    } else if (u.targetBuilding) {
                        const dist = Math.hypot(u.x - u.targetBuilding.x, u.y - u.targetBuilding.y);
                        if (dist < ATTACK_RANGE) {
                            // Visual feedback
                            u.lastAttackTime = t;
                            
                            // 10% chance to destroy building per hit
                            if (Math.random() < 0.1 && onBuildingDestroyed) {
                                onBuildingDestroyed(u.targetBuilding.x, u.targetBuilding.y);
                                u.state = 'idle';
                                u.targetBuilding = undefined;
                            }
                        }
                    }
                }
            });
            
            // Remove dead units
            const aliveUnits = unitsRef.current.filter(u => u.hp > 0);
            if (aliveUnits.length < unitsRef.current.length) {
                unitsRef.current = aliveUnits;
                unitsDied = true;
            }
            
            if (unitsDied || damageDealt) {
                // Deep copy to trigger re-render of HP bars
                setUnitsState(unitsRef.current.map(u => ({...u})));
            }
        }

        unitsRef.current.forEach((u, i) => {
            const dx = u.tx - u.x; const dy = u.ty - u.y;
            const dist = Math.hypot(dx, dy);
            
            let speed = 1.0;
            if (u.type === 'officer') speed = 1.2;
            if (u.type === 'enemy') speed = 1.3;
            if (u.state === 'attacking') speed = 2.0;

            if (dist > 0.1) {
                u.x += (dx / dist) * delta * speed * SPEED_MOD;
                u.y += (dy / dist) * delta * speed * SPEED_MOD;
            }
        });
    });
    
    return (
        <group>
            {/* Bodies */}
            <Instances limit={100} castShadow receiveShadow>
                <boxGeometry args={[0.3, 0.4, 0.2]} />
                <meshStandardMaterial roughness={0.8} metalness={0.1} />
                {unitsState.map((u: Unit, i: number) => (
                    <UnitBody key={`body-${u.id}`} unit={u} index={i} />
                ))}
            </Instances>
            {/* Heads */}
            <Instances limit={100} castShadow receiveShadow>
                <boxGeometry args={[0.25, 0.25, 0.25]} />
                <meshStandardMaterial roughness={0.6} metalness={0.1} />
                {unitsState.map((u: Unit, i: number) => (
                    <UnitHead key={`head-${u.id}`} unit={u} index={i} />
                ))}
            </Instances>
            {/* HP Bars */}
            {unitsState.map((u: Unit) => (
                <UnitHPBar key={`hp-${u.id}`} unit={u} />
            ))}
        </group>
    );
});

const UnitBody: React.FC<{ unit: Unit; index: number }> = ({ unit, index }) => {
    const ref = useRef<any>(null);
    
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime;
        const [wx, _, wz] = gridToWorld(unit.x, unit.y);
        
        const isMoving = Math.hypot(unit.tx - unit.x, unit.ty - unit.y) > 0.1;
        const bob = isMoving ? Math.abs(Math.sin(t * 15 + index)) * 0.05 : 0;
        
        let jump = 0;
        if (unit.lastAttackTime && t - unit.lastAttackTime < 0.2) {
            jump = Math.sin((t - unit.lastAttackTime) * 5 * Math.PI) * 0.2;
        }
        
        const h = 0.2 + bob + jump;
        
        ref.current.position.set(wx, h, wz);
        
        const dx = unit.tx - unit.x; const dy = unit.ty - unit.y;
        if (isMoving) {
            const angle = Math.atan2(dx, dy);
            // Smooth rotation could be added here
            ref.current.rotation.set(0, angle, 0);
        }

        let s = 1.0;
        if (unit.type === 'officer') s = 1.2;
        if (unit.type === 'peasant') s = 0.9;
        
        ref.current.scale.set(s, s, s);
    });

    let color = '#d97706'; // Peasant body (brownish)
    if (unit.type === 'officer') color = '#b45309'; // Officer body
    else if (unit.type === 'soldier') color = '#1e3a8a'; // Soldier body (blue)
    else if (unit.type === 'enemy') color = '#7f1d1d'; // Enemy body (dark red)

    return <Instance ref={ref} color={color} />;
};

const UnitHPBar: React.FC<{ unit: Unit }> = ({ unit }) => {
    const ref = useRef<any>(null);
    
    useFrame(() => {
        if (!ref.current) return;
        const [wx, _, wz] = gridToWorld(unit.x, unit.y);
        ref.current.position.set(wx, 1.2, wz);
    });
    
    if (unit.hp >= 100) return null;
    
    return (
        <group ref={ref}>
            <Html center style={{ pointerEvents: 'none' }}>
                <div className="w-8 h-1.5 bg-red-900 rounded-full overflow-hidden border border-black/50">
                    <div className="h-full bg-green-500" style={{ width: `${Math.max(0, unit.hp)}%` }} />
                </div>
            </Html>
        </group>
    );
};

const UnitHead: React.FC<{ unit: Unit; index: number }> = ({ unit, index }) => {
    const ref = useRef<any>(null);
    
    useFrame((state) => {
        if (!ref.current) return;
        const t = state.clock.elapsedTime;
        const [wx, _, wz] = gridToWorld(unit.x, unit.y);
        
        const isMoving = Math.hypot(unit.tx - unit.x, unit.ty - unit.y) > 0.1;
        const bob = isMoving ? Math.abs(Math.sin(t * 15 + index)) * 0.05 : 0;
        
        let jump = 0;
        if (unit.lastAttackTime && t - unit.lastAttackTime < 0.2) {
            jump = Math.sin((t - unit.lastAttackTime) * 5 * Math.PI) * 0.2;
        }
        
        let s = 1.0;
        if (unit.type === 'officer') s = 1.2;
        if (unit.type === 'peasant') s = 0.9;

        const bodyHeight = 0.4 * s;
        const h = 0.2 + bob + jump + (bodyHeight / 2) + (0.25 * s / 2); // Position on top of body
        
        ref.current.position.set(wx, h, wz);
        
        const dx = unit.tx - unit.x; const dy = unit.ty - unit.y;
        if (isMoving) {
            const angle = Math.atan2(dx, dy);
            // Head looks slightly towards movement
            ref.current.rotation.set(0, angle, 0);
        }

        ref.current.scale.set(s, s, s);
    });

    let color = '#fcd34d'; // Peasant head (skin tone)
    if (unit.type === 'officer') color = '#fbbf24'; // Officer head
    else if (unit.type === 'soldier') color = '#fde68a'; // Soldier head
    else if (unit.type === 'enemy') color = '#fca5a5'; // Enemy head

    return <Instance ref={ref} color={color} />;
};

// --- Main View ---

export default function IsoMap({ grid, stats, onTileClick, hoveredTool, previewRotation, timeOfDay, season, floatingTexts, onBuildingDestroyed }: any) {
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);

  // Re-create textures when season changes
  const textures = useMemo(() => ({
      grass: createGrassTexture(season),
      stone: createStoneTexture(),
      water: createWaterTexture(),
  }), [season]);

  const materials = useMemo(() => ({
    grass: new THREE.MeshStandardMaterial({ map: textures.grass, roughness: 0.8, color: '#ffffff' }),
    dirt: new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 1 }),
    stone: new THREE.MeshStandardMaterial({ map: textures.stone, roughness: 0.7, color: '#ffffff' }),
    wood: new THREE.MeshStandardMaterial({ color: '#5D4037', roughness: 0.9 }),
    woodWet: new THREE.MeshStandardMaterial({ color: '#3e2723', roughness: 0.3, metalness: 0.1 }),
    waterWet: new THREE.MeshStandardMaterial({ map: textures.water, color: '#3b82f6', transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.6 }),
    waterDry: new THREE.MeshStandardMaterial({ color: '#271c19' }),
    pit: new THREE.MeshStandardMaterial({ color: '#1a120b' }),
    metal: new THREE.MeshStandardMaterial({ color: '#4b5563', metalness: 0.8, roughness: 0.4 }),
    chain: new THREE.MeshStandardMaterial({ color: '#1f2937', metalness: 0.9 }),
  }), [textures]);

  // Calculate Sun Position based on timeOfDay (0..1)
  const sunX = Math.sin(timeOfDay * Math.PI * 2) * 100;
  const sunY = Math.cos(timeOfDay * Math.PI * 2) * 100;
  // Day is when Y > 0.
  const isNight = sunY < 0;

  return (
    <div className="absolute inset-0 bg-sky-900 touch-none transition-colors duration-1000" style={{ backgroundColor: isNight ? '#020617' : '#0c4a6e' }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, alpha: false, preserveDrawingBuffer: false }}>
        <fog attach="fog" args={[isNight ? '#020617' : '#0c4a6e', 50, 300]} />
        <Sky sunPosition={[sunX, sunY, 50]} turbidity={8} rayleigh={isNight ? 0.5 : 6} />
        <Stars radius={200} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Cloud opacity={isNight ? 0.1 : 0.4} speed={0.2} width={60} depth={10} segments={10} position={[0, 30, -30]} />
        
        <OrthographicCamera makeDefault zoom={32} position={[40, 40, 40]} near={-100} far={500} />
        <MapControls enableRotate enableZoom minZoom={15} maxZoom={80} maxPolarAngle={Math.PI / 2.2} target={[0,0,0]} />
        
        <ambientLight intensity={isNight ? 0.1 : 0.8} color="#e0f2fe" />
        <directionalLight 
            castShadow 
            position={[sunX, Math.max(10, sunY), 50]} 
            intensity={isNight ? 0 : 2.0} 
            shadow-mapSize={[2048, 2048]} 
            shadow-camera-left={-50} 
            shadow-camera-right={50} 
            shadow-camera-top={50} 
            shadow-camera-bottom={-50} 
            shadow-bias={-0.0005}
        />
        {/* Night Light */}
        {isNight && <pointLight position={[0, 20, 0]} intensity={0.5} color="#94a3b8" distance={100} />}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
            <planeGeometry args={[300, 300]} />
            <meshStandardMaterial color={isNight ? "#0f172a" : "#0ea5e9"} transparent opacity={0.6} roughness={0.2} metalness={0.3} />
        </mesh>

        <mesh position={[0, -5.5, 0]}>
            <cylinderGeometry args={[25, 10, 10, 8]} />
            <meshStandardMaterial color="#2d2a28" roughness={1} />
        </mesh>

        <group>
            {grid.map((row: any, y: number) => row.map((tile: any, x: number) => {
                const [wx, _, wz] = gridToWorld(x, y);
                const heightVar = Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.15; 
                const isSpecial = tile.buildingType === BuildingType.Moat || tile.buildingType === BuildingType.Drawbridge;
                
                return (
                    <React.Fragment key={`${x}-${y}`}>
                        {!isSpecial && (
                            <mesh 
                              position={[wx, -0.55 + heightVar, wz]} 
                              receiveShadow 
                              onClick={(e) => { e.stopPropagation(); onTileClick(x, y); }}
                              onPointerOver={(e) => { e.stopPropagation(); setHoveredTile({x, y}); }}
                              onPointerOut={() => setHoveredTile(null)}
                            >
                                <boxGeometry args={[1, 0.5, 1]} />
                                {tile.buildingType === BuildingType.Path 
                                    ? <primitive object={materials.dirt} attach="material" />
                                    : <primitive object={materials.grass} attach="material" />
                                }
                            </mesh>
                        )}
                        {isSpecial && (
                             <mesh 
                                position={[wx, -0.55, wz]} 
                                visible={false}
                                onClick={(e) => { e.stopPropagation(); onTileClick(x, y); }}
                                onPointerOver={(e) => { e.stopPropagation(); setHoveredTile({x, y}); }}
                                onPointerOut={() => setHoveredTile(null)}
                            >
                                <boxGeometry args={[1, 1, 1]} />
                            </mesh>
                        )}
                        {tile.buildingType !== BuildingType.None && tile.buildingType !== BuildingType.Path && (
                            <group position={[wx, heightVar, wz]}>
                                <ProceduralBuilding 
                                    type={tile.buildingType} 
                                    x={x} y={y} grid={grid}
                                    rotation={tile.rotation} 
                                    isOpen={tile.isOpen} 
                                    isWet={tile.isWet}
                                    level={tile.level}
                                    materials={materials}
                                />
                            </group>
                        )}
                    </React.Fragment>
                );
            }))}
        </group>
        <NatureSystem grid={grid} materials={materials} season={season} />
        <UnitSystem grid={grid} stats={stats} onBuildingDestroyed={onBuildingDestroyed} />

        {/* Floating Text */}
        {floatingTexts.map((ft: FloatingText) => {
             const [wx, _, wz] = gridToWorld(ft.x, ft.y);
             return (
                 <Html key={ft.id} position={[wx, 2, wz]} style={{ pointerEvents: 'none' }}>
                     <div style={{ 
                         color: ft.color, 
                         opacity: ft.life, 
                         transform: `translateY(-${(1-ft.life)*20}px)`,
                         fontWeight: 'bold',
                         textShadow: '0 1px 2px black',
                         fontSize: '12px',
                         whiteSpace: 'nowrap'
                     }}>
                         {ft.text}
                     </div>
                 </Html>
             );
        })}
        
        {hoveredTile && (
            <group position={[gridToWorld(hoveredTile.x, hoveredTile.y)[0], 0, gridToWorld(hoveredTile.x, hoveredTile.y)[2]]}>
                <mesh position={[0, 0.2, 0]} rotation={[-Math.PI/2, 0, -(previewRotation || 0) * (Math.PI / 2)]}>
                    <planeGeometry args={[1, 1]} />
                    <meshBasicMaterial color={hoveredTool === BuildingType.None ? '#ef4444' : '#fbbf24'} transparent opacity={0.4} />
                    <Outlines thickness={0.05} color="white" />
                </mesh>
                {/* Visual indicator for rotation */}
                {hoveredTool !== BuildingType.None && hoveredTool !== BuildingType.Path && (
                    <mesh position={[0, 0.5, 0]} rotation={[0, -(previewRotation || 0) * (Math.PI / 2), 0]}>
                       <boxGeometry args={[0.2, 0.5, 0.2]} />
                       <meshBasicMaterial color="yellow" wireframe />
                    </mesh>
                )}
            </group>
        )}

        <EffectComposer disableNormalPass multisampling={0}>
          <N8AO aoRadius={1.5} intensity={2.0} distanceFalloff={0.2} halfRes />
          <TiltShift2 blur={0.15} taper={0.5} />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
