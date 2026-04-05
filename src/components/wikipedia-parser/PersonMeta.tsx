import type { WikiPersonResult } from "@/lib/wikipedia/types";
import { FAMILY_LABELS } from "./constants";
import { Field, SourceLink, TagsField } from "./shared";

function PersonMeta({ result }: { result: WikiPersonResult }) {
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
          {familyEntries.map(([key, value]) => (
            <div key={key} className="field-value" style={{ marginBottom: 2 }}>
              <strong>{FAMILY_LABELS[key] ?? key}:</strong> {value}
            </div>
          ))}
        </div>
      ) : null}
      <TagsField tags={result.tags} />
      <SourceLink url={result.sourceUrl} />
    </>
  );
}

export { PersonMeta };
