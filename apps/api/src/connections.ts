import { GoogleGenAI, Type } from "@google/genai";
import type { WordnetSense } from "./wordnet";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface Connection {
    word: string;
    relation: string;
    pos: PosLabel;
}

export const POS_LABELS = ["名", "動", "句動", "形", "副", "前", "接", "熟", "他"] as const;
export type PosLabel = (typeof POS_LABELS)[number];

const POS_DESCRIPTION =
    "品詞。名詞なら「名」、動詞なら「動」、句動詞（get up, give in のような動詞+副詞/前置詞の組み合わせ）なら「句動」、" +
    "形容詞なら「形」、副詞なら「副」、前置詞なら「前」、接続詞なら「接」、動詞でない慣用句・イディオムなら「熟」、" +
    "それ以外なら「他」。";

export interface ConnectionsResult {
    hasConnections: boolean;
    meaning: string;
    pos: PosLabel;
    connections: Connection[];
}

const CONNECTIONS_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        meaning: {
            type: Type.STRING,
            description: "今回の関連語がどの意味を前提にしているかの日本語での説明",
        },
        pos: {
            type: Type.STRING,
            enum: [...POS_LABELS],
            description: POS_DESCRIPTION,
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
                    pos: {
                        type: Type.STRING,
                        enum: [...POS_LABELS],
                        description: `この関連語自体の品詞（見出し語の品詞と異なってよい）。${POS_DESCRIPTION}`,
                    },
                },
                required: ["word", "relation", "pos"],
            },
        },
    },
    required: ["meaning", "pos", "hasConnections", "connections"],
};

// WordNetのposid ('a'=形容詞衛星も形容詞として扱う) を pos の日本語ラベルに対応付ける参考情報としてプロンプトに渡す。
// 'v' は見出し語が複数語（句動詞）かどうかで「動」/「句動」を出し分ける。
const WORDNET_POS_HINT: Record<string, string> = { n: "名", a: "形", s: "形", r: "副" };

function formatWordnetCandidates(headword: string, senses: WordnetSense[]): string | null {
    if (senses.length === 0) return null;
    const isPhrasal = headword.trim().includes(" ");

    const lines = senses.map((s) => {
        const posLabel = s.pos === "v" ? (isPhrasal ? "句動" : "動") : WORDNET_POS_HINT[s.pos] ?? s.pos;
        const parts = [`品詞: ${posLabel}`, `定義: ${s.definition}`];
        if (s.synonyms.length > 0) parts.push(`類義語候補: ${s.synonyms.join(", ")}`);
        if (s.antonyms.length > 0) parts.push(`対義語候補: ${s.antonyms.join(", ")}`);
        return `- ${parts.join(" / ")}`;
    });

    return [
        "WordNet（信頼できる辞書データ）から得られた、この見出し語が持ちうる語義の一覧:",
        ...lines,
        "pos は、指定された意味に最も近いこの一覧の品詞を優先して答えてください。一覧に無い意味の場合は自分で判断してください。",
        "connections を選ぶ際も、指定された意味に合うものをまずこの一覧の類義語候補・対義語候補から優先して選んでください。",
        "候補に無くても、コロケーションや句動詞など意味的に強く関連する語があれば追加してかまいません。ただし、一覧中に指定された意味と無関係な語義（別の品詞・別の意味）が混じっている場合、それは使わないでください。",
    ].join("\n");
}

export async function generateConnections(
    headword: string,
    hint: string,
    wordnetSenses: WordnetSense[] = []
): Promise<ConnectionsResult> {
    const prompt = [
        `見出し語（英単語）: "${headword}"`,
        hint
            ? `この単語の意味: "${hint}"\nこの意味に絞って回答してください。`
            : "この単語の意味は指定されていません。この英単語が持つ意味の中から、最も一般的・代表的な意味を1つだけ選び、その意味に絞って回答してください（複数の意味を混ぜないこと）。",
        formatWordnetCandidates(headword, wordnetSenses),
        "meaning には、今回関連語を挙げる際に前提とした意味を日本語で簡潔に書いてください。",
        "pos は見出し語の品詞、connections内のposは各関連語自体の品詞です。両者が異なることもあります" +
            "（例: 見出し語 give in は「句動」ですが、関連語 surrender は「動」です）。",
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
