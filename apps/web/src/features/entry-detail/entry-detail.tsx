import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Entry } from "core";
import { FaceIcon } from "../../components/FaceIcon";
import { api } from "../../lib/api";
import "./entry-detail.css";

interface StoredEntry extends Entry {
    id: string;
    createdAt: string;
}

interface ConnectionsResult {
    meaning: string;
    hasConnections: boolean;
    connections: { word: string; relation: string }[];
}

function idFromPath(): string {
    const match = window.location.pathname.match(/^\/entry\/(.+)$/);
    return match ? decodeURIComponent(match[1]!) : "";
}

function Connections({ id }: { id: string }) {
    const [result, setResult] = useState<ConnectionsResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.entries({ id }).connections.get().then(({ data, error }) => {
            if (error) {
                setError("関連語の取得に失敗しました");
                return;
            }
            setResult(data);
        });
    }, [id]);

    return (
        <section className="entry-detail__connections">
            <h2 className="entry-detail__connections-title">関連語</h2>
            {error ? (
                <div className="entry-detail__message">{error}</div>
            ) : result === null ? (
                <div className="entry-detail__message">生成中...</div>
            ) : (
                <>
                    {result.meaning && (
                        <p className="entry-detail__connections-meaning">「{result.meaning}」という意味について</p>
                    )}
                    {!result.hasConnections || result.connections.length === 0 ? (
                        <div className="entry-detail__message">関連語は見つかりませんでした</div>
                    ) : (
                        <ul className="entry-detail__connections-list">
                            {result.connections.map((connection, i) => (
                                <li key={i} className="entry-detail__connection">
                                    <span className="entry-detail__connection-word">{connection.word}</span>
                                    <span className="entry-detail__connection-relation">{connection.relation}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    );
}

function EntryDetail() {
    const [id] = useState(idFromPath);
    const [entry, setEntry] = useState<StoredEntry | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.entries({ id }).get().then(({ data, error }) => {
            if (error) {
                if (error.status === 404) {
                    setEntry(null);
                    return;
                }
                setError("読み込みに失敗しました");
                return;
            }
            setEntry(data);
        });
    }, [id]);

    if (error) {
        return <div className="entry-detail entry-detail--message">{error}</div>;
    }

    if (entry === undefined) {
        return <div className="entry-detail entry-detail--message">読み込み中...</div>;
    }

    if (entry === null) {
        return <div className="entry-detail entry-detail--message">見つかりませんでした</div>;
    }

    const headword = entry.headword.join(" ");

    return (
        <div className="entry-detail">
            <header className="entry-detail__header">
                <FaceIcon headword={headword} size={64} />
                <h1 className="entry-detail__headword">{headword}</h1>
            </header>
            <div className="entry-detail__hint">
                {entry.hint || <span className="entry-detail__hint--empty">(ヒントなし)</span>}
            </div>
            <Connections id={id} />
        </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(<EntryDetail />);
