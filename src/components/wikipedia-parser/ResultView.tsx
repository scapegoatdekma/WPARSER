import type { WikiParseResult } from "@/lib/wikipedia/types";
import { ArticleMeta } from "./ArticleMeta";
import { ArticlePreview } from "./ArticlePreview";
import { PersonMeta } from "./PersonMeta";
import { PersonPreview } from "./PersonPreview";
import type { Tab } from "./types";

function ResultView({
  result,
  activeTab,
  onTabChange,
}: {
  result: WikiParseResult;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
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

          {isPerson ? <PersonMeta result={result} /> : <ArticleMeta result={result} />}
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
            {isPerson ? <PersonPreview result={result} /> : <ArticlePreview result={result} />}
          </div>
        ) : (
          <div className="json-view">{JSON.stringify(result, null, 2)}</div>
        )}
      </div>
    </div>
  );
}

export { ResultView };
