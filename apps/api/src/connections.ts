import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Connection {
    word: string;
    relation: string;
}

export interface ConnectionsResult {
    hasConnections: boolean;
    meaning: string;
    connections: Connection[];
}

const CONNECTIONS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        meaning: {
            type: Type.STRING,
            description: "今回の関連語がどの意味を前提にしているかの日本語での説明",
        },
        hasConnections: {
            type: Type.BOOLEAN,
            description: "自信を持って提案できる関連語が見つかったかどうか",
        },
        connections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: {
                        type: Type.STRING,
                        description: "関連する英単語・英語表現。日本語訳ではなく必ず英語で書くこと",
                    },
                    relation: {
                        type: Type.STRING,
                        description: "見出し語との関係性（類義語、対義語、言い換え、コロケーションなど）の日本語による説明",
                    },
                },
                required: ["word", "relation"],
            },
        },
    },
    required: ["meaning", "hasConnections", "connections"],
};

export async function generateConnections(headword: string, hint: string): Promise<ConnectionsResult> {
    const prompt = [
        `見出し語（英単語）: "${headword}"`,
        hint
            ? `この単語の意味: "${hint}"\nこの意味に絞って回答してください。`
            : "この単語の意味は指定されていません。この英単語が持つ意味の中から、最も一般的・代表的な意味を1つだけ選び、その意味に絞って回答してください（複数の意味を混ぜないこと）。",
        "meaning には、今回関連語を挙げる際に前提とした意味を日本語で簡潔に書いてください。",
        "その意味において意味的に関連する英単語・英語表現（類義語、対義語、言い換え、コロケーションなど）を提案してください。",
        "connections の word は必ず英語にしてください。日本語訳を word に入れてはいけません。relation は日本語で、関係性を簡潔に説明してください。",
        "確信が持てるものだけを返してください。関連語が思いつかない場合は無理に埋めず、hasConnectionsをfalseにしてください。",
    ].filter(Boolean).join("\n");

    const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: CONNECTIONS_SCHEMA,
        },
    });

    return JSON.parse(response.text ?? "{}") as ConnectionsResult;
}
