import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Connection {
    word: string;
    relation: string;
}

export interface ConnectionsResult {
    hasConnections: boolean;
    connections: Connection[];
}

const CONNECTIONS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        hasConnections: {
            type: Type.BOOLEAN,
            description: "自信を持って提案できる関連語が見つかったかどうか",
        },
        connections: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    word: { type: Type.STRING },
                    relation: {
                        type: Type.STRING,
                        description: "見出し語との関係性（類義語、言い換え、コロケーションなど）の説明",
                    },
                },
                required: ["word", "relation"],
            },
        },
    },
    required: ["hasConnections", "connections"],
};

export async function generateConnections(headword: string, hints: string[]): Promise<ConnectionsResult> {
    const prompt = [
        `見出し語: "${headword}"`,
        hints.length > 0 ? `この単語の意味・使われ方のヒント: ${hints.join("、")}` : "",
        "この見出し語と意味的に関連する単語・言い換え表現・コロケーションを日本語で提案してください。",
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
