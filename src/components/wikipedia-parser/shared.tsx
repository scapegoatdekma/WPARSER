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
          <span key={tag} className="tag">
            {tag}
          </span>
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

export { Field, SourceLink, TagsField };
