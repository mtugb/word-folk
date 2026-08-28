import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { Send } from "react-feather";
import { tokenize, tokensToEntry, type Entry } from "core";
import { FaceIcon } from "../../components/FaceIcon";
import { BottomNav } from "../../components/BottomNav";
import { api } from "../../lib/api";
import "./box.css";

function TokenPreview({ value }: { value: string }) {
    const tokens = tokenize(value);

    if (tokens.length === 0) {
        return <div className="token-preview token-preview--empty">見出し語と、わかれば意味のヒントを入力</div>;
    }

    return (
        <div className="token-preview">
            {tokens.map((token, i) => (
                <span key={i} className={`token token--${token.type}`}>
                    {token.value}
                </span>
            ))}
        </div>
    );
}

function safeEntry(value: string): Entry | null {
    try {
        return tokensToEntry(tokenize(value));
    } catch {
        return null;
    }
}

function Box() {
    const [value, setValue] = useState("");
    const entry = safeEntry(value);
    const headword = entry?.headword.join(" ") ?? "";
    const canSubmit = headword.length > 0;

    return (
        <div className="box">
            <div className="box__row">
                <div className="box__face">
                    {headword ? <FaceIcon headword={headword} /> : <div className="box__face-placeholder" />}
                </div>
                <input
                    className="box__input"
                    type="text"
                    value={value}
                    onChange={e => setValue(e.target.value)}
                    placeholder="run 経営"
                    autoFocus
                />
                <button
                    className="box__submit"
                    type="button"
                    disabled={!canSubmit}
                    aria-label="送信"
                    onClick={() => {
                        const input = value;
                        setValue("");
                        api.entries.post({ input }).then(({ error }) => {
                            if (error) console.error("Failed to submit entry", error);
                        });
                    }}
                >
                    <Send size={20} />
                </button>
            </div>
            <TokenPreview value={value} />
        </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(
    <>
        <Box />
        <BottomNav />
    </>
);
