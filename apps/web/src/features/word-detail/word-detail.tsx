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

interface ConnectionsResult {
    hasConnections: boolean;
    connections: { word: string; relation: string }[];
}

function headwordFromPath(): string {
    const match = window.location.pathname.match(/^\/word\/(.+)$/);
    return match ? decodeURIComponent(match[1]!) : "";
}

function Connections({ headword }: { headword: string }) {
    const [result, setResult] = useState<ConnectionsResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.words({ headword }).connections.get().then(({ data, error }) => {
            if (error) {
                setError("関連語の取得に失敗しました");
                return;
            }
            setResult(data);
        });
    }, [headword]);

    return (
        <section className="word-detail__connections">
            <h2 className="word-detail__connections-title">関連語</h2>
            {error ? (
                <div className="word-detail__message">{error}</div>
            ) : result === null ? (
                <div className="word-detail__message">生成中...</div>
            ) : !result.hasConnections || result.connections.length === 0 ? (
                <div className="word-detail__message">関連語は見つかりませんでした</div>
            ) : (
                <ul className="word-detail__connections-list">
                    {result.connections.map((connection, i) => (
                        <li key={i} className="word-detail__connection">
                            <span className="word-detail__connection-word">{connection.word}</span>
                            <span className="word-detail__connection-relation">{connection.relation}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
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
            <Connections headword={headword} />
        </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(<WordDetail />);
