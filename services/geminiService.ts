/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI, Type } from "@google/genai";
import { AIGoal, BuildingType, KingdomStats, Grid, NewsItem, AdvisorPersona, GameEvent, ChatMessage } from "../types";
import { BUILDINGS } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const modelId = 'gemini-3-flash-preview';

// List of buildings the AI is allowed to request as part of a goal
const validAiBuildingTypes = [
    BuildingType.Hovel,
    BuildingType.Market,
    BuildingType.Farm,
    BuildingType.Keep,
    BuildingType.Path,
    BuildingType.Barracks,
    BuildingType.Wall,
    BuildingType.Tower
];

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A short, medieval quest description from the Royal Advisor.",
    },
    targetType: {
      type: Type.STRING,
      enum: ['subjects', 'gold', 'building_count', 'defense', 'soldiers'],
      description: "The metric to track.",
    },
    targetValue: {
      type: Type.INTEGER,
      description: "The target numeric value to reach.",
    },
    buildingType: {
      type: Type.STRING,
      enum: validAiBuildingTypes,
      description: "Required if targetType is building_count.",
    },
    reward: {
      type: Type.INTEGER,
      description: "Gold reward from the crown.",
    },
  },
  required: ['description', 'targetType', 'targetValue', 'reward'],
};

// Fallback logic for when API quota is exceeded
const getFallbackGoal = (stats: KingdomStats): AIGoal => {
    const goals: Partial<AIGoal>[] = [
        { description: "The peasantry demands housing. Construct more Hovels.", targetType: 'building_count', buildingType: BuildingType.Hovel, targetValue: 5, reward: 150 },
        { description: "Our coffers must be filled. Amass 1500 Gold.", targetType: 'gold', targetValue: 1500, reward: 300 },
        { description: "Defend the realm! Reach 50 Defense rating.", targetType: 'defense', targetValue: 50, reward: 250 },
        { description: "Feed the kingdom. Build 3 Farms.", targetType: 'building_count', buildingType: BuildingType.Farm, targetValue: 3, reward: 200 },
        { description: "Expand your influence. Reach 50 Subjects.", targetType: 'subjects', targetValue: 50, reward: 200 },
    ];
    // Return a random goal to keep gameplay active without AI
    const goal = goals[Math.floor(Math.random() * goals.length)] as AIGoal;
    return { ...goal, completed: false };
};

