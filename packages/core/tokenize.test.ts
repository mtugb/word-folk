import { describe, expect, test } from "bun:test";
import { tokenize } from "./tokenize";

describe("tokenize", () => {
    test("空文字", () => {
        expect(tokenize("")).toEqual([]);
    });

    test("見出し語1語", () => {
        expect(tokenize("run")).toEqual([
            { type: "Headword", value: "run" }
        ]);
    });

    test("見出し語＋ヒントを順序通りに分類する", () => {
        expect(tokenize("run 経営")).toEqual([
            { type: "Headword", value: "run" },
            { type: "Hint", value: "経営" }
        ]);
    });

    test("ヒントが先に来ても順序を保持する", () => {
        expect(tokenize("経営 run")).toEqual([
            { type: "Hint", value: "経営" },
            { type: "Headword", value: "run" }
        ]);
    });

    test("句動詞は連続する別々のHeadwordトークンとして返す（マージしない）", () => {
        expect(tokenize("take off")).toEqual([
            { type: "Headword", value: "take" },
            { type: "Headword", value: "off" }
        ]);
    });

    test("数字・記号のみのトークンはNoiseとして保持する（切り捨てない）", () => {
        expect(tokenize("run 123 経営")).toEqual([
            { type: "Headword", value: "run" },
            { type: "Noise", value: "123" },
            { type: "Hint", value: "経営" }
        ]);
    });

    test("連続する半角スペース・全角スペースを区切りとして扱う", () => {
        expect(tokenize("run   経営　off")).toEqual([
            { type: "Headword", value: "run" },
            { type: "Hint", value: "経営" },
            { type: "Headword", value: "off" }
        ]);
    });

    test("アポストロフィ・ハイフンを含む見出し語トークン", () => {
        expect(tokenize("don't mother-in-law")).toEqual([
            { type: "Headword", value: "don't" },
            { type: "Headword", value: "mother-in-law" }
        ]);
    });

    test("漢字・カタカナ長音を含むヒントトークン", () => {
        expect(tokenize("経営 サッカー")).toEqual([
            { type: "Hint", value: "経営" },
            { type: "Hint", value: "サッカー" }
        ]);
    });

    test("数字を含む見出し語トークン（英字が1文字以上あれば許可）", () => {
        expect(tokenize("1st 3D")).toEqual([
            { type: "Headword", value: "1st" },
            { type: "Headword", value: "3D" }
        ]);
    });

    test("数字を含むヒントトークン（かな漢字が1文字以上あれば許可）", () => {
        expect(tokenize("champion 1番になった人")).toEqual([
            { type: "Headword", value: "champion" },
            { type: "Hint", value: "1番になった人" }
        ]);
    });

    test("英字を含むヒントトークン（かな漢字が1文字以上あれば許可）", () => {
        expect(tokenize("IT企業 Web開発者")).toEqual([
            { type: "Hint", value: "IT企業" },
            { type: "Hint", value: "Web開発者" }
        ]);
    });

    test("英字だけのトークンはHeadwordとして分類される（ヒント側には流れない）", () => {
        expect(tokenize("IT")).toEqual([
            { type: "Headword", value: "IT" }
        ]);
    });

    test("数字だけのトークンはNoiseのまま", () => {
        expect(tokenize("run 123 経営")).toEqual([
            { type: "Headword", value: "run" },
            { type: "Noise", value: "123" },
            { type: "Hint", value: "経営" }
        ]);
    });
});
