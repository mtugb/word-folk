import type { Token } from "./tokenize";

export interface Entry {
    headword: string[];
    hint: string;
}

export function tokensToEntry(tokens: Token[]): Entry {
    const headword: string[] = [];
    let hint = "";
    let lastType: "Headword" | "Hint" | null = null;

    for (const token of tokens) {
        if (token.type === "Noise") continue;

        if (token.type === "Headword") {
            if (lastType === "Hint" && headword.length > 0) {
                throw new Error("見出し語のグループが分断されています");
            }
            headword.push(token.value);
            lastType = "Headword";
        } else {
            if (hint.length > 0) {
                throw new Error("ヒントが複数のトークンに分かれています");
            }
            hint = token.value;
            lastType = "Hint";
        }
    }

    return { headword, hint };
}
