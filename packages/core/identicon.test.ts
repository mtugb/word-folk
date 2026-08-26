import { describe, expect, test } from "bun:test";
import {
    faceFromHeadword,
    EYE_VARIANTS,
    MOUTH_VARIANTS,
    EYEBROW_VARIANTS,
    COLOR_VARIANTS,
} from "./identicon";

describe("faceFromHeadword", () => {
    test("同じ見出し語なら常に同じ顔になる", () => {
        expect(faceFromHeadword("run")).toEqual(faceFromHeadword("run"));
    });

    test("各パーツの値はパレットの範囲内に収まる", () => {
        const words = ["run", "take off", "champion", "経営", "", "a", "mother-in-law"];
        for (const word of words) {
            const face = faceFromHeadword(word);
            expect(face.eyes).toBeGreaterThanOrEqual(0);
            expect(face.eyes).toBeLessThan(EYE_VARIANTS);
            expect(face.mouth).toBeGreaterThanOrEqual(0);
            expect(face.mouth).toBeLessThan(MOUTH_VARIANTS);
            expect(face.eyebrows).toBeGreaterThanOrEqual(0);
            expect(face.eyebrows).toBeLessThan(EYEBROW_VARIANTS);
            expect(face.color).toBeGreaterThanOrEqual(0);
            expect(face.color).toBeLessThan(COLOR_VARIANTS);
        }
    });

    test("空文字列でもクラッシュせず有効な値を返す", () => {
        expect(() => faceFromHeadword("")).not.toThrow();
    });

    test("大文字小文字が違えば別の顔として扱う（正規化しない）", () => {
        expect(faceFromHeadword("run")).not.toEqual(faceFromHeadword("Run"));
    });

    test("異なる見出し語の集合では顔が一様に同じにはならない", () => {
        const words = ["run", "take", "off", "champion", "経営", "walk", "look", "give", "up", "make"];
        const faces = words.map(faceFromHeadword);
        const uniqueSerialized = new Set(faces.map(f => JSON.stringify(f)));
        expect(uniqueSerialized.size).toBeGreaterThan(1);
    });

    test("パーツごとに独立してばらつく（全パーツが常に同じインデックスにならない）", () => {
        const words = ["run", "take", "off", "champion", "経営", "walk", "look", "give", "up", "make"];
        const faces = words.map(faceFromHeadword);
        const allEyesEqualMouth = faces.every(f => f.eyes === f.mouth);
        expect(allEyesEqualMouth).toBe(false);
    });
});
