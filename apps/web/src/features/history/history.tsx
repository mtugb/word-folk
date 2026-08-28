import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Entry } from "core";
import { FaceIcon } from "../../components/FaceIcon";
import { BottomNav } from "../../components/BottomNav";
import { api } from "../../lib/api";
import "./history.css";

interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString("ja-JP");
}

function History() {
    const [entries, setEntries] = useState<StoredEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.entries.get().then(({ data, error }) => {
            if (error) {
                setError("読み込みに失敗しました");
                return;
            }
            setEntries(data);
        });
    }, []);

    if (error) {
        return <div className="history history--message">{error}</div>;
    }

    if (entries === null) {
        return <div className="history history--message">読み込み中...</div>;
    }

    if (entries.length === 0) {
        return <div className="history history--message">まだ何も投げ入れられていません</div>;
    }

    return (
        <ul className="history">
            {entries.slice().reverse().map(entry => {
                const headword = entry.headword.join(" ");
                return (
                    <li key={entry.id}>
                        <a className="history__row" href={`/entry/${entry.id}`}>
                            <FaceIcon headword={headword} size={40} />
                            <span className="history__headword">{headword}</span>
                            {entry.hint && <span className="history__hint">{entry.hint}</span>}
                            <span className="history__time">{formatTimestamp(entry.createdAt)}</span>
                        </a>
                    </li>
                );
            })}
        </ul>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(
    <>
        <History />
        <BottomNav />
    </>
);
