import React from "react";
import { faceFromHeadword } from "core";

const HEAD_COLORS = ["#f2a65a", "#59a5a0", "#e2725b", "#6a89cc"];

function Eyes({ variant }: { variant: number }) {
    const positions = [35, 65];
    if (variant === 0) {
        return <>{positions.map(x => <circle key={x} cx={x} cy={45} r={5} fill="#222" />)}</>;
    }
    if (variant === 1) {
        return <>{positions.map(x => <ellipse key={x} cx={x} cy={45} rx={4} ry={7} fill="#222" />)}</>;
    }
    return <>{positions.map(x => (
        <path key={x} d={`M ${x - 6} 45 Q ${x} 38 ${x + 6} 45`} stroke="#222" strokeWidth={3} fill="none" strokeLinecap="round" />
    ))}</>;
}

function Eyebrows({ variant }: { variant: number }) {
    const tilt = variant === 1 ? 6 : variant === 2 ? -6 : 0;
    return (
        <>
            <line x1={28} y1={32 - tilt} x2={42} y2={32 + tilt} stroke="#222" strokeWidth={3} strokeLinecap="round" />
            <line x1={58} y1={32 + tilt} x2={72} y2={32 - tilt} stroke="#222" strokeWidth={3} strokeLinecap="round" />
        </>
    );
}

function Mouth({ variant }: { variant: number }) {
    if (variant === 0) {
        return <path d="M 35 65 Q 50 78 65 65" stroke="#222" strokeWidth={3} fill="none" strokeLinecap="round" />;
    }
    if (variant === 1) {
        return <line x1={38} y1={68} x2={62} y2={68} stroke="#222" strokeWidth={3} strokeLinecap="round" />;
    }
    return <circle cx={50} cy={68} r={6} fill="#222" />;
}

export function FaceIcon({ headword, size = 48 }: { headword: string; size?: number }) {
    const face = faceFromHeadword(headword);
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`${headword} の顔`}>
            <circle cx={50} cy={50} r={46} fill={HEAD_COLORS[face.color]} />
            <Eyebrows variant={face.eyebrows} />
            <Eyes variant={face.eyes} />
            <Mouth variant={face.mouth} />
        </svg>
    );
}
