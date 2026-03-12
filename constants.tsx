/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { BuildingConfig, BuildingType, AdvisorPersona, Season } from './types';

/**
 * Size of the isometric square grid.
 */
export const GRID_SIZE = 34;

/**
 * Interval in milliseconds between game simulation steps.
 */
export const TICK_RATE_MS = 2000;

/**
 * Starting currency for new kingdoms.
 */
export const INITIAL_GOLD = 800;

/**
 * Local Storage Key
 */
export const SAVE_KEY = 'kingdom_builder_save_v1';

/**
 * Days per season.
 */
export const DAYS_PER_SEASON = 10;

/**
 * Season Sequence.
 */
export const SEASON_ORDER = [Season.Spring, Season.Summer, Season.Autumn, Season.Winter];

/**
 * Persona Descriptions
 */
export const PERSONA_DESCRIPTIONS: Record<AdvisorPersona, string> = {
  [AdvisorPersona.Balanced]: "Focuses on a healthy balance of economy and growth.",
  [AdvisorPersona.Warlord]: "Prioritizes military strength, defenses, and conscription.",
  [AdvisorPersona.Merchant]: "Obsessed with gold generation, trade, and taxation.",
  [AdvisorPersona.Builder]: "Desires a sprawling metropolis with complex infrastructure."
};

/**
 * Map of building types to their gameplay configurations.
 */
export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.None]: {
    type: BuildingType.None,
    cost: 0,
    name: 'Demolish',
    description: 'Clear land',
    color: '#7f1d1d',
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Path]: {
    type: BuildingType.Path,
    cost: 5,
    name: 'Dirt Path',
    description: 'Connects the realm.',
    color: '#78350f',
    popGen: 0,
    incomeGen: 0,
  },
  [BuildingType.Hovel]: {
    type: BuildingType.Hovel,
    cost: 50,
    name: 'Hovel',
    description: '+3 Subjects/day',
    color: '#a16207',
    popGen: 3,
    incomeGen: 0,
  },
  [BuildingType.Market]: {
    type: BuildingType.Market,
    cost: 150,
    name: 'Market',
    description: '+10 Gold/day',
    color: '#dc2626',
    popGen: 0,
    incomeGen: 10,
  },
  [BuildingType.Farm]: {
    type: BuildingType.Farm,
    cost: 100,
    name: 'Farm',
    description: '+5 Gold/day',
    color: '#facc15',
    popGen: 0,
    incomeGen: 5,
  },
  [BuildingType.Keep]: {
    type: BuildingType.Keep,
    cost: 500,
    name: 'Keep',
    description: 'The heart of your rule.',
    color: '#57534e',
    popGen: 1,
    incomeGen: 2,
    defense: 50,
  },
  [BuildingType.Barracks]: {
    type: BuildingType.Barracks,
    cost: 250,
    name: 'Barracks',
    description: 'Train citizens into soldiers.',
    color: '#4b5563',
    popGen: 0,
    incomeGen: 0,
    defense: 10,
  },
  [BuildingType.Wall]: {
    type: BuildingType.Wall,
    cost: 20,
    name: 'Stone Wall',
    description: 'Defensive barrier. Walkable.',
    color: '#d6d3d1',
    popGen: 0,
    incomeGen: 0,
    defense: 5,
  },
  [BuildingType.Gatehouse]: {
    type: BuildingType.Gatehouse,
    cost: 150,
    name: 'Gatehouse',
    description: 'Control access. Toggle open/close.',
    color: '#292524',
    popGen: 0,
    incomeGen: 0,
    defense: 20,
  },
  [BuildingType.Tower]: {
    type: BuildingType.Tower,
    cost: 200,
    name: 'Watch Tower',
    description: 'High vantage point.',
    color: '#e7e5e4',
    popGen: 0,
    incomeGen: 0,
    defense: 30,
  },
  [BuildingType.Moat]: {
    type: BuildingType.Moat,
    cost: 30,
    name: 'Moat',
    description: 'Water barrier. Digs terrain.',
    color: '#1e3a8a',
    popGen: 0,
    incomeGen: 0,
    defense: 15,
  },
  [BuildingType.Drawbridge]: {
    type: BuildingType.Drawbridge,
    cost: 200,
    name: 'Drawbridge',
    description: 'Spans moats. Retractable.',
    color: '#525252',
    popGen: 0,
    incomeGen: 0,
    defense: 25,
  },
};

/**
 * Safely retrieves building configuration, falling back to None if invalid.
 */
export const getBuildingConfig = (type: BuildingType | string | undefined): BuildingConfig => {
  if (!type) return BUILDINGS[BuildingType.None];
  return BUILDINGS[type as BuildingType] || BUILDINGS[BuildingType.None];
};

export const getUpgradeCost = (type: BuildingType, currentLevel: number): number => {
    const base = getBuildingConfig(type).cost;
    return Math.floor(base * (currentLevel + 1)); // Lv1->2 = 2x base. Lv2->3 = 3x base.
};
