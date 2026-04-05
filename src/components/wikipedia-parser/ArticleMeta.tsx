import type { WikiArticleResult } from "@/lib/wikipedia/types";
import { Field, SourceLink, TagsField } from "./shared";

function ArticleMeta({ result }: { result: WikiArticleResult }) {
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

export { ArticleMeta };
