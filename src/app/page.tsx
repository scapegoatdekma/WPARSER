"use client";

import { useState } from "react";
import type { WikiParseResult } from "@/lib/wikipedia/types";

const EXAMPLE_URLS = [
  { label: "Пушкин (ru)", url: "https://ru.wikipedia.org/wiki/Пушкин,_Александр_Сергеевич" },
  { label: "Эйнштейн (en)", url: "https://en.wikipedia.org/wiki/Albert_Einstein" },
  { label: "Москва (ru)", url: "https://ru.wikipedia.org/wiki/Москва" },
  { label: "Токио (en)", url: "https://en.wikipedia.org/wiki/Tokyo" },
  { label: "Чехов (ru)", url: "https://ru.wikipedia.org/wiki/Чехов,_Антон_Павлович" },
  { label: "Мария Кюри (en)", url: "https://en.wikipedia.org/wiki/Marie_Curie" },
];

type Tab = "preview" | "json";

const FAMILY_LABELS: Record<string, string> = {
  spouse: "Супруг(а)",
  children: "Дети",
  parents: "Родители",
  siblings: "Братья и сёстры",
};

export default function Home() {
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
      const res = await fetch(
        `/api/parse-wikipedia?url=${encodeURIComponent(targetUrl.trim())}`,
      );
      const data = await res.json() as WikiParseResult & { error?: string };

      if (!res.ok) {
        setError((data as { error?: string }).error ?? `HTTP ${res.status}`);
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
        {EXAMPLE_URLS.map((ex) => (
          <button
            key={ex.url}
            className="chip"
            onClick={() => handleExample(ex.url)}
            disabled={loading}
          >
            {ex.label}
          </button>
        ))}
      </div>

      {error ? <div className="error-box">Ошибка: {error}</div> : null}

      {result ? <ResultView result={result} activeTab={activeTab} onTabChange={setActiveTab} /> : null}
    </div>
  );
}

function ResultView({
  result,
  activeTab,
  onTabChange,
}: {
  result: WikiParseResult;
  activeTab: Tab;
  onTabChange: (t: Tab) => void;
}) {
  const isPerson = result.type === "person";

  return (
    <div className="result-grid">
      <div className="card">
        <div className="card-header">
          <h2>Извлечённые данные</h2>
          <span className={`badge ${isPerson ? "badge-person" : "badge-article"}`}>
            {isPerson ? "Персона" : "Статья"}
          </span>
        </div>
        <div className="card-body">
          {result.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="thumbnail" src={result.thumbnail} alt="Миниатюра статьи" />
          ) : null}

          {isPerson ? (
            <PersonMeta result={result as import("@/lib/wikipedia/types").WikiPersonResult} />
          ) : (
            <ArticleMeta result={result as import("@/lib/wikipedia/types").WikiArticleResult} />
          )}
        </div>
      </div>

      <div className="card">
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
            onClick={() => onTabChange("preview")}
          >
            Предпросмотр
          </button>
          <button
            className={`tab-btn ${activeTab === "json" ? "active" : ""}`}
            onClick={() => onTabChange("json")}
          >
            JSON
          </button>
        </div>

        {activeTab === "preview" ? (
          <div className="preview-content">
            {isPerson ? (
              <PersonPreview result={result as import("@/lib/wikipedia/types").WikiPersonResult} />
            ) : (
              <ArticlePreview result={result as import("@/lib/wikipedia/types").WikiArticleResult} />
            )}
          </div>
        ) : (
          <div className="json-view">
            {JSON.stringify(result, null, 2)}
          </div>
        )}
      </div>
    </div>
  );
}

function ArticleMeta({ result }: { result: import("@/lib/wikipedia/types").WikiArticleResult }) {
  return (
    <>
      <Field label="Заголовок" value={result.title} />
      <Field label="Язык" value={result.lang.toUpperCase()} />
      {result.coordinates ? (
        <Field
          label="Координаты"
          value={`${result.coordinates.lat.toFixed(5)}, ${result.coordinates.lng.toFixed(5)}`}
          mono
        />
      ) : null}
      <Field label="Связанные персоны" value={result.relatedPersons.join(", ") || "—"} />
      <TagsField tags={result.tags} />
      <SourceLink url={result.sourceUrl} />
    </>
  );
}

function ArticlePreview({ result }: { result: import("@/lib/wikipedia/types").WikiArticleResult }) {
  return (
    <>
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>{result.title}</h2>
      {result.lead ? <p className="lead-text">{result.lead}</p> : null}
      {/* HTML уже очищен на сервере, поэтому отображаем его напрямую. */}
      <div dangerouslySetInnerHTML={{ __html: result.body }} />
    </>
  );
}

function PersonMeta({ result }: { result: import("@/lib/wikipedia/types").WikiPersonResult }) {
  const familyEntries = Object.entries(result.family);

  return (
    <>
      <Field label="Имя" value={result.name} />
      <Field label="Годы жизни" value={result.years || "—"} />
      <Field label="Деятельность" value={result.role || "—"} />
      <Field label="Место рождения" value={result.birthPlace || "—"} />
      {result.coordinates ? (
        <Field
          label="Координаты"
          value={`${result.coordinates.lat.toFixed(5)}, ${result.coordinates.lng.toFixed(5)}`}
          mono
        />
      ) : null}
      {familyEntries.length > 0 ? (
        <div className="field">
          <div className="field-label">Семья</div>
          {familyEntries.map(([k, v]) => (
            <div key={k} className="field-value" style={{ marginBottom: 2 }}>
              <strong>{FAMILY_LABELS[k] ?? k}:</strong> {v}
            </div>
          ))}
        </div>
      ) : null}
      <TagsField tags={result.tags} />
      <SourceLink url={result.sourceUrl} />
    </>
  );
}

function PersonPreview({ result }: { result: import("@/lib/wikipedia/types").WikiPersonResult }) {
  return (
    <>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>{result.name}</h2>
      {result.years ? (
        <p style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>{result.years}</p>
      ) : null}
      {result.role ? (
        <p style={{ color: "#555", fontSize: 13, marginBottom: 14, fontStyle: "italic" }}>
          {result.role}
        </p>
      ) : null}
      {/* HTML уже очищен на сервере, поэтому отображаем его напрямую. */}
      <div dangerouslySetInnerHTML={{ __html: result.bio }} />
    </>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className={`field-value ${mono ? "mono" : ""}`}>{value}</div>
    </div>
  );
}

function TagsField({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <div className="field">
      <div className="field-label">Теги ({tags.length})</div>
      <div className="tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>
    </div>
  );
}

function SourceLink({ url }: { url: string }) {
  return (
    <div className="field">
      <div className="field-label">Источник</div>
      <a className="source-link" href={url} target="_blank" rel="noopener noreferrer">
        ↗ Открыть в Википедии
      </a>
    </div>
  );
}
