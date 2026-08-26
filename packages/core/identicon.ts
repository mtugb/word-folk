export const EYE_VARIANTS = 3;
export const MOUTH_VARIANTS = 3;
export const EYEBROW_VARIANTS = 3;
export const COLOR_VARIANTS = 4;

export interface Face {
    eyes: number;
    mouth: number;
    eyebrows: number;
    color: number;
}

function fnv1aHash(input: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

export function faceFromHeadword(headword: string): Face {
    return {
        eyes: fnv1aHash(`${headword}:eyes`) % EYE_VARIANTS,
        mouth: fnv1aHash(`${headword}:mouth`) % MOUTH_VARIANTS,
        eyebrows: fnv1aHash(`${headword}:eyebrows`) % EYEBROW_VARIANTS,
        color: fnv1aHash(`${headword}:color`) % COLOR_VARIANTS,
    };
}
