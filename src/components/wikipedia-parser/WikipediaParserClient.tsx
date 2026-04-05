"use client";

import { useState } from "react";
import type { WikiParseResult } from "@/lib/wikipedia/types";
import { EXAMPLE_URLS } from "./constants";
import { ResultView } from "./ResultView";
import type { Tab } from "./types";

function WikipediaParserClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<WikiParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("preview");

  const handleParse = async (targetUrl = url) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/parse-wikipedia?url=${encodeURIComponent(targetUrl.trim())}`);
      const data = (await res.json()) as WikiParseResult & { error?: string };

      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setResult(data);
      setActiveTab("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сети");
    } finally {
      setLoading(false);
    }
  };

  const handleExample = (exampleUrl: string) => {
    setUrl(exampleUrl);
    void handleParse(exampleUrl);
  };

  return (
    <div className="page">
      <div className="header">
        <h1>Парсер статей Википедии</h1>
        <p>Вставьте ссылку на статью Wikipedia (ru / en) — система извлечёт структурированные данные.</p>
      </div>

      <div className="input-bar">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void handleParse()}
          placeholder="https://ru.wikipedia.org/wiki/..."
          autoFocus
        />
        <button
          className="btn btn-primary"
          onClick={() => void handleParse()}
          disabled={loading || !url.trim()}
        >
          {loading ? "Загрузка…" : "Парсить"}
        </button>
      </div>

      <div className="examples">
        <span>Примеры:</span>
        {EXAMPLE_URLS.map((example) => (
          <button
            key={example.url}
            className="chip"
            onClick={() => handleExample(example.url)}
            disabled={loading}
          >
            {example.label}
          </button>
        ))}
      </div>

      {error ? <div className="error-box">Ошибка: {error}</div> : null}

      {result ? (
        <ResultView result={result} activeTab={activeTab} onTabChange={setActiveTab} />
      ) : null}
    </div>
  );
}

export { WikipediaParserClient };
