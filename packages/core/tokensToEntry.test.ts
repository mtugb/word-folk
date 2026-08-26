import { describe, expect, test } from "bun:test";
import { tokenize } from "./tokenize";
import { tokensToEntry } from "./tokensToEntry";
import type { Token } from "./tokenize";

function parse(queriesStr: string) {
    return tokensToEntry(tokenize(queriesStr));
}

describe("tokensToEntry", () => {
    test("単語のみ", () => {
        expect(parse("run")).toEqual({
            headword: ["run"],
            hint: ""
        });
    });

    test("単語＋ヒント", () => {
        expect(parse("run 経営")).toEqual({
            headword: ["run"],
            hint: "経営"
        });
    });

    test("句動詞（連続するHeadwordトークンをマージする）", () => {
        expect(parse("take off")).toEqual({
            headword: ["take", "off"],
            hint: ""
        });
    });

    test("句動詞＋ヒント", () => {
        expect(parse("take off 離陸")).toEqual({
            headword: ["take", "off"],
            hint: "離陸"
        });
    });

    test("空文字", () => {
        expect(parse("")).toEqual({
            headword: [],
            hint: ""
        });
    });

    test("ヒントが先に来るケース（順序が逆）", () => {
        expect(parse("経営 run")).toEqual({
            headword: ["run"],
            hint: "経営"
        });
    });

    test("Noiseトークンは無視する", () => {
        expect(parse("run 123 経営")).toEqual({
            headword: ["run"],
            hint: "経営"
        });
    });

    test("Noiseトークンは見出し語グループの分断とみなさない", () => {
        expect(parse("take 123 off 離陸")).toEqual({
            headword: ["take", "off"],
            hint: "離陸"
        });
    });

    test("見出し語グループがヒントトークンで分断される場合はエラー", () => {
        expect(() => parse("take 経営 off")).toThrow();
    });

    test("英日が2回以上交互に出現する場合はエラー", () => {
        expect(() => parse("run 経営 walk 歩く")).toThrow();
    });

    test("ヒントが複数トークンに分かれる場合はエラー", () => {
        expect(() => parse("経営 学")).toThrow();
    });

    test("Token配列を直接渡した場合も同様に動作する", () => {
        const tokens: Token[] = [
            { type: "Headword", value: "run" },
            { type: "Hint", value: "経営" }
        ];
        expect(tokensToEntry(tokens)).toEqual({
            headword: ["run"],
            hint: "経営"
        });
    });
});
