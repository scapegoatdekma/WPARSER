import type { WikiPersonResult } from "@/lib/wikipedia/types";

function PersonPreview({ result }: { result: WikiPersonResult }) {
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

export { PersonPreview };
