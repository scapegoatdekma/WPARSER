"use client";

import { useState } from "react";
import type { WikiParseResult } from "@/lib/wikipedia/types";
import type { WikiNetworkResult } from "@/lib/wikipedia/network-types";
import { EXAMPLE_URLS } from "./constants";
import { ResultView } from "./ResultView";
import type { Tab } from "./types";

function WikipediaParserClient() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<WikiParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("preview");
  const [network, setNetwork] = useState<WikiNetworkResult | null>(null);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const handleParse = async (targetUrl = url) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setNetwork(null);
    setNetworkError(null);
    setNetworkLoading(false);

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

  const loadNetwork = async (sourceUrl: string) => {
    if (networkLoading) return;

    setNetworkLoading(true);
    setNetworkError(null);
    try {
      const res = await fetch(
        `/api/parse-wikipedia/network?url=${encodeURIComponent(sourceUrl)}&limit=16`,
      );
      const data = (await res.json()) as WikiNetworkResult & { error?: string };

      if (!res.ok) {
        setNetworkError(data.error ?? `HTTP ${res.status}`);
        return;
      }

      setNetwork(data);
    } catch (err) {
      setNetworkError(err instanceof Error ? err.message : "Ошибка сети");
    } finally {
      setNetworkLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);

    if (tab === "network" && result && !network) {
      void loadNetwork(result.sourceUrl);
    }
  };

  const handleRetryNetwork = () => {
    if (!result) return;
    void loadNetwork(result.sourceUrl);
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
        <ResultView
          result={result}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          network={network}
          networkLoading={networkLoading}
          networkError={networkError}
          onRetryNetwork={handleRetryNetwork}
        />
      ) : null}
    </div>
  );
}

export { WikipediaParserClient };
