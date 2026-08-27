import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Entry } from "core";
import { FaceIcon } from "../../components/FaceIcon";
import { api } from "../../lib/api";
import "./word-detail.css";

interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

function headwordFromPath(): string {
    const match = window.location.pathname.match(/^\/word\/(.+)$/);
    return match ? decodeURIComponent(match[1]!) : "";
}

function WordDetail() {
    const [headword] = useState(headwordFromPath);
    const [entries, setEntries] = useState<StoredEntry[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.entries.get().then(({ data, error }) => {
            if (error) {
                setError("読み込みに失敗しました");
                return;
            }
            setEntries(data.filter(entry => entry.headword.join(" ") === headword));
        });
    }, [headword]);

    if (error) {
        return <div className="word-detail word-detail--message">{error}</div>;
    }

    if (entries === null) {
        return <div className="word-detail word-detail--message">読み込み中...</div>;
    }

    return (
        <div className="word-detail">
            <header className="word-detail__header">
                <FaceIcon headword={headword} size={64} />
                <h1 className="word-detail__headword">{headword}</h1>
            </header>
            {entries.length === 0 ? (
                <div className="word-detail__message">まだこの見出し語のヒントはありません</div>
            ) : (
                <ul className="word-detail__hints">
                    {entries.map(entry => (
                        <li key={entry.id} className="word-detail__hint">
                            {entry.hint || <span className="word-detail__hint--empty">(ヒントなし)</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(<WordDetail />);