export const generateKingdomGoal = async (stats: KingdomStats, grid: Grid, persona: AdvisorPersona): Promise<AIGoal | null> => {
  const counts: Record<string, number> = {};
  grid.flat().forEach(tile => {
    counts[tile.buildingType] = (counts[tile.buildingType] || 0) + 1;
  });

  const context = `
    Kingdom Stats:
    Day: ${stats.day}
    Gold: ${stats.gold}
    Subjects: ${stats.subjects}
    Defense: ${stats.defense}
    Soldiers: ${stats.soldiers}
    Happiness: ${stats.happiness}
    Season: ${stats.season}
    Current Buildings: ${JSON.stringify(counts)}
    Advisor Persona: ${persona}
  `;

  let bias = "Focus on balanced growth.";
  if (persona === AdvisorPersona.Warlord) bias = "Focus heavily on defense, walls, towers, and soldiers.";
  if (persona === AdvisorPersona.Merchant) bias = "Focus purely on gold, markets, and farms.";
  if (persona === AdvisorPersona.Builder) bias = "Focus on infrastructure, housing, and expansion.";

  const prompt = `You are the Royal Advisor (${persona}). Create a new quest for the Monarch. ${bias} Return only JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: goalSchema,
        temperature: 0.8,
      },
    });

    if (response.text) {
      const goalData = JSON.parse(response.text) as Omit<AIGoal, 'completed'>;
      // Sanity check: if building_count is target but buildingType is invalid, fix it
      if (goalData.targetType === 'building_count' && (!goalData.buildingType || !BUILDINGS[goalData.buildingType])) {
          goalData.buildingType = BuildingType.Hovel;
      }
      return { ...goalData, completed: false };
    }
  } catch (error) {
    console.warn("Advisor failed to generate goal (using fallback):", error);
    return getFallbackGoal(stats);
  }
  return getFallbackGoal(stats);
};

// --- EVENTS SYSTEM ---

const eventSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        optionA: { type: Type.STRING, description: "Text for first choice (e.g. 'Pay 100g')" },
        optionB: { type: Type.STRING, description: "Text for second choice (e.g. 'Ignore them')" },
        costA: { type: Type.INTEGER, description: "Gold cost for option A (0 if none)" },
        costB: { type: Type.INTEGER, description: "Gold cost for option B (0 if none)" },
    },
    required: ['title', 'description', 'optionA', 'optionB', 'costA', 'costB']
};

export const generateGameEvent = async (stats: KingdomStats): Promise<GameEvent | null> => {
    const context = `Stats: Pop ${stats.subjects}, Gold ${stats.gold}, Day ${stats.day}, Season ${stats.season}.`;
    const prompt = "Generate a random medieval event that requires a decision. Examples: Plague, Festival, Bandit Raid, Traveling Bard. Return JSON.";

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${context}\n${prompt}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: eventSchema,
                temperature: 1.0,
            },
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return {
                id: `evt-${Date.now()}`,
                title: data.title,
                description: data.description,
                choices: [
                    {
                        text: data.optionA,
                        costGold: data.costA,
                        outcomeText: "You chose wisely.",
                    },
                    {
                        text: data.optionB,
                        costGold: data.costB,
                        outcomeText: "The choice is made.",
                    }
                ]
            };
        }
    } catch (error) {
        return null;
    }
    return null;
};

// --- NEWS SYSTEM ---

const newsSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING, description: "Headline." },
    type: { type: Type.STRING, enum: ['positive', 'negative', 'neutral'] },
  },
  required: ['text', 'type'],
};

const getFallbackNews = (): NewsItem => {
    const items: Omit<NewsItem, 'id'>[] = [
        { text: "The crops are growing well this season.", type: 'positive' },
        { text: "A strange comet was seen in the sky.", type: 'neutral' },
        { text: "Rumors of goblins in the nearby woods.", type: 'negative' },
        { text: "The local tavern is running low on ale.", type: 'negative' },
        { text: "A traveling merchant has arrived.", type: 'positive' },
    ];
    const item = items[Math.floor(Math.random() * items.length)];
    return {
        id: `news-fallback-${Date.now()}-${Math.random()}`,
        text: item.text,
        type: item.type as any,
    };
};

export const generateTownCrierEvent = async (stats: KingdomStats): Promise<NewsItem | null> => {
  const context = `Stats: Pop ${stats.subjects}, Gold ${stats.gold}, Day ${stats.day}, Season ${stats.season}.`;
  const prompt = "Generate a town crier headline in medieval style. Max 10 words.";

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `${context}\n${prompt}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: newsSchema,
        temperature: 1.0,
      },
    });

    if (response.text) {
      const data = JSON.parse(response.text);
      return {
        id: `news-${Date.now()}-${Math.random()}`,
        text: data.text,
        type: data.type,
      };
    }
  } catch (error) {
    return getFallbackNews();
  }
  return getFallbackNews();
};

// --- CHAT SYSTEM ---

export const chatWithAdvisor = async (history: ChatMessage[], stats: KingdomStats, persona: AdvisorPersona): Promise<string> => {
    const context = `
        Role: Medieval Advisor (${persona}).
        Stats: ${JSON.stringify(stats)}.
        Task: Answer the king's questions briefly (max 2 sentences). Be helpful but in character.
    `;
    
    // Convert last 5 messages to string format
    const conversation = history.slice(-5).map(m => `${m.role === 'user' ? 'King' : 'Advisor'}: ${m.text}`).join('\n');

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: `${context}\n\n${conversation}\nAdvisor:`,
        });
        return response.text || "I am at a loss for words, sire.";
    } catch (e) {
        return "The spirits disrupt my thoughts (API Error).";
    }
};
