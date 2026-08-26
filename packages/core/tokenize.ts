export type Token =
    | { type: "Headword"; value: string }
    | { type: "Hint"; value: string }
    | { type: "Noise"; value: string };

const HEADWORD_TOKEN_REGEX = /^(?=.*[a-zA-Z])[a-zA-Z0-9]+(?:['-][a-zA-Z0-9]+)*$/;
const HINT_TOKEN_REGEX = /^(?=.*[ぁ-んァ-ヶ一-鿿])[a-zA-Zぁ-んァ-ヶー一-鿿0-9]+$/;

export function tokenize(queriesStr: string): Token[] {
    return queriesStr
        .split(/\s+/)
        .filter(token => token.length > 0)
        .map((token): Token => {
            if (HEADWORD_TOKEN_REGEX.test(token)) {
                return { type: "Headword", value: token };
            }
            if (HINT_TOKEN_REGEX.test(token)) {
                return { type: "Hint", value: token };
            }
            return { type: "Noise", value: token };
        });
}
