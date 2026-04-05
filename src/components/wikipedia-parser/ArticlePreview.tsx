import type { WikiArticleResult } from "@/lib/wikipedia/types";

function ArticlePreview({ result }: { result: WikiArticleResult }) {
  return (
    <>
      <h2 style={{ fontSize: 22, marginBottom: 12 }}>{result.title}</h2>
      {result.lead ? <p className="lead-text">{result.lead}</p> : null}
      {/* HTML уже очищен на сервере, поэтому отображаем его напрямую. */}
      <div dangerouslySetInnerHTML={{ __html: result.body }} />
    </>
  );
}

export { ArticlePreview };
